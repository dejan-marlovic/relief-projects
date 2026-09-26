import useTransientMessage from "../../hooks/useTransientMessage";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readDocumentError, uploadTimeLabel } from "../../utils/documentMetadata";
import styles from "./FollowUps.module.scss";

const buckets = { OVERDUE: "Overdue", DUE_TODAY: "Due today", UPCOMING: "Upcoming", LATER: "Later", COMPLETED: "Completed", INACTIVE: "Inactive" };
const name = (person) => person?.username || (person?.userId ? `User #${person.userId}` : "Unknown");
const employeeName = (person) => person.displayName || [person.firstName, person.lastName].filter(Boolean).join(" ") || `Employee #${person.id}`;
function TaskForm({ task, employees, busy, onSave, onCancel }) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [date, setDate] = useState(task?.dueDate || "");
  const [assignee, setAssignee] = useState(String(task?.assignee?.employeeId || ""));
  const [error, setError] = useState("");
  return <form className={styles.form} onSubmit={(event) => {
    event.preventDefault();
    if (!title.trim() || [...title.trim()].length > 200 || [...description.trim()].length > 4000 || !date || !assignee) { setError("Enter a title (up to 200 characters), deadline and assignee. Description may contain up to 4,000 characters."); return; }
    onSave({ title: title.trim(), description: description.trim() || null, dueDate: date, assigneeEmployeeId: Number(assignee) });
  }}>
    <h3>{task ? "Edit follow-up" : "New follow-up"}</h3>
    <label>Title<input required value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} /></label>
    <label>Description (optional)<textarea rows={3} value={description} disabled={busy} onChange={(e) => setDescription(e.target.value)} /></label>
    <div className={styles.grid}>
      <label>Deadline<input required type="date" min="1000-01-01" max="9999-12-31" value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Responsible employee<select required value={assignee} disabled={busy} onChange={(e) => setAssignee(e.target.value)}><option value="">Select an employee</option>{task?.assignee && !employees.some((p) => p.id === task.assignee.employeeId) && <option value={task.assignee.employeeId}>{task.assignee.displayName} (retained assignment)</option>}{employees.map((p) => <option key={p.id} value={p.id}>{employeeName(p)}</option>)}</select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}><button disabled={busy} type="submit">Save follow-up</button><button disabled={busy} type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
