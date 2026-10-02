import { WorkflowIntro, WorkflowStep } from "../../components/Workflow/Workflow";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../utils/http";
import { Attribution, Pagination, ReadState } from "../Results/ResultViews";
import { blankObservation, commandPermission, label, observationDraft, readManagement, useManagementRead } from "./managementApi";
import { Associations, Decisions, DecisionSummary, ManagementHistory } from "./ManagementViews";
import ManagementEditor, { titles } from "./ManagementEditor";
import styles from "./Management.module.scss";

function RecordDetail({ id, base, projectId, authFetch, refresh, reload, onClose }) {
  const endpoint = `${base}/${id}`;
  const detail = useManagementRead(authFetch, endpoint, refresh);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useUnsavedChange(`management-record-${projectId}-${id}`, !!form);
  const reviewHistory = useManagementRead(authFetch, form?.reviewRequired ? `${endpoint}/history?page=0&size=20` : null, refresh);
  const kind = form?.action?.endsWith("-remove") ? form.action.split("-")[0] : null;
  const removalPage = useManagementRead(authFetch, kind ? `${endpoint}/${kind}?includeRemoved=${form.link.includeRemoved}&page=${form.link.page}&size=20` : null, refresh);
  const record = detail.data;
  const permitted = !!record && (kind ? removalPage.data?.content.some(link => link.id === form.link.id && link.permissions?.canRemove) : record.permissions?.[commandPermission[form?.action]]);
  const blocked = !record || detail.loading || removalPage.loading || !permitted || (form?.reviewRequired && (reviewHistory.loading || !reviewHistory.data));
  const locked = busy || !!form || detail.loading;
  function open(action, link) {
    let draft = { reason: "" };
    if (action === "edit") draft = { ...observationDraft(record), reason: "" };
    if (action === "response") draft = { disposition: record.response?.disposition || "ACTIONS_REQUIRED", text: record.response?.text || "", responseDate: record.response?.responseDate || record.today, reason: "" };
    if (action === "reviews") draft = { reviewDate: record.today, note: "" };
    if (action === "resolve") draft = { resolvedDate: record.today, reason: "", outstandingActionExplanation: "" };
    setForm({ action, link, draft, record, expectedRevision: record.revision, manifest: { ...record.expectedFollowUpRevisions } });
  }
  async function save(body) {
    if (pending.current || blocked || form.reviewRequired) return;
    pending.current = true; setBusy(true);
    const action = form.action;
    const path = action === "edit" ? "" : kind ? `/${kind}/${form.link.id}/remove` : `/${action}`;
    try {
      await authFetch(`${endpoint}${path}`, { method: ["edit", "response"].includes(action) ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedRevision: form.expectedRevision }) }).then(readManagement);
      if (alive.current) setForm(null);
    } catch (e) { if (alive.current) setForm(f => ({ ...f, error: e.message, reviewRequired: true })); }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  const buttons = names => <div className={styles.actions}>{names.map(action => record?.permissions?.[commandPermission[action]] && <button key={action} disabled={locked} onClick={() => open(action)}>{titles[action]}</button>)}</div>;
  return <section className={styles.panel} aria-label="Finding or lesson details"><div className={styles.actions}><button disabled={busy} onClick={reload}>Refresh record, links and history</button><button disabled={!!form || busy} onClick={onClose}>Close record</button></div><ReadState state={detail} />
    {record && <><h3>{record.title} · #{record.id}</h3><p>{label(record.type)} · {label(record.state)}{record.isDeleted ? " · Deleted" : ""}</p><WorkflowIntro>Capture an observation, decide how to respond, link any follow-up work and record a reasoned management resolution. Lessons can be retained without a management response.</WorkflowIntro><WorkflowStep number={1} title="Understand the observation" description="Describe the finding or lesson, when it was observed and its source."><p className={styles.text}>{record.observation}</p><p>Observed on {record.observedDate} · {label(record.sourceType)}{record.sourceReference ? ` · ${record.sourceReference}` : ""}</p><p>Created <Attribution at={record.createdAt} actor={record.createdBy} /></p>
      {buttons(["edit"])}</WorkflowStep><WorkflowStep number={2} title="Record the response" description="For a finding, record the management response before resolution. A lesson may be retained without a response."><Decisions record={record} section="response" />{buttons(["response"])}</WorkflowStep>
      <WorkflowStep number={3} title="Link actions and evidence" description="Link existing follow-ups and exact document versions. Review progress here; complete tasks in Follow-ups."><Associations kind="actions" endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked || !record} /><Associations kind="evidence" endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked || !record} /><Decisions record={record} section="review" />{buttons(["actions", "evidence", "reviews"])}</WorkflowStep>
      <WorkflowStep number={4} title="Resolve and reassess" description="Record a reasoned decision, explaining any outstanding actions. Resolution does not complete tasks. Reopen before making changes or reaffirming after linked work changes."><DecisionSummary record={record} /><Decisions record={record} section="resolution" />
      {record.state === "RESOLVED" && <p>Reopen before changing the observation, response, reviews or associations.</p>}
      {buttons(["resolve", "reopen"])}</WorkflowStep>{buttons(["delete", "restore"])}
    </>}
    {form && <ManagementEditor form={form} setForm={setForm} projectId={projectId} authFetch={authFetch} refresh={refresh} today={record?.today || form.record.today} busy={busy} blocked={blocked} onSave={save} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, record, expectedRevision: record.revision, manifest: { ...record.expectedFollowUpRevisions }, reviewRequired: false, error: "", draft: f.action === "actions" ? { ...f.draft, followUp: null } : f.draft }))} />}
    {form && <><ReadState state={reviewHistory} /><ReadState state={removalPage} /></>}
    <ManagementHistory endpoint={endpoint} authFetch={authFetch} refresh={refresh} />
  </section>;
}

