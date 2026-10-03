import TravelReport from "./TravelReport";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChange, useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../utils/http";
import { Attribution, Pagination, ReadState } from "../Results/ResultViews";
import { commands, readTravel, tripDraft, useTravelRead } from "./travelApi";
import { Associations, TravelDecisions, TravelHistory, TravelSummary } from "./TravelViews";
import TravelEditor from "./TravelEditor";
import TravelSteps from "./TravelSteps";
import TravelActionIcon, { approvalStyle } from "./TravelActionIcon";
import styles from "./Travel.module.scss";

function TravelDetail({ id, base, projectId, authFetch, refresh, reload, onClose }) {
  const endpoint = `${base}/${id}`;
  const detail = useTravelRead(authFetch, endpoint, refresh);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const [reportActive, setReportActive] = useState(false);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useUnsavedChange(`travel-${projectId}-${id}`, !!form);
  const reviewHistory = useTravelRead(authFetch, form?.reviewRequired ? `${endpoint}/history?page=0&size=20` : null, refresh);
  const kind = form?.action?.endsWith("-remove") ? form.action.split("-")[0] : null;
  const removalPage = useTravelRead(authFetch, kind ? `${endpoint}/${kind}?includeRemoved=${form.link.includeRemoved}&page=${form.link.page}&size=20` : null, refresh);
  const record = detail.data;
  const retainedRecord = useRef(null);
  if (record) retainedRecord.current = record;
  const permitted = !!record && (kind ? removalPage.data?.content.some(link => link.id === form.link.id && link.permissions?.canRemove) : record.permissions?.[commands[form?.action]?.[1]]);
  const blocked = !record || detail.loading || removalPage.loading || !permitted || (form?.reviewRequired && (reviewHistory.loading || !reviewHistory.data));
  const locked = busy || !!form || detail.loading || reportActive;
  function open(action, link) {
    const draft = action === "edit" ? { ...tripDraft(record), reason: "" } : { reason: "", note: "", actionPurpose: "PREPARATION" };
    setForm({ action, link, draft, record, expectedRevision: record.revision });
  }
  async function save(body) {
    if (pending.current || blocked || form.reviewRequired) return;
    pending.current = true; setBusy(true);
    const path = form.action === "edit" ? "" : kind ? `/${kind}/${form.link.id}/remove` : `/${form.action}`;
    try {
      await authFetch(`${endpoint}${path}`, { method: form.action === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedRevision: form.expectedRevision }) }).then(readTravel);
      if (alive.current) setForm(null);
    } catch (error) { if (alive.current) setForm(f => ({ ...f, error: error.message, reviewRequired: true })); }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  const planActions = ["edit", "evidence", "actions"];
  const approvalActions = ["submit", "approve", "return", "withdraw-approval"];
  const formStep = form ? (planActions.includes(form.action) || kind ? "plan" : approvalActions.includes(form.action) ? "approval" : null) : null;
  const buttons = actions => <div className={styles.actions}>{actions.map(action => {
    const [title, permission] = commands[action];
    return record.permissions?.[permission] && <button key={action} className={approvalStyle(action, styles)} disabled={locked} onClick={() => open(action)}><TravelActionIcon action={action} />{title}</button>;
  })}</div>;
  const editor = form && <><TravelEditor key={form.action} form={form} setForm={setForm} projectId={projectId} authFetch={authFetch} refresh={refresh} busy={busy} blocked={blocked} onSave={save} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, record, expectedRevision: record.revision, reviewRequired: false, error: "", draft: f.action === "actions" ? { ...f.draft, followUp: null } : f.draft }))} /><ReadState state={reviewHistory} /><ReadState state={removalPage} /></>;
  return <section className={styles.panel} aria-label="Travel request details">
    <div className={styles.actions}><button disabled={busy} onClick={reload}>Refresh request, links and history</button><button disabled={!!form || busy || reportActive} onClick={onClose}>Close request</button></div><ReadState state={detail} />
    {record && <><h3>{record.purpose} · Travel request #{record.id}</h3>
      <TravelSummary record={record} />
      <TravelSteps record={record} editingStep={formStep} plan={<>
        <h4>Trip details</h4><dl className={styles.snapshot}><dt>Traveller</dt><dd>{record.traveller?.displayName}</dd><dt>Purpose</dt><dd>{record.purpose}</dd><dt>Destination</dt><dd>{record.destination}</dd><dt>Planned dates</dt><dd>{record.departureDate} through {record.returnDate}</dd></dl>
        {record.notes && <p className={styles.text}>{record.notes}</p>}<p>Created <Attribution at={record.createdAt} actor={record.createdBy} /></p>
        <p className={styles.muted}>Supporting documents and follow-ups are optional. Later additions remain separate from an earlier approval.</p>
        {buttons(planActions)}{formStep === "plan" && editor}
        <Associations kind="actions" endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked} approved={record.state === "APPROVED"} />
        <Associations kind="evidence" endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked} approved={record.state === "APPROVED"} />
      </>} approval={<>
        <p>An independent approver reviews the submitted plan. Returning or withdrawing approval allows changes and resubmission; previous decisions remain in the timeline.</p>
        {record.state === "SUBMITTED" && <p>Trip details and associations are fixed while awaiting a decision. Return for changes before editing.</p>}
        {record.state === "APPROVED" && <p>Withdraw approval before changing trip details or removing links included in the approved submission. Late documents and follow-ups remain outside that approval.</p>}
        <TravelDecisions record={record} />{buttons(approvalActions)}{formStep === "approval" && editor}
      </>} />
    </>}
    {(record || retainedRecord.current) && <TravelReport endpoint={endpoint} projectId={projectId} travel={record || retainedRecord.current} authFetch={authFetch} refresh={refresh} reload={reload} parentLocked={!record || !!form || busy || detail.loading} onActivityChange={setReportActive} />}
    {record && <section aria-label="Request administration"><h4>Request actions</h4>{buttons(["cancel", "delete", "restore"])}{!formStep && editor}</section>}
    {!record && editor}
    <TravelHistory endpoint={endpoint} authFetch={authFetch} refresh={refresh} />
  </section>;
}