function Queue({ mode, projectId, authFetch }) {
  const [filters, setFilters] = useState({ status: "OPEN", due: "", deleted: false, dueFrom: "", dueTo: "" });
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useTransientMessage("", value => value.startsWith("Follow-up updated."));
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeError, setEmployeeError] = useState("");
  const alive = useRef(true);
  const pending = useRef(false);
  const endpoint = mode === "mine" ? `${BASE_URL}/api/follow-ups/mine` : `${BASE_URL}/api/projects/${projectId}/follow-ups`;
  const refresh = () => setRevision((v) => v + 1);
  useEffect(() => {
    alive.current = true;
    const update = () => { if (!pending.current && document.visibilityState !== "hidden") setRevision((v) => v + 1); };
    window.addEventListener("focus", update);
    const timer = setInterval(update, 60000);
    return () => { alive.current = false; window.removeEventListener("focus", update); clearInterval(timer); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    const query = new URLSearchParams({ status: filters.status, page: String(page), size: "20" });
    if (mode === "project") query.set("deleted", String(filters.deleted));
    ["due", "dueFrom", "dueTo"].forEach((key) => { if (filters[key]) query.set(key, filters[key]); });
    (async () => {
      try {
        const res = await authFetch(`${endpoint}?${query}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load follow-ups."));
        const result = await res.json();
        if (!Array.isArray(result.content)) throw new Error("Could not load follow-ups.");
        if (!controller.signal.aborted) { if (page > 0 && !result.content.length) setPage(Math.max(0, result.totalPages - 1)); setData(result); }
      } catch (err) { if (!controller.signal.aborted) { setData(null); setError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, endpoint, filters, mode, page, revision]);
  useEffect(() => {
    if (!form) return;
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
  }, [authFetch, form, revision]);
  const changeFilter = (key, value) => {
    setPage(0); setForm(null);
    setFilters((old) => ({ ...old, [key]: value, ...((key === "status" && value !== "OPEN") || (key === "deleted" && value) ? { due: "" } : {}) }));
  };
  const mutate = async (task, action, values) => {
    if (pending.current || loading) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    const root = `${BASE_URL}/api/projects/${task?.projectId || projectId}/follow-ups`;
    let url = task ? `${root}/${task.id}` : root;
    let method = task ? "PUT" : "POST";
    let body = task ? { ...values, expectedRevision: task.revision } : values;
    if (action === "delete") { method = "DELETE"; url += `?expectedRevision=${task.revision}`; }
    else if (["complete", "reopen", "restore"].includes(action)) { url += `/${action}`; method = action === "restore" ? "PUT" : "POST"; body = { expectedRevision: task.revision }; }
    try {
      const res = await authFetch(url, { method, ...(method === "DELETE" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not save follow-up."));
      if (alive.current) { setForm(null); setNotice("Follow-up updated. Check the current filters if it no longer appears in this list."); }
    } catch (err) {
      if (alive.current) { setForm(null); setNotice(`${err.message} The list is being refreshed. Review it before trying again${task ? "; no change was automatically retried." : " to avoid creating a duplicate task."}`); }
    } finally { pending.current = false; if (alive.current) { setBusy(false); refresh(); } }
  };
  return <>
    <div className={styles.filters}>
      <label>Status<select value={filters.status} disabled={busy} onChange={(e) => changeFilter("status", e.target.value)}><option value="OPEN">Open</option><option value="COMPLETED">Completed</option><option value="ALL">All statuses</option></select></label>
      <label>Deadline group<select value={filters.due} disabled={busy || filters.status !== "OPEN" || filters.deleted} onChange={(e) => changeFilter("due", e.target.value)}><option value="">All deadlines</option>{Object.entries(buckets).slice(0, 4).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Due from<input type="date" value={filters.dueFrom} disabled={busy} onChange={(e) => changeFilter("dueFrom", e.target.value)} /></label>
      <label>Due through<input type="date" value={filters.dueTo} disabled={busy} onChange={(e) => changeFilter("dueTo", e.target.value)} /></label>
      {mode === "project" && <label><input type="checkbox" checked={filters.deleted} disabled={busy} onChange={(e) => changeFilter("deleted", e.target.checked)} /> Deleted follow-ups only</label>}
    </div>
    <div className={styles.actions}><button disabled={busy || loading} onClick={refresh}>Refresh follow-ups</button>{data?.canCreate && <button disabled={busy || loading} onClick={() => setForm({ task: null })}>New follow-up</button>}</div>
    {loading && <p role="status">Loading follow-ups…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {data && <>
      <p className={styles.muted}>Business date: {data.today} · {data.businessTimezone}. Upcoming means tomorrow through {data.upcomingThrough}.</p>
      {data.mappingStatus === "NO_EMPLOYEE" && <p>Your account has no employee mapping. Ask an administrator to check your account.</p>}
      {data.mappingStatus === "EMPLOYEE_INACTIVE" && <p>Your linked employee is inactive. Personal follow-ups are unavailable until the account mapping is resolved.</p>}
      {data.projectDeleted === true && <p>This project is deleted. Follow-ups are retained as read-only records.</p>}
      {form && <><TaskForm key={form.task?.id || "new"} task={form.task} employees={employees} busy={busy || loading} onCancel={() => setForm(null)} onSave={(values) => mutate(form.task, "save", values)} />{employeeError && <p role="alert">{employeeError} Use Refresh follow-ups to retry.</p>}</>}
      {!loading && !data.content.length && (!data.mappingStatus || data.mappingStatus === "MAPPED") && <p>No follow-ups match these filters.</p>}
      <ul className={styles.list}>{data.content.map((task) => <li key={task.id}>
        <div className={styles.heading}><h3>{task.title}</h3><span className={styles.badge}>{buckets[task.dueBucket] || task.dueBucket}</span></div>
        <p className={styles.muted}>{task.projectName} · Due {task.dueDate} · {task.assignee?.displayName}{task.assignee?.isDeleted !== false ? " (inactive employee)" : ""}{task.isDeleted ? " · Deleted" : ""}</p>
        {task.description && <p className={styles.description}>{task.description}</p>}
        <details><summary>Attribution</summary><p>Created by {name(task.createdBy)} · {uploadTimeLabel(task.createdAt)}</p><p>Last changed by {name(task.updatedBy)} · {uploadTimeLabel(task.updatedAt)}</p>{task.completedAt && <p>Completed by {name(task.completedBy)} · {uploadTimeLabel(task.completedAt)}</p>}<p className={styles.muted}>Current attribution only; earlier edits and completion cycles are not retained.</p></details>
        <div className={styles.actions}>
          {task.permissions?.canEdit && <button disabled={busy || loading} onClick={() => setForm({ task })}>Edit follow-up</button>}
          {task.permissions?.canComplete && <button disabled={busy || loading} onClick={() => mutate(task, "complete")}>Mark completed</button>}
          {task.permissions?.canReopen && <button disabled={busy || loading} onClick={() => { if (window.confirm("Reopen this follow-up? Its current completion attribution will be cleared.")) mutate(task, "reopen"); }}>Reopen</button>}
          {task.permissions?.canDelete && <button disabled={busy || loading} onClick={() => { if (window.confirm("Delete this follow-up? An administrator can restore it.")) mutate(task, "delete"); }}>Delete follow-up</button>}
          {task.permissions?.canRestore && <button disabled={busy || loading} onClick={() => mutate(task, "restore")}>Restore follow-up</button>}
        </div>
      </li>)}</ul>
      <div className={styles.actions}><button disabled={busy || loading || page === 0} onClick={() => setPage((v) => v - 1)}>Previous page</button><span>{data.totalElements} follow-ups · Page {data.totalPages ? page + 1 : 0} of {data.totalPages}</span><button disabled={busy || loading || page + 1 >= data.totalPages} onClick={() => setPage((v) => v + 1)}>Next page</button></div>
    </>}
  </>;
}
export default function FollowUps() {
  const { selectedProjectId } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const [mode, setMode] = useState("project");
  return <section className={styles.page}><h2>Follow-ups</h2><p className={styles.muted}>Track project actions, deadlines and responsible people. Completing an action does not approve documents or satisfy a checklist.</p>
    <div className={styles.actions}><button aria-pressed={mode === "project"} onClick={() => setMode("project")}>Selected project</button><button aria-pressed={mode === "mine"} onClick={() => setMode("mine")}>My follow-ups</button></div>
    {mode === "mine" && <p className={styles.muted}>Your employee’s assigned work across all active projects, regardless of the project selected above.</p>}
    {mode === "project" && !selectedProjectId ? <p>Select a project to see its follow-ups.</p> : <Queue key={`${mode}-${mode === "project" ? selectedProjectId : "all"}`} mode={mode} projectId={mode === "project" ? selectedProjectId : null} authFetch={authFetch} />}
  </section>;
}
