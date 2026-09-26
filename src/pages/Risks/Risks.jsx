import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readDocumentError, uploadTimeLabel } from "../../utils/documentMetadata";
import useTransientMessage from "../../hooks/useTransientMessage";
import styles from "./Risks.module.scss";

const rating = value => ({ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }[value] || "Not assessed");
const employeeName = person => person.displayName || [person.firstName, person.lastName].filter(Boolean).join(" ") || `Employee #${person.id}`;
const buckets = { OVERDUE: "Overdue review", DUE_TODAY: "Review today", UPCOMING: "Upcoming review", CLOSED: "Closed", INACTIVE: "Inactive" };
const fields = ["title", "description", "ownerEmployeeId", "likelihood", "impact", "mitigationPlan", "reviewDate"];
const draftFrom = risk => Object.fromEntries(fields.map(key => [key, risk?.[key] ?? ""]));
function RatingOptions({ filter = false }) {
  return <>{filter && <option value="">All ratings</option>}<option value={filter ? "UNASSESSED" : ""}>Not assessed</option>{["LOW", "MEDIUM", "HIGH"].map(value => <option key={value} value={value}>{rating(value)}</option>)}</>;
}
function Snapshot({ value }) {
  if (!value) return <p>No earlier record.</p>;
  return <dl className={styles.snapshot}>
    <dt>Title</dt><dd>{value.title}</dd><dt>Description</dt><dd>{value.description || "—"}</dd>
    <dt>Owner</dt><dd>{value.ownerName} (#{value.ownerEmployeeId})</dd>
    <dt>Likelihood / impact</dt><dd>{rating(value.likelihood)} / {rating(value.impact)}</dd>
    <dt>Mitigation plan</dt><dd>{value.mitigationPlan || "—"}</dd><dt>Review date</dt><dd>{value.reviewDate}</dd>
    <dt>Status</dt><dd>{value.status}{value.isDeleted ? " · Deleted" : ""}</dd>
    <dt>Closure reason</dt><dd>{value.closureReason || "—"}</dd>
    {value.closedAt && <><dt>Closed</dt><dd>{uploadTimeLabel(value.closedAt)} · {value.closedBy?.username}</dd></>}
    {value.deletedAt && <><dt>Deleted</dt><dd>{uploadTimeLabel(value.deletedAt)}</dd></>}
  </dl>;
}
function History({ risk, endpoint, authFetch, onClose }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError("");
    (async () => {
      try {
        const res = await authFetch(`${endpoint}/${risk.id}/history?page=${page}&size=20`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load risk history."));
        const result = await res.json();
        if (!Array.isArray(result.content)) throw new Error("Could not load risk history.");
        if (!controller.signal.aborted) setData(result);
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
    })();
    return () => controller.abort();
  }, [endpoint, authFetch, risk.id, page, attempt]);
  return <section className={styles.panel} aria-label="Risk history"><h3>History: {risk.title}</h3>
    <button onClick={onClose}>Close history</button>
    {error ? <p role="alert">{error} <button onClick={() => setAttempt(v => v + 1)}>Retry history</button></p> : !data && <p role="status">Loading history…</p>}
    {data && <><ol className={styles.history}>{data.content.map(event => <li key={event.id}>
      <h4>{event.action} · Revision {event.revision}</h4><p>{uploadTimeLabel(event.occurredAt)} · {event.actor?.username}</p>
      {event.reason && <p className={styles.text}>Reason: {event.reason}</p>}
      <details><summary>Before this change</summary><Snapshot value={event.before} /></details>
      <details><summary>After this change</summary><Snapshot value={event.after} /></details>
    </li>)}</ol>
      {!data.content.length && <p>No history on this page.</p>}
      <div className={styles.actions}><button disabled={!page} onClick={() => setPage(p => p - 1)}>Previous history page</button><span>Page {data.totalPages ? page + 1 : 0} of {data.totalPages}</span><button disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next history page</button></div>
    </>}
  </section>;
}
function Editor({ editor, employees, busy, blocked, onDraft, onSave, onCancel }) {
  const { risk, action, draft } = editor;
  const [error, setError] = useState("");
  const editing = action === "save";
  return <form className={styles.panel} aria-label="Risk editor" onSubmit={event => {
    event.preventDefault(); setError("");
    if (editing) {
      if (!draft.title.trim() || [...draft.title.trim()].length > 200 || [...draft.description.trim()].length > 4000 || [...draft.mitigationPlan.trim()].length > 4000 || !draft.ownerEmployeeId || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(draft.reviewDate)) {
        setError("Enter a title up to 200 characters, an owner and a valid review date. Description and mitigation plan may each contain up to 4,000 characters."); return;
      }
      onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() || null, mitigationPlan: draft.mitigationPlan.trim() || null, ownerEmployeeId: Number(draft.ownerEmployeeId), likelihood: draft.likelihood || null, impact: draft.impact || null });
    } else {
      if (["close", "reopen"].includes(action) && (!draft.reason?.trim() || [...draft.reason.trim()].length > 1000)) { setError("Enter a reason up to 1,000 characters."); return; }
      onSave(["close", "reopen"].includes(action) ? { reason: draft.reason.trim() } : {});
    }
  }}>
    <h3>{editing ? risk ? "Edit risk" : "New risk" : `${action[0].toUpperCase() + action.slice(1)} risk: ${risk.title}`}</h3>
    {risk && <p>Editing revision {risk.revision}.</p>}
    <fieldset disabled={busy}><legend className={styles.srOnly}>Risk details</legend>
      {editing ? <>
        <label>Title<input required value={draft.title} onChange={e => onDraft("title", e.target.value)} /></label>
        <label>Description (optional)<textarea rows={3} value={draft.description} onChange={e => onDraft("description", e.target.value)} /></label>
        <div className={styles.grid}>
          <label>Responsible employee<select required value={draft.ownerEmployeeId} onChange={e => onDraft("ownerEmployeeId", e.target.value)}><option value="">Select an employee</option>
            {risk && !employees.some(person => String(person.id) === String(risk.ownerEmployeeId)) && <option value={risk.ownerEmployeeId}>{risk.ownerName} (retained owner)</option>}
            {employees.map(person => <option key={person.id} value={person.id}>{employeeName(person)}</option>)}
          </select></label>
          <label>Next review date<input required type="date" min="1000-01-01" max="9999-12-31" value={draft.reviewDate} onChange={e => onDraft("reviewDate", e.target.value)} /></label>
          {["likelihood", "impact"].map(key => <label key={key}>{key === "likelihood" ? "Likelihood" : "Impact"}<select value={draft[key]} onChange={e => onDraft(key, e.target.value)}><RatingOptions /></select></label>)}
        </div>
        <label>Mitigation plan (optional)<textarea rows={4} value={draft.mitigationPlan} onChange={e => onDraft("mitigationPlan", e.target.value)} /></label>
      </> : ["close", "reopen"].includes(action) ? <label>Reason<textarea required rows={3} value={draft.reason || ""} onChange={e => onDraft("reason", e.target.value)} /></label> : <p>{action === "delete" ? "Delete this risk? Its history is retained. An administrator can restore it." : "Restore this risk with its previous open or closed status?"}</p>}
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}><button type="submit" disabled={blocked}>{editing ? "Save risk" : "Confirm " + action}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
function Register({ projectId, authFetch }) {
  const endpoint = `${BASE_URL}/api/projects/${projectId}/risks`;
  const [filters, setFilters] = useState({ status: "OPEN", deleted: false, overdue: false, ownerEmployeeId: "", likelihood: "", impact: "", reviewFrom: "", reviewTo: "" });
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useTransientMessage("", value => value.startsWith("Risk saved."));
  const [employees, setEmployees] = useState([]);
  const [employeeError, setEmployeeError] = useState("");
  const [editor, setEditor] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [latest, setLatest] = useState(null);
  const alive = useRef(true), pending = useRef(false), readController = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; readController.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    const query = new URLSearchParams({ status: filters.status, deleted: String(filters.deleted), overdue: String(filters.overdue), page: String(page), size: "20" });
    ["ownerEmployeeId", "likelihood", "impact", "reviewFrom", "reviewTo"].forEach(key => { if (filters[key]) query.set(key, filters[key]); });
    (async () => {
      try {
        const res = await authFetch(`${endpoint}?${query}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load risks."));
        const result = await res.json();
        if (!Array.isArray(result.content)) throw new Error("Could not load risks.");
        if (!controller.signal.aborted) {
          setData(result);
          if (page > 0 && !result.content.length) setPage(Math.max(0, result.totalPages - 1));
        }
      } catch (err) { if (!controller.signal.aborted) { setData(null); setError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, endpoint, filters, page, attempt]);
  useEffect(() => {
    const controller = new AbortController(); setEmployeeError("");
    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/employees/active`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load employees."));
        const result = await res.json();
        if (!Array.isArray(result)) throw new Error("Could not load employees.");
        if (!controller.signal.aborted) setEmployees(result);
      } catch (err) { if (!controller.signal.aborted) setEmployeeError(err.message); }
    })();
    return () => controller.abort();
  }, [authFetch, attempt]);
  const changeFilter = (key, value) => {
    setPage(0); setFilters(old => ({ ...old, [key]: value, ...((key === "status" && value !== "OPEN") || (key === "deleted" && value) ? { overdue: false } : {}) }));
  };
  const openEditor = (risk, action) => { setEditor({ risk, action, draft: action === "save" ? draftFrom(risk) : { reason: "" } }); setBlocked(false); setLatest(null); setNotice(""); };
  const cancelEditor = () => { readController.current?.abort(); setEditor(null); setBlocked(false); setLatest(null); setNotice(""); };
  const mutate = async values => {
    if (pending.current || blocked || !editor) return;
    pending.current = true; setBusy(true); setNotice(""); setLatest(null);
    const { risk, action } = editor;
    let url = risk ? `${endpoint}/${risk.id}` : endpoint;
    let method = risk ? "PUT" : "POST";
    let body = risk ? { ...values, expectedRevision: risk.revision } : values;
    if (action === "delete") { method = "DELETE"; url += `?expectedRevision=${risk.revision}`; }
    else if (["close", "reopen", "restore"].includes(action)) { url += "/" + action; method = action === "restore" ? "PUT" : "POST"; }
    try {
      const res = await authFetch(url, { method, ...(method === "DELETE" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
      if (!res.ok) {
        const err = new Error(await readDocumentError(res, "Could not save risk.")); err.status = res.status; throw err;
      }
      // A successful HTTP response confirms the write, even if a proxy stripped its body.
      if (alive.current) { setEditor(null); setHistory(null); setNotice("Risk saved. Check the filters if it no longer appears."); setAttempt(v => v + 1); }
    } catch (err) {
      if (alive.current) {
        const uncertain = !err.status || err.status >= 500;
        setBlocked(err.status === 409 || err.status === 403 || err.status === 404 || uncertain);
        const mustRefresh = [403, 404, 409].includes(err.status) || uncertain;
        setNotice(`${err.message} ${uncertain ? "The outcome is uncertain. " : ""}${risk && mustRefresh ? "Your draft and original revision are retained. Load the latest risk before retrying." : !risk && uncertain ? "Review the register before creating again to avoid a duplicate." : "Your draft is retained. Correct the fields and try again."} No change was automatically retried.`);
      }
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  const loadLatest = async () => {
    if (pending.current) return;
    const controller = new AbortController(); readController.current?.abort(); readController.current = controller; setBusy(true);
    try {
      const res = await authFetch(`${endpoint}/${editor.risk.id}`, { signal: controller.signal });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not load the latest risk."));
      const value = await res.json();
      if (!controller.signal.aborted) setLatest(value);
    } catch (err) { if (!controller.signal.aborted) setNotice(err.message + " Your draft is retained."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const locked = busy || !!editor;
  return <>
    <div className={styles.filters}>
      <label>Status<select value={filters.status} disabled={locked} onChange={e => changeFilter("status", e.target.value)}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="ALL">All statuses</option></select></label>
      <label>Owner filter<select value={filters.ownerEmployeeId} disabled={locked} onChange={e => changeFilter("ownerEmployeeId", e.target.value)}><option value="">All owners</option>
        {employees.map(person => <option key={person.id} value={person.id}>{employeeName(person)}</option>)}
        {data?.content.filter((risk, index, rows) => !employees.some(person => String(person.id) === String(risk.ownerEmployeeId)) && rows.findIndex(other => other.ownerEmployeeId === risk.ownerEmployeeId) === index).map(risk => <option key={risk.ownerEmployeeId} value={risk.ownerEmployeeId}>{risk.ownerName} (retained owner)</option>)}
      </select></label>
      {["likelihood", "impact"].map(key => <label key={key}>{key === "likelihood" ? "Likelihood filter" : "Impact filter"}<select value={filters[key]} disabled={locked} onChange={e => changeFilter(key, e.target.value)}><RatingOptions filter /></select></label>)}
      <label>Review from<input type="date" min="1000-01-01" max="9999-12-31" value={filters.reviewFrom} disabled={locked} onChange={e => changeFilter("reviewFrom", e.target.value)} /></label>
      <label>Review through<input type="date" min="1000-01-01" max="9999-12-31" value={filters.reviewTo} disabled={locked} onChange={e => changeFilter("reviewTo", e.target.value)} /></label>
      <label><input type="checkbox" checked={filters.overdue} disabled={locked || filters.status !== "OPEN" || filters.deleted} onChange={e => changeFilter("overdue", e.target.checked)} /> Overdue reviews only</label>
      <label><input type="checkbox" checked={filters.deleted} disabled={locked} onChange={e => changeFilter("deleted", e.target.checked)} /> Deleted risks only</label>
    </div>
    <div className={styles.actions}><button disabled={busy || loading} onClick={() => setAttempt(v => v + 1)}>Refresh register</button>{data?.canCreate && <button disabled={locked || loading} onClick={() => openEditor(null, "save")}>New risk</button>}</div>
    {loading && <p role="status">Loading risks…</p>}{error && <p role="alert">{error}</p>}{employeeError && <p role="alert">{employeeError} Use Refresh register to retry.</p>}
    {notice && <p role={blocked ? "alert" : "status"}>{notice}</p>}
    {editor && <>
      <Editor key={`${editor.risk?.id || "new"}-${editor.risk?.revision || 0}-${editor.action}`} editor={editor} employees={employees} busy={busy} blocked={blocked} onDraft={(key, value) => setEditor(old => ({ ...old, draft: { ...old.draft, [key]: value } }))} onSave={mutate} onCancel={cancelEditor} />
      {blocked && editor.risk && <button disabled={busy} onClick={loadLatest}>Load latest risk for comparison</button>}
      {blocked && !editor.risk && <p>Refresh the register and check whether this risk was created. Cancel this draft once you have checked; start a new risk only if needed.</p>}
      {latest && <section className={styles.panel} aria-label="Latest risk"><h3>Latest record · Revision {latest.revision}</h3><Snapshot value={latest} />
        <p>Your draft above is unchanged. Replacing it discards your unsaved fields and reason.</p>
        <button disabled={busy || !latest.permissions?.[({ save: "canEdit", close: "canClose", reopen: "canReopen", delete: "canDelete", restore: "canRestore" })[editor.action]]} onClick={() => openEditor(latest, editor.action)}>Replace draft with latest record</button>
      </section>}
    </>}
    {data && <>
      <p className={styles.muted}>Business date: {data.today} · {data.businessTimezone}. Review dates are the next planned review, not evidence that a review took place.</p>
      {data.projectDeleted && <p>This project is inactive. Its risks and history are read-only.</p>}
      {!loading && !data.content.length && <p>No risks match these filters.</p>}
      <ul className={styles.list}>{data.content.map(risk => <li key={risk.id}>
        <div className={styles.heading}><h3>{risk.title}</h3><span>{buckets[risk.reviewBucket] || risk.reviewBucket}{risk.isDeleted ? " · Deleted" : ""}</span></div>
        <p>{risk.ownerName}{risk.ownerInactive ? " (inactive employee)" : ""} · Review {risk.reviewDate} · {risk.status === "CLOSED" ? "Closed" : "Open"}</p>
        <p>Likelihood: {rating(risk.likelihood)} · Impact: {rating(risk.impact)}</p>
        {risk.description && <p className={styles.text}>{risk.description}</p>}
        {risk.mitigationPlan && <p className={styles.text}><strong>Mitigation: </strong>{risk.mitigationPlan}</p>}
        {risk.closureReason && <p className={styles.text}><strong>Closure reason: </strong>{risk.closureReason}</p>}
        <details><summary>Attribution</summary><p>Created by {risk.createdBy?.username} · {uploadTimeLabel(risk.createdAt)}</p><p>Last changed by {risk.updatedBy?.username} · {uploadTimeLabel(risk.updatedAt)}</p></details>
        <div className={styles.actions}>
          {[["canEdit", "save", "Edit risk"], ["canClose", "close", "Close risk"], ["canReopen", "reopen", "Reopen risk"], ["canDelete", "delete", "Delete risk"], ["canRestore", "restore", "Restore risk"]].map(([permission, action, label]) => risk.permissions?.[permission] && <button key={action} disabled={locked || loading} onClick={() => openEditor(risk, action)}>{label}</button>)}
          <button disabled={busy} onClick={() => setHistory(risk)}>View history</button>
        </div>
      </li>)}</ul>
      <div className={styles.actions}><button disabled={locked || loading || !page} onClick={() => setPage(p => p - 1)}>Previous page</button><span>{data.totalElements} risks · Page {data.totalPages ? page + 1 : 0} of {data.totalPages}</span><button disabled={locked || loading || page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next page</button></div>
    </>}
    {history && <History key={history.id} risk={history} endpoint={endpoint} authFetch={authFetch} onClose={() => setHistory(null)} />}
  </>;
}
export default function Risks() {
  const { selectedProjectId } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  return <section className={styles.page}><h2>Project risks</h2><p>Record risks, responsible people, mitigation plans and review dates. Likelihood and impact are separate assessments; no combined score is calculated.</p>
    {selectedProjectId ? <Register key={selectedProjectId} projectId={selectedProjectId} authFetch={authFetch} /> : <p>Select a project to see its risk register.</p>}
  </section>;
}
