import useTransientMessage from "../../hooks/useTransientMessage";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readDocumentError } from "../../utils/documentMetadata";
import { canExportFollowUp, downloadFollowUpCalendar } from "../../utils/followUpCalendar";
import styles from "./FollowUps.module.scss";
import FollowUpDetails from "./FollowUpDetails";
import { workflowLabels, workflowLabel, boardColumns, moveCommand } from "./workflow";
import { useUnsavedChange, useUnsavedChanges } from "../../context/UnsavedChangesContext";

const buckets = { OVERDUE: "Overdue", DUE_TODAY: "Due today", UPCOMING: "Upcoming", LATER: "Later", COMPLETED: "Completed", INACTIVE: "Inactive" };
const employeeName = (person) => person.displayName || [person.firstName, person.lastName].filter(Boolean).join(" ") || `Employee #${person.id}`;
function TaskForm({ task, employees, busy, onSave, onCancel, blocked = false }) {
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
    <div className={styles.actions}><button disabled={busy || blocked} type="submit">Save follow-up</button><button disabled={busy} type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
function Queue({ mode, projectId, authFetch }) {
  const [filters, setFilters] = useState({ status: "OPEN", due: "", deleted: false, dueFrom: "", dueTo: "", assigneeEmployeeId: "" });
  const [view, setView] = useState(() => localStorage.getItem("follow-up-view") === "list" ? "list" : "board");
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dragSource = useRef(null);
  const [supported, setSupported] = useState(false);
  const [columns, setColumns] = useState(null);
  const [columnPages, setColumnPages] = useState({ TODO: 0, IN_PROGRESS: 0, DONE: 0 });
  const [retry, setRetry] = useState(null);
  const [freshTask, setFreshTask] = useState(null);
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
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
  useUnsavedChange(`follow-up-${mode}-${projectId}`, !!form || !!retry);
  const board = view === "board" && supported && !filters.deleted && data?.projectDeleted !== true;
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
    const query = new URLSearchParams({ status: board ? "ALL" : filters.status, page: String(page), size: "20" });
    if (mode === "project") query.set("deleted", String(filters.deleted));
    ["dueFrom", "dueTo", ...(board ? [] : ["due"]), ...(mode === "project" ? ["assigneeEmployeeId"] : [])].forEach(key => { if (filters[key]) query.set(key, filters[key]); });
    const read = async url => {
      const res = await authFetch(url, { signal: controller.signal, cache: "no-store" });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not load follow-ups."));
      const result = await res.json();
      if (!Array.isArray(result.content)) throw new Error("Could not load follow-ups.");
      return result;
    };
    (async () => {
      try {
        if (board) {
          const states = Object.keys(workflowLabels);
          const fetchColumns = () => Promise.all(states.map(state => { const q = new URLSearchParams(query); q.set("workflowState", state); q.set("page", columnPages[state]); return read(`${endpoint}?${q}`); }));
          let results = await fetchColumns();
          // One bounded retry when reads cross the server's business-day boundary.
          if (new Set(results.map(r => `${r.today}/${r.upcomingThrough}/${r.businessTimezone}`)).size > 1) results = await fetchColumns();
          if (new Set(results.map(r => `${r.today}/${r.upcomingThrough}/${r.businessTimezone}`)).size > 1) throw new Error("The business date changed while loading. Refresh the board.");
          if (!controller.signal.aborted) {
            if (results.some(r => r.workflowSupported !== true)) { setSupported(false); setView("list"); return; }
            setColumns(Object.fromEntries(states.map((state, i) => [state, results[i]])));
            setData(results[0]);
            const corrected = { ...columnPages };
            states.forEach((state, i) => { if (corrected[state] > 0 && !results[i].content.length) corrected[state] = Math.max(0, results[i].totalPages - 1); });
            if (states.some(state => corrected[state] !== columnPages[state])) setColumnPages(corrected);
          }
        } else {
          const result = await read(`${endpoint}?${query}`);
          if (!controller.signal.aborted) { setSupported(result.workflowSupported === true); if (page > 0 && !result.content.length) setPage(Math.max(0, result.totalPages - 1)); setData(result); }
        }
      } catch (err) { if (!controller.signal.aborted) { setColumns(null); setData(null); setError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, endpoint, filters, mode, page, revision, board, columnPages]);
  useEffect(() => {
    if (!retry?.task) { setFreshTask(null); return; }
    const controller = new AbortController(); setFreshTask(null);
    authFetch(`${BASE_URL}/api/projects/${retry.task.projectId}/follow-ups/${retry.task.id}`, { signal: controller.signal, cache: "no-store" })
      .then(async res => { if (!res.ok) throw new Error(await readDocumentError(res, "Could not refresh task.")); return res.json(); })
      .then(task => { if (!controller.signal.aborted) setFreshTask(task); })
      .catch(err => { if (!controller.signal.aborted) setNotice(err.message); });
    return () => controller.abort();
  }, [authFetch, retry, revision, setNotice]);
  const hasForm = !!form;
  useEffect(() => {
    if (!hasForm && !(supported && mode === "project")) return;
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
  }, [authFetch, hasForm, mode, supported]);
  const changeFilter = (key, value) => {
    if ((form || retry) && !confirmDiscardUnsavedChanges()) return;
    setPage(0); setForm(null); setRetry(null); setColumnPages({ TODO: 0, IN_PROGRESS: 0, DONE: 0 });
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
    else if (action === "progress") { url += "/progress"; method = "POST"; body = { expectedRevision: task.revision, target: values.target }; }
    else if (["complete", "reopen", "restore"].includes(action)) { url += `/${action}`; method = action === "restore" ? "PUT" : "POST"; body = { expectedRevision: task.revision }; }
    try {
      const res = await authFetch(url, { method, ...(method === "DELETE" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not save follow-up."));
      if (alive.current) { setForm(null); setRetry(null); setNotice("Follow-up updated. Check the current filters if it no longer appears in this list."); }
    } catch (err) {
      if (alive.current) { setRetry({ task, action, values }); setNotice(`${err.message} The list is being refreshed. Review it before trying again${task ? "; no change was automatically retried." : " to avoid creating a duplicate task."}`); }
    } finally { pending.current = false; if (alive.current) { setBusy(false); refresh(); } }
  };
  const taskActionsDisabled = busy || loading || !!form || !!retry;
  const clearDrag = () => { dragSource.current = null; setDragged(null); setDropTarget(null); };
  // A refreshed observation or a changed view invalidates an in-flight drag.
  useEffect(() => { dragSource.current = null; setDragged(null); setDropTarget(null); }, [loading, board, filters, columnPages, form, retry]);
  const canDrag = task => board && !taskActionsDisabled && Object.keys(workflowLabels).some(target => moveCommand(task, target));
  const drop = (event, target) => {
    event.preventDefault();
    const task = dragSource.current;
    const command = !taskActionsDisabled && board && moveCommand(task, target);
    clearDrag();
    if (!command) {
      if (task?.workflowState === "DONE" && target === "IN_PROGRESS") setNotice("Reopen this task into To do first, then choose Start work.");
      return;
    }
    if (command.action === "reopen" && !window.confirm("Reopen this follow-up? Its current completion attribution will be cleared.")) return;
    mutate(task, command.action, command.values);
  };
  const renderTask = task => <li key={task.id} className={dragged?.id === task.id ? styles.dragging : undefined}>
        {board && <span className={styles.dragHandle} draggable={!!canDrag(task)} title={canDrag(task) ? "Drag to an available column, or use the action buttons" : "Use available task actions"} onDragStart={event => {
          if (!canDrag(task)) { event.preventDefault(); return; }
          dragSource.current = task; setDragged(task); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(task.id));
        }} onDragEnd={clearDrag}>⠿ {canDrag(task) ? "Drag to move" : "Follow-up"}</span>}
        <div className={styles.heading}><h3>{task.title}</h3><span className={styles.badge}>{workflowLabel(task)}</span><span className={styles.badge}>{buckets[task.dueBucket] || task.dueBucket}</span></div>
        <p className={styles.muted}>{task.projectName} · Due {task.dueDate} · {task.assignee?.displayName}{task.assignee?.isDeleted !== false ? " (inactive employee)" : ""}{task.isDeleted ? " · Deleted" : ""}</p>
        {board && task.description && <p>{task.description.slice(0, 180)}{task.description.length > 180 ? "…" : ""}</p>}
        <div className={styles.actions}>
          {canExportFollowUp(task) && <button disabled={busy || loading} onClick={() => { setError(""); setNotice(""); try { downloadFollowUpCalendar(task); setNotice("Calendar file downloaded. Import it into your calendar; later changes must be updated there manually."); } catch (err) { setError(err.message); } }}>Download calendar entry (.ics)</button>}
          {task.permissions?.canEdit && <button disabled={taskActionsDisabled} onClick={() => setForm({ task })}>Edit follow-up</button>}
          {supported && task.permissions?.canStartWork && <button disabled={taskActionsDisabled} onClick={() => mutate(task, "progress", { target: "IN_PROGRESS" })}>Start work</button>}
          {supported && task.permissions?.canReturnToTodo && <button disabled={taskActionsDisabled} onClick={() => mutate(task, "progress", { target: "TODO" })}>Return to To do</button>}
          {task.permissions?.canComplete && <button disabled={taskActionsDisabled} onClick={() => mutate(task, "complete")}>Mark completed</button>}
          {task.permissions?.canReopen && <button disabled={taskActionsDisabled} onClick={() => { if (window.confirm("Reopen this follow-up? Its current completion attribution will be cleared.")) mutate(task, "reopen"); }}>Reopen</button>}
          {task.permissions?.canDelete && <button disabled={taskActionsDisabled} onClick={() => { if (window.confirm("Delete this follow-up? An administrator can restore it.")) mutate(task, "delete"); }}>Delete follow-up</button>}
          {task.permissions?.canRestore && <button disabled={taskActionsDisabled} onClick={() => mutate(task, "restore")}>Restore follow-up</button>}
        </div><FollowUpDetails task={task} />
      </li>;
  const retryPermission = retry && (retry.action === "progress" ? retry.values.target === "TODO" ? "canReturnToTodo" : "canStartWork" : { save: "canEdit", complete: "canComplete", reopen: "canReopen", delete: "canDelete", restore: "canRestore" }[retry.action]);
  const loadedColumns = columns ? boardColumns(columns) : null;
  return <>
    {supported && <div className={styles.actions} aria-label="Follow-up view">{["board", "list"].map(value => <button key={value} aria-pressed={(board ? "board" : "list") === value} disabled={busy || (value === "board" && (filters.deleted || data?.projectDeleted))} onClick={() => { if ((form || retry) && !confirmDiscardUnsavedChanges()) return; setForm(null); setRetry(null); setView(value); localStorage.setItem("follow-up-view", value); }}>{value === "list" ? "List" : "Board"}</button>)}</div>}
    {board && <p className={styles.muted}>Drag a card by its handle to an available column, or use its action buttons. Reopening Done work requires confirmation and returns it to To do; start work separately afterwards. Deadline warnings are independent of progress. Each column has its own pages and observed total; concurrent changes can affect counts. Refresh to reconcile them.</p>}
    <div className={styles.filters}>
      <label>Status<select value={filters.status} disabled={busy || board} onChange={(e) => changeFilter("status", e.target.value)}><option value="OPEN">Open</option><option value="COMPLETED">Completed</option><option value="ALL">All statuses</option></select></label>
      <label>Deadline group<select value={filters.due} disabled={busy || board || filters.status !== "OPEN" || filters.deleted} onChange={(e) => changeFilter("due", e.target.value)}><option value="">All deadlines</option>{Object.entries(buckets).slice(0, 4).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Due from<input type="date" value={filters.dueFrom} disabled={busy} onChange={(e) => changeFilter("dueFrom", e.target.value)} /></label>
      <label>Due through<input type="date" value={filters.dueTo} disabled={busy} onChange={(e) => changeFilter("dueTo", e.target.value)} /></label>
      {mode === "project" && supported && <label>Assigned employee<select value={filters.assigneeEmployeeId} disabled={busy} onChange={e => changeFilter("assigneeEmployeeId", e.target.value)}><option value="">All employees</option>{employees.map(person => <option key={person.id} value={person.id}>{employeeName(person)}</option>)}</select></label>}
      {mode === "project" && <label><input type="checkbox" checked={filters.deleted} disabled={busy} onChange={(e) => changeFilter("deleted", e.target.checked)} /> Deleted follow-ups only</label>}
    </div>
    {board && <p className={styles.muted}>Status and deadline-group filters apply to List only. Date and employee filters apply to both views.</p>}
    <div className={styles.actions}><button disabled={busy || loading} onClick={refresh}>Refresh follow-ups</button>{data?.canCreate && <button disabled={taskActionsDisabled} onClick={() => setForm({ task: null })}>New follow-up</button>}</div>
    {loading && <p role="status">Loading follow-ups…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {form && <><TaskForm key={form.task?.id || "new"} task={form.task} employees={employees} busy={busy || loading} blocked={!!retry || !!error || !data} onCancel={() => { setForm(null); setRetry(null); }} onSave={values => mutate(form.task, "save", values)} />{employeeError && <p role="alert">{employeeError}</p>}</>}
    {retry && <section className={styles.form} aria-label="Review failed follow-up action"><p>Your intended action and any entered text are retained. Review the refreshed task before retrying; an uncertain request may already have succeeded.</p>{freshTask && <p>Current: {freshTask.title} · {workflowLabel(freshTask)} · Revision {freshTask.revision} · Assigned to {freshTask.assignee?.displayName} · Due {freshTask.dueDate}</p>}<button disabled={busy || loading || !!error || !data || (retry.task ? !freshTask?.permissions?.[retryPermission] : !data?.canCreate)} onClick={() => { if (form) { setForm(f => ({ ...f, task: retry.task ? freshTask : null })); setRetry(null); } else mutate(freshTask, retry.action, retry.values); }}>I reviewed the refreshed state; {form ? "enable save" : "retry action"}</button><button disabled={busy} onClick={() => { setForm(null); setRetry(null); }}>Cancel intended action</button></section>}
    {data && <>
      <p className={styles.muted}>Business date: {data.today} · {data.businessTimezone}. Upcoming means tomorrow through {data.upcomingThrough}.</p>
      {data.mappingStatus === "NO_EMPLOYEE" && <p>Your account has no employee mapping. Ask an administrator to check your account.</p>}
      {data.mappingStatus === "EMPLOYEE_INACTIVE" && <p>Your linked employee is inactive. Personal follow-ups are unavailable until the account mapping is resolved.</p>}
      {data.projectDeleted === true && <p>This project is deleted. Follow-ups are retained as read-only records.</p>}
      {!board && !loading && !data.content.length && (!data.mappingStatus || data.mappingStatus === "MAPPED") && <p>No follow-ups match these filters.</p>}
      {board ? <div className={styles.board}>{Object.entries(workflowLabels).map(([state, title]) => <section key={state} className={`${styles.column} ${dragged && moveCommand(dragged, state) ? styles.dropAllowed : ""} ${dropTarget === state ? styles.dropOver : ""}`} aria-label={`${title} column`} onDragOver={event => {
        if (!taskActionsDisabled && moveCommand(dragSource.current, state)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(state); }
      }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null); }} onDrop={event => drop(event, state)}><h3>{title} <span className={styles.badge}>{columns?.[state]?.totalElements ?? "…"}</span></h3>{loadedColumns && <><ul className={styles.list}>{loadedColumns[state].map(renderTask)}</ul>{!loadedColumns[state].length && <p>No cards on this page.</p>}<div className={styles.actions}><button disabled={busy || loading || columnPages[state] === 0} onClick={() => setColumnPages(p => ({ ...p, [state]: p[state] - 1 }))}>Previous {title}</button><span>Page {columns[state].totalPages ? columnPages[state] + 1 : 0} of {columns[state].totalPages}</span><button disabled={busy || loading || columnPages[state] + 1 >= columns[state].totalPages} onClick={() => setColumnPages(p => ({ ...p, [state]: p[state] + 1 }))}>Next {title}</button></div></>}</section>)}</div> : <ul className={styles.list}>{data.content.map(renderTask)}</ul>}
      {!board && <div className={styles.actions}><button disabled={busy || loading || page === 0} onClick={() => setPage((v) => v - 1)}>Previous page</button><span>{data.totalElements} follow-ups · Page {data.totalPages ? page + 1 : 0} of {data.totalPages}</span><button disabled={busy || loading || page + 1 >= data.totalPages} onClick={() => setPage((v) => v + 1)}>Next page</button></div>}
    </>}
  </>;
}
export default function FollowUps() {
  const { selectedProjectId } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const [mode, setMode] = useState("project");
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
  return <section className={styles.page}><h2>Follow-ups</h2><p className={styles.muted}>Track project actions, deadlines and responsible people. Completing an action does not approve documents or satisfy a checklist.</p>
    <p className={styles.muted}>Download an open follow-up as an all-day calendar entry on its deadline. The file contains its title, description, project and responsible employee. Import it into Outlook or another calendar yourself. This is a snapshot: edits, completion and deletion do not update imported entries. Reimporting may create duplicates. No invitation or automatic notification is sent.</p>
    <div className={styles.actions}><button aria-pressed={mode === "project"} onClick={() => { if (confirmDiscardUnsavedChanges()) setMode("project"); }}>Selected project</button><button aria-pressed={mode === "mine"} onClick={() => { if (confirmDiscardUnsavedChanges()) setMode("mine"); }}>My follow-ups</button></div>
    {mode === "mine" && <p className={styles.muted}>Your employee’s assigned work across all active projects, regardless of the project selected above.</p>}
    {mode === "project" && !selectedProjectId ? <p>Select a project to see its follow-ups.</p> : <Queue key={`${mode}-${mode === "project" ? selectedProjectId : "all"}`} mode={mode} projectId={mode === "project" ? selectedProjectId : null} authFetch={authFetch} />}
  </section>;
}