export function ManagementRegister({ projectId, authFetch }) {
  const base = `${BASE_URL}/api/projects/${projectId}/management-records`;
  const [filters, setFilters] = useState({ type: "ALL", state: "OPEN", deleted: false }), [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0), [selected, setSelected] = useState(null), [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const pending = useRef(false), alive = useRef(true);
  const reload = () => setRefresh(n => n + 1);
  useEffect(() => {
    alive.current = true;
    const update = () => { if (document.visibilityState !== "hidden") setRefresh(n => n + 1); };
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { alive.current = false; window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const query = new URLSearchParams({ ...filters, page, size: 20 });
  const list = useManagementRead(authFetch, `${base}?${query}`, refresh);
  useUnsavedChange(`new-management-${projectId}`, !!form);
  const change = (key, value) => { setFilters(f => ({ ...f, [key]: value })); setPage(0); };
  async function create(body) {
    if (pending.current || form.reviewRequired || list.loading || !list.data?.canCreate) return;
    pending.current = true; setBusy(true);
    try {
      const record = await authFetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(readManagement);
      if (alive.current) { setForm(null); setSelected(record.id); setFilters({ type: "ALL", state: "OPEN", deleted: false }); setPage(0); }
    } catch (e) { if (alive.current) setForm(f => ({ ...f, error: e.message, reviewRequired: true })); }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  return <><div className={styles.actions}><button disabled={busy} onClick={reload}>Refresh findings and lessons</button>{list.data?.canCreate && <button disabled={!!form || !!selected || busy} onClick={() => setForm({ action: "create", draft: { ...blankObservation(), observedDate: list.data.today } })}>Create finding or lesson</button>}</div>
    <div className={styles.filters}><label>Record type filter<select value={filters.type} onChange={e => change("type", e.target.value)}><option value="ALL">Findings and lessons</option><option value="FINDING">Findings</option><option value="LESSON">Lessons</option></select></label><label>Management state<select value={filters.state} onChange={e => change("state", e.target.value)}><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option><option value="ALL">All states</option></select></label><label><input type="checkbox" checked={filters.deleted} onChange={e => change("deleted", e.target.checked)} />Show deleted records only</label></div>
    <ReadState state={list} />{list.data?.projectDeleted && <p>This project is inactive. Retained records are read-only.</p>}
    <ul className={styles.list}>{list.data?.content.map(record => <li key={record.id}><div className={styles.heading}><h3>{record.title}</h3><button disabled={!!form || busy || (selected != null && selected !== record.id)} onClick={() => setSelected(record.id)}>Open record #{record.id}</button></div><p>{label(record.type)} · Observed {record.observedDate}</p><DecisionSummary record={record} /></li>)}</ul>
    {list.data && !list.data.content.length && <p>No records match these filters.</p>}<Pagination data={list.data} page={page} setPage={setPage} label="records" disabled={list.loading || busy} />
    {form && <ManagementEditor form={form} setForm={setForm} projectId={projectId} authFetch={authFetch} refresh={refresh} today={list.data?.today} busy={busy} blocked={list.loading || !list.data?.canCreate} onSave={create} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, error: "", reviewRequired: false }))} />}
    {selected && <RecordDetail key={selected} id={selected} base={base} projectId={projectId} authFetch={authFetch} refresh={refresh} reload={reload} onClose={() => setSelected(null)} />}
  </>;
}
export default function Management() {
  const { selectedProjectId } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  return <section className={styles.page}><h2>Findings & lessons</h2><p>Record observations, learning and management responses. Link actions from Follow-ups and exact supporting document versions. Resolution is an attributed management decision; it does not complete tasks or verify outcomes.</p>{selectedProjectId ? <ManagementRegister key={selectedProjectId} projectId={selectedProjectId} authFetch={authFetch} /> : <p>Select a project to view its findings and lessons.</p>}</section>;
}