const initialFilters = { state: "ALL", deleted: false, travellerEmployeeId: "", departureFrom: "", departureTo: "" };
export function TravelRegister({ projectId, authFetch, initialRequestId = null }) {
  const base = `${BASE_URL}/api/projects/${projectId}/travel-requests`;
  const [filters, setFilters] = useState(initialFilters), [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0), [selected, setSelected] = useState(initialRequestId), [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const pending = useRef(false), alive = useRef(true);
  const reload = () => setRefresh(n => n + 1);
  useEffect(() => {
    alive.current = true;
    const update = () => { if (document.visibilityState !== "hidden") setRefresh(n => n + 1); };
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { alive.current = false; window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")), page, size: 20 });
  const list = useTravelRead(authFetch, `${base}?${query}`, refresh);
  useUnsavedChange(`new-travel-${projectId}`, !!form);
  const change = (key, value) => { setFilters(f => ({ ...f, [key]: value })); setPage(0); };
  async function create(body) {
    if (pending.current || form.reviewRequired || list.loading || !list.data?.canCreate) return;
    pending.current = true; setBusy(true);
    try {
      const record = await authFetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(readTravel);
      if (alive.current) { setForm(null); setSelected(record.id); setFilters(initialFilters); setPage(0); }
    } catch (error) { if (alive.current) setForm(f => ({ ...f, error: error.message, reviewRequired: true })); }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  return <><div className={styles.actions}><button disabled={busy} onClick={reload}>Refresh travel requests</button>{list.data?.canCreate && <button disabled={!!form || !!selected || busy} onClick={() => setForm({ action: "create", draft: { ...tripDraft(), departureDate: list.data.today, returnDate: list.data.today } })}>Create travel request</button>}</div>
    <div className={styles.filters}><label>Travel state<select value={filters.state} onChange={e => change("state", e.target.value)}>{["ALL", "DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "CANCELLED"].map(state => <option value={state} key={state}>{state === "ALL" ? "All states" : state.charAt(0) + state.slice(1).toLowerCase()}</option>)}</select></label>
      <label>Traveller employee ID<input type="number" min="1" step="1" value={filters.travellerEmployeeId} onChange={e => change("travellerEmployeeId", e.target.value)} /></label>
      <label>Departure from<input type="date" value={filters.departureFrom} onChange={e => change("departureFrom", e.target.value)} /></label><label>Departure through<input type="date" value={filters.departureTo} onChange={e => change("departureTo", e.target.value)} /></label>
      <label><input type="checkbox" checked={filters.deleted} onChange={e => change("deleted", e.target.checked)} />Show deleted requests only</label></div>
    <ReadState state={list} />{list.data?.projectDeleted && <p>This project is inactive. Retained travel requests are read-only.</p>}
    <ul className={styles.list}>{list.data?.content.map(record => <li key={record.id}><div className={styles.heading}><h3>{record.purpose}</h3><button disabled={!!form || busy || (selected != null && selected !== record.id)} onClick={() => setSelected(record.id)}>Open request #{record.id}</button></div><TravelSummary record={record} /></li>)}</ul>
    {list.data && !list.data.content.length && <p>No travel requests match these filters.</p>}<Pagination data={list.data} page={page} setPage={setPage} label="travel requests" disabled={list.loading || busy} />
    {form && <TravelEditor form={form} setForm={setForm} projectId={projectId} authFetch={authFetch} refresh={refresh} busy={busy} blocked={list.loading || !list.data?.canCreate} onSave={create} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, error: "", reviewRequired: false }))} />}
    {selected && <TravelDetail key={selected} id={selected} base={base} projectId={projectId} authFetch={authFetch} refresh={refresh} reload={reload} onClose={() => setSelected(null)} />}
  </>;
}
export default function Travel() {
  const { selectedProjectId, setSelectedProjectId } = useContext(ProjectContext);
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const projectId = params.get("projectId"), requestId = params.get("requestId");
  const linked = projectId !== null || requestId !== null;
  const valid = /^[1-9]\d*$/.test(projectId || "") && /^[1-9]\d*$/.test(requestId || "");
  const projects = useTravelRead(authFetch, linked && valid ? `${BASE_URL}/api/projects/ids-names` : null, 0);
  const available = projects.data?.some(project => String(project.id) === projectId);
  const matching = String(selectedProjectId) === projectId;
  const scheduleUrl = location.state?.scheduleUrl;
  const back = typeof scheduleUrl === "string" && /^\/travel-schedule(?:\?|$)/.test(scheduleUrl) ? scheduleUrl : "/travel-schedule";
  return <section className={styles.page}><h2>Travel</h2>
    {linked && <button onClick={() => { if (confirmDiscardUnsavedChanges()) navigate(back); }}>Back to travel schedule</button>}
    <p>Plan a project trip and request independent approval. After travel concludes, record the actual outcome and request independent report review. Travel approval and report acceptance are separate decisions; neither verifies outcomes or approves expenses. Link preparation and reporting work from Follow-ups.</p>
    {linked ? <><ReadState state={projects} />{!valid && <p role="alert">This travel link needs a valid project and request ID.</p>}{valid && projects.data && !available && <p role="alert">This project's travel is no longer available in the active project list. Refresh the schedule.</p>}{available && !matching && <><p>This request belongs to project #{projectId}, which differs from your current selection.</p><button onClick={() => { if (confirmDiscardUnsavedChanges()) setSelectedProjectId(projectId); }}>Select request's project</button><button onClick={() => { if (confirmDiscardUnsavedChanges()) navigate("/travel"); }}>View selected project's travel</button></>}{available && matching && <TravelRegister key={`${projectId}-${requestId}`} projectId={projectId} authFetch={authFetch} initialRequestId={requestId} />}</> : selectedProjectId ? <TravelRegister key={selectedProjectId} projectId={selectedProjectId} authFetch={authFetch} /> : <p>Select a project to view its travel requests.</p>}
  </section>;
}
