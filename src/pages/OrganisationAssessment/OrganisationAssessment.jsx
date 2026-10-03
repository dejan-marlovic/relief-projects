import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChange, useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { WorkflowIntro, WorkflowStep, HistoryIntro } from "../../components/Workflow/Workflow";
import { Attribution, HistorySnapshot, Issues, Pagination, ReadState } from "../Results/ResultViews";
import { label, readManagement, useManagementRead } from "../Management/managementApi";
import TravelActionIcon, { approvalStyle } from "../Travel/TravelActionIcon";
import { commands, draftFrom, fields, decisionLabel } from "./assessmentApi";
import AssessmentEditor from "./AssessmentEditor";
import styles from "../Travel/Travel.module.scss";

function Decision({ title, value }) {
  if (!value) return null;
  return <section className={styles.panel}><h4>{title} #{value.historyId}</h4><Attribution at={value.recordedAt} actor={value.actor} /><p>Employee: {value.actor?.employeeName || "Unknown"}{value.actor?.employeeId && ` (#${value.actor.employeeId})`}</p>{value.decision && <p><strong>{decisionLabel(value.decision)}</strong></p>}{value.decisionExplanation && <p className={styles.text}>{value.decisionExplanation}</p>}{value.note && <p className={styles.text}>{value.note}</p>}{value.evidenceGapExplanation && <p className={styles.text}>Missing evidence explanation: {value.evidenceGapExplanation}</p>}<details><summary>Frozen decision basis</summary><HistorySnapshot value={value.basis} /></details></section>;
}
export function OrganisationAssessmentPanel({ relationshipId, authFetch }) {
  const base = `${BASE_URL}/api/project-organizations/${relationshipId}/assessment`;
  const [refresh, setRefresh] = useState(0), [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const [evidencePage, setEvidencePage] = useState(0), [historyPage, setHistoryPage] = useState(0), [removed, setRemoved] = useState(false), [downloadError, setDownloadError] = useState("");
  const pending = useRef(false), alive = useRef(true);
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
  const reload = () => setRefresh(n => n + 1);
  useEffect(() => {
    alive.current = true;
    const update = () => { if (document.visibilityState !== "hidden") setRefresh(n => n + 1); };
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { alive.current = false; window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  useUnsavedChange(`organisation-assessment-${relationshipId}`, !!form);
  const detail = useManagementRead(authFetch, base, refresh);
  const data = detail.data, record = data?.assessment;
  const projectId = data?.scope?.projectId;
  const evidence = useManagementRead(authFetch, record ? `${base}/evidence?includeRemoved=${removed}&page=${evidencePage}&size=20` : null, refresh);
  const history = useManagementRead(authFetch, record ? `${base}/history?page=${historyPage}&size=20` : null, refresh);
  const canAct = form && (form.action === "evidence-remove" ? evidence.data?.content.some(link => link.id === form.link.id && link.permissions?.canRemove) : data?.permissions?.[commands[form.action][1]]);
  const blocked = !data || detail.loading || !canAct || (form?.action === "evidence-remove" && evidence.loading);
  const reviewBlocked = blocked || (record && (history.loading || evidence.loading || history.data?.assessmentRevision !== record.revision || evidence.data?.assessmentRevision !== record.revision));
  const locked = busy || !!form || detail.loading;
  function open(action, link) { setForm({ action, link, record, expectedRevision: record?.revision, draft: draftFrom(action === "edit" ? record : null) }); }
  async function save(body) {
    if (pending.current || blocked || form.reviewRequired) return;
    pending.current = true; setBusy(true);
    const action = form.action;
    const path = ["create", "edit"].includes(action) ? "" : action === "evidence-remove" ? `/evidence/${form.link.id}/remove` : `/${action}`;
    try {
      await authFetch(`${base}${path}`, { method: action === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(action === "create" ? { expectedAbsent: true } : { expectedRevision: form.expectedRevision }) }) }).then(readManagement);
      if (alive.current) { setForm(null); setHistoryPage(0); }
    } catch (error) { if (alive.current) { setForm(f => ({ ...f, error: error.message, reviewRequired: true })); setHistoryPage(0); } }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  const buttons = actions => <div className={styles.actions}>{actions.map(action => data?.permissions?.[commands[action][1]] && <button key={action} disabled={locked} className={approvalStyle(action, styles)} onClick={() => open(action)}><TravelActionIcon action={action} />{commands[action][0]}</button>)}</div>;
  const editorStep = form ? ["create", "edit"].includes(form.action) ? 1 : ["evidence", "evidence-remove"].includes(form.action) ? 2 : ["submit", "review", "return", "withdraw-submission"].includes(form.action) ? 3 : 4 : 0;
  const editor = form && <AssessmentEditor key={form.action} form={form} setForm={setForm} projectId={projectId} authFetch={authFetch} refresh={refresh} busy={busy} blocked={blocked} reviewBlocked={reviewBlocked} onSave={save} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, record, expectedRevision: record?.revision, reviewRequired: false, error: "" }))} />;
  return <>
    <button disabled={busy} onClick={reload}>Refresh assessment, evidence and history</button><ReadState state={detail} />
    {data && <section className={styles.summary} aria-label="Organisation assessment scope"><h3>{data.scope.organizationName} · {data.scope.organizationStatusLabel}</h3><p>Project: {data.scope.projectName} (#{data.scope.projectId}) · Relationship #{relationshipId}</p><p>{decisionLabel(record?.currentDecision?.decision)}</p>{record && <span className={`${styles.statusBadge} ${styles[`status${record.state}`] || ""}`}>{record.state}{record.deleted && " · Deleted"}</span>}{!data.scopeAvailable && <p>This relationship or one of its owners is unavailable. Retained assessment information is read-only.</p>}<Issues issues={data.issues} /><Issues issues={record?.reviewIssues} />{record?.reviewRequired && <p>Review required. The retained outcome remains recorded; withdraw, revise and resubmit to reaffirm the decision.</p>}{record && <p>This relationship’s project, organisation and role are fixed by assessment history, including after deletion. Create another relationship for a different scope.</p>}</section>}
    <WorkflowIntro>Assess an organisation for its specific role in this project, select evidence and request independent review. Outcomes are informational; they do not certify due diligence, change the assigned role or grant funding.</WorkflowIntro>
    <WorkflowStep number={1} title="Prepare the assessment" description="Describe capacity, suitability for this role and material concerns. Drafts may be incomplete; all three narratives are needed before submission." keepOpen={editorStep === 1}>
      {!record && data && <p>No assessment has been recorded for this relationship. Reviews from other projects or roles do not apply here.</p>}
      {record && <><dl className={styles.snapshot}>{Object.entries(fields).map(([key, title]) => <React.Fragment key={key}><dt>{title}</dt><dd>{record[key] || "Not set"}</dd></React.Fragment>)}</dl><p>Created <Attribution at={record.createdAt} actor={record.createdBy} /></p></>}{buttons(["create", "edit"])}{editorStep === 1 && editor}
    </WorkflowStep>
    <WorkflowStep number={2} title="Select supporting evidence" description="Link exact document versions from this project. Evidence is optional; an empty selection requires an explanation at review. Unavailable selected evidence blocks submission and review. Links are not inherited from the checklist." keepOpen={editorStep === 2}>
      {record?.evidenceSummary && <p>Across all active links: {record.evidenceSummary.activeLinks} linked · {record.evidenceSummary.includedInDecision} in decision · {record.evidenceSummary.lateLinks} late · {record.evidenceSummary.unavailableLinks} unavailable.</p>}
      {record && <><label><input type="checkbox" disabled={!!form || busy} checked={removed} onChange={e => { setRemoved(e.target.checked); setEvidencePage(0); }} />Include removed evidence</label><ReadState state={evidence} />{evidence.data?.content.map(row => <article className={styles.panel} key={row.id}><h4>{row.capturedName || `Document #${row.documentId}`} · Version {row.versionNumber ?? "unknown"}</h4><p>{label(row.purpose)} · {row.associationActive ? "Active link" : "Removed link"} · {label(row.availability)}</p>{record.currentDecision && <p>{row.includedInCurrentDecision ? "Included in current review" : row.associationActive ? "Added after review — outside the decision basis" : "Outside current review"}</p>}<p>Current name: {row.currentName || "Unavailable"} · Status: {row.currentStatus || "Unknown"}</p><p>Linked <Attribution at={row.linkedAt} actor={row.linkedBy} /></p>{row.removedAt && <p>Removed <Attribution at={row.removedAt} actor={row.removedBy} /> · {row.removalReason}</p>}<div className={styles.actions}><button disabled={!row.downloadEligible} onClick={async () => { setDownloadError(""); try { await downloadDocument(row.documentId, authFetch); } catch (error) { setDownloadError(error.message); } }}>Download document #{row.documentId}</button>{row.permissions?.canRemove && <button disabled={locked || evidence.loading} onClick={() => open("evidence-remove", row)}>Remove evidence #{row.id}</button>}</div></article>)}{evidence.data && !evidence.data.content.length && <p>No evidence on this page.</p>}<Pagination data={evidence.data} page={evidencePage} setPage={setEvidencePage} label="assessment evidence" disabled={!!form || busy || evidence.loading} /></>}
      {downloadError && <p role="alert">{downloadError}</p>}{buttons(["evidence"])}{editorStep === 2 && editor}
    </WorkflowStep>
    <WorkflowStep number={3} title="Submit and decide independently" description="Submission freezes the assessment and selected evidence. An independent ADMIN or APPROVER with an active Employee identity reviews it. Creators, submitters and contributors cannot review, including through another account." keepOpen={editorStep === 3}>
      {record?.state === "SUBMITTED" && <p>Return or withdraw the submission before editing. Changed relationship context requires resubmission before review.</p>}<Decision title="Current submission" value={record?.currentSubmission} /><Decision title="Current review" value={record?.currentDecision} />{buttons(["submit", "review", "return", "withdraw-submission"])}{editorStep === 3 && editor}
    </WorkflowStep>
    <WorkflowStep number={4} title="Review and correct explicitly" description="Withdraw the recorded review before corrections, then resubmit for a new independent decision. Late evidence stays outside the reviewed basis. Deletion and restoration retain history and never reinstate a withdrawn review." keepOpen={editorStep === 4}>
      {buttons(["withdraw-review", "delete", "restore"])}{editorStep === 4 && editor}<div className={styles.actions}>{[["/project", "Project details"], ["/documents", "Document checklist"], ["/risks", "Risks"], ["/results", "Results"], ["/follow-ups", "Follow-ups"]].map(([to, title]) => <Link key={to} to={to} onClick={e => { if (!confirmDiscardUnsavedChanges()) e.preventDefault(); }}>{title}</Link>)}</div>
    </WorkflowStep>
    <section className={styles.panel} aria-label="Assessment history"><h3>Assessment history</h3><HistoryIntro>Newest first. Submissions, decisions, corrections and evidence changes remain attributed to their recorded actors.</HistoryIntro><ReadState state={history} /><ol className={styles.timeline}>{history.data?.content.map(event => <li key={event.id}><h4>{label(event.action)} · Revision {event.revision}</h4><Attribution at={event.occurredAt} actor={event.actor} />{event.reason && <p>Reason: {event.reason}</p>}<details><summary>Before</summary><HistorySnapshot value={event.before} /></details><details><summary>After</summary><HistorySnapshot value={event.after} /></details></li>)}</ol><Pagination data={history.data} page={historyPage} setPage={setHistoryPage} label="assessment history" disabled={history.loading || busy} /></section>
  </>;
}
export default function OrganisationAssessment() {
  const { relationshipId } = useParams();
  const { selectedProjectId, setSelectedProjectId, projects = [] } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const scope = useManagementRead(authFetch, `${BASE_URL}/api/project-organizations/${relationshipId}/assessment`, 0);
  const projectId = scope.data?.scope?.projectId;
  const sameProject = String(selectedProjectId) === String(projectId);
  const available = projects.some(p => String(p.id) === String(projectId));
  return <section className={styles.page}><h2>Organisation assessment</h2><p>A recorded review of one organisation’s role in one project. This is separate from project assessment and has no organisation-wide approval.</p><ReadState state={scope} />
    {!sameProject && scope.data && <p>This assessment belongs to {scope.data.scope.projectName} (#{projectId}), not the selected project. {available ? <button onClick={() => setSelectedProjectId(String(projectId))}>Select this project to open assessment</button> : "Its project is unavailable in the selector; retained information follows below."}</p>}
    {scope.data && (sameProject || !available) && <OrganisationAssessmentPanel key={relationshipId} relationshipId={relationshipId} authFetch={authFetch} />}
  </section>;
}
