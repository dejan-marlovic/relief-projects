import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChange, useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { projectApprovalLabel } from "../../utils/projectApproval";
import { WorkflowIntro, WorkflowStep, HistoryIntro } from "../../components/Workflow/Workflow";
import { Attribution, HistorySnapshot, Issues, Pagination, ReadState } from "../Results/ResultViews";
import { label, readManagement, useManagementRead } from "../Management/managementApi";
import TravelActionIcon, { approvalStyle } from "../Travel/TravelActionIcon";
import { commands, draftFrom, fields } from "./assessmentApi";
import AssessmentEditor from "./AssessmentEditor";
import styles from "../Travel/Travel.module.scss";

function Decision({ title, value }) {
  if (!value) return null;
  return <section className={styles.panel}><h4>{title} #{value.historyId}</h4><Attribution at={value.recordedAt} actor={value.actor} /><p>Employee: {value.actor?.employeeName || "Unknown"}{value.actor?.employeeId && ` (#${value.actor.employeeId})`}</p>{value.note && <p className={styles.text}>{value.note}</p>}{value.evidenceGapExplanation && <p className={styles.text}>Missing evidence explanation: {value.evidenceGapExplanation}</p>}<details><summary>Frozen decision basis</summary><HistorySnapshot value={value.basis} /></details></section>;
}
export function AssessmentPanel({ projectId, authFetch }) {
  const base = `${BASE_URL}/api/projects/${projectId}/assessment`;
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
  useUnsavedChange(`assessment-${projectId}`, !!form);
  const detail = useManagementRead(authFetch, base, refresh);
  const data = detail.data, record = data?.assessment;
  const evidence = useManagementRead(authFetch, record ? `${base}/evidence?includeRemoved=${removed}&page=${evidencePage}&size=20` : null, refresh);
  const history = useManagementRead(authFetch, record ? `${base}/history?page=${historyPage}&size=20` : null, refresh);
  // Refresh the project DTO too; Project/Admin pages load their summaries on entry.
  const project = useManagementRead(authFetch, `${BASE_URL}/api/projects/${projectId}`, refresh);
  const canAct = form && (form.action === "evidence-remove" ? evidence.data?.content.some(link => link.id === form.link.id && link.permissions?.canRemove) : data?.permissions?.[commands[form.action][1]]);
  const blocked = !data || detail.loading || !canAct || (form?.action === "evidence-remove" && evidence.loading);
  const reviewBlocked = blocked || project.loading || !project.data || (record && (history.loading || evidence.loading || history.data?.assessmentRevision !== record.revision || evidence.data?.assessmentRevision !== record.revision));
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
  const editorStep = form ? ["create", "edit"].includes(form.action) ? 1 : ["evidence", "evidence-remove"].includes(form.action) ? 2 : ["submit", "approve", "return", "withdraw-submission"].includes(form.action) ? 3 : 4 : 0;
  const editor = form && <AssessmentEditor key={form.action} form={form} setForm={setForm} projectId={projectId} authFetch={authFetch} refresh={refresh} busy={busy} blocked={blocked} reviewBlocked={reviewBlocked} onSave={save} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, record, expectedRevision: record?.revision, reviewRequired: false, error: "" }))} />;
  return <>
    <button disabled={busy} onClick={reload}>Refresh assessment, evidence and history</button><ReadState state={detail} />
    {data && <section className={styles.summary} aria-label="Project assessment status"><h3>{projectApprovalLabel({ approved: data.approval?.value, assessmentSummary: { source: data.approval?.source, currentApprovalId: data.approval?.currentDecisionId, state: record?.state, assessmentDeleted: record?.deleted, reviewRequired: record?.reviewRequired } })}</h3>{record && <span className={`${styles.statusBadge} ${styles[`status${record.state}`] || ""}`}>{record.state}{record.deleted && " · Deleted"}</span>}{!data.projectActive && <p>The project is inactive. Retained assessment information is read-only.</p>}<Issues issues={data.issues} /><Issues issues={record?.reviewIssues} />{record?.reviewRequired && <p>Review required. The retained approval has not been revoked automatically; withdraw, revise and resubmit to record a new decision.</p>}</section>}
    <WorkflowIntro>Explain the project proposal, select its assessment evidence and submit it for an independent decision. Recorded approval is informational: it does not grant funding, verify committee signatures or change operational status.</WorkflowIntro>
    <WorkflowStep number={1} title="Prepare the assessment" description="Describe the need, feasibility and risks. Drafts may be incomplete; all three narratives and a recommendation are needed before submission." keepOpen={editorStep === 1}>
      {!record && data && <p>No assessment has been recorded. Legacy approval values are retained separately and have no inferred decision date or actor.</p>}
      {record && <><dl className={styles.snapshot}>{Object.entries(fields).map(([key, title]) => <React.Fragment key={key}><dt>{title}</dt><dd>{record[key] || "Not set"}</dd></React.Fragment>)}<dt>Recommendation</dt><dd>{record.recommendation ? label(record.recommendation) : "Not set"}</dd></dl><p>Created <Attribution at={record.createdAt} actor={record.createdBy} /></p></>}{buttons(["create", "edit"])}{editorStep === 1 && editor}
    </WorkflowStep>
    <WorkflowStep number={2} title="Select supporting evidence" description="Link exact document versions for the assessment and committee minutes. Evidence does not verify contents or signatures, and checklist links are not copied automatically." keepOpen={editorStep === 2}>
      {record?.evidenceSummary && <p>Across all active links: {record.evidenceSummary.activeLinks} linked · {record.evidenceSummary.includedInApproval} in approval · {record.evidenceSummary.lateLinks} late · {record.evidenceSummary.unavailableLinks} unavailable.</p>}
      {record && <><label><input type="checkbox" disabled={!!form || busy} checked={removed} onChange={e => { setRemoved(e.target.checked); setEvidencePage(0); }} />Include removed evidence</label><ReadState state={evidence} />{evidence.data?.content.map(row => <article className={styles.panel} key={row.id}><h4>{row.capturedName || `Document #${row.documentId}`} · Version {row.versionNumber ?? "unknown"}</h4><p>{label(row.purpose)} · {row.associationActive ? "Active link" : "Removed link"} · {label(row.availability)}</p>{record.currentApproval && <p>{row.includedInCurrentApproval ? "Included in current approval" : row.associationActive ? "Added after approval — outside the decision basis" : "Outside current approval"}</p>}<p>Current name: {row.currentName || "Unavailable"} · Status: {row.currentStatus || "Unknown"}</p><p>Linked <Attribution at={row.linkedAt} actor={row.linkedBy} /></p>{row.removedAt && <p>Removed <Attribution at={row.removedAt} actor={row.removedBy} /> · {row.removalReason}</p>}<div className={styles.actions}><button disabled={!row.downloadEligible} onClick={async () => { setDownloadError(""); try { await downloadDocument(row.documentId, authFetch); } catch (error) { setDownloadError(error.message); } }}>Download document #{row.documentId}</button>{row.permissions?.canRemove && <button disabled={locked || evidence.loading} onClick={() => open("evidence-remove", row)}>Remove evidence #{row.id}</button>}</div></article>)}{evidence.data && !evidence.data.content.length && <p>No evidence on this page.</p>}<Pagination data={evidence.data} page={evidencePage} setPage={setEvidencePage} label="assessment evidence" disabled={!!form || busy || evidence.loading} /></>}
      {downloadError && <p role="alert">{downloadError}</p>}{buttons(["evidence"])}{editorStep === 2 && editor}
    </WorkflowStep>
    <WorkflowStep number={3} title="Submit and decide independently" description="Submission freezes the assessment and selected evidence. An independent ADMIN or APPROVER with an active Employee identity reviews it. Creators, submitters and contributors cannot approve, including through another account." keepOpen={editorStep === 3}>
      {record?.state === "SUBMITTED" && <p>Return or withdraw the submission before editing. Changed project context requires resubmission before approval.</p>}<Decision title="Current submission" value={record?.currentSubmission} /><Decision title="Current approval" value={record?.currentApproval} />{buttons(["submit", "approve", "return", "withdraw-submission"])}{editorStep === 3 && editor}
    </WorkflowStep>
    <WorkflowStep number={4} title="Review and correct explicitly" description="Withdraw recorded approval before corrections, then resubmit for a new decision. Late evidence remains outside the approval basis. Deletion and restoration retain history and never reinstate withdrawn approval." keepOpen={editorStep === 4}>
      {buttons(["withdraw-approval", "delete", "restore"])}{editorStep === 4 && editor}<div className={styles.actions}>{[["/project", "Project details"], ["/documents", "Document checklist"], ["/risks", "Risks"], ["/results", "Results"], ["/follow-ups", "Follow-ups"]].map(([to, title]) => <Link key={to} to={to} onClick={e => { if (!confirmDiscardUnsavedChanges()) e.preventDefault(); }}>{title}</Link>)}</div>
    </WorkflowStep>
    <section className={styles.panel} aria-label="Assessment history"><h3>Assessment history</h3><HistoryIntro>Newest first. Submissions, decisions, corrections and evidence changes remain attributed to their recorded actors.</HistoryIntro><ReadState state={history} /><ol className={styles.timeline}>{history.data?.content.map(event => <li key={event.id}><h4>{label(event.action)} · Revision {event.revision}</h4><Attribution at={event.occurredAt} actor={event.actor} />{event.reason && <p>Reason: {event.reason}</p>}<details><summary>Before</summary><HistorySnapshot value={event.before} /></details><details><summary>After</summary><HistorySnapshot value={event.after} /></details></li>)}</ol><Pagination data={history.data} page={historyPage} setPage={setHistoryPage} label="assessment history" disabled={history.loading || busy} /></section>
    <ReadState state={project} />
  </>;
}
export default function Assessment() {
  const { selectedProjectId } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  return <section className={styles.page}><h2>Project assessment</h2><p>Record the assessment and initial internal approval for the selected project. This is separate from donor decisions, budget approval and administrative closeout.</p>{selectedProjectId ? <AssessmentPanel key={selectedProjectId} projectId={selectedProjectId} authFetch={authFetch} /> : <p>Select a project to view its assessment.</p>}</section>;
}
