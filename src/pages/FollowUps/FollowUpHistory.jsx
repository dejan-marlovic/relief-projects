import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../config/api";
import { uploadTimeLabel, readDocumentError } from "../../utils/documentMetadata";
import styles from "./FollowUps.module.scss";

const actions = { CREATE: "Created", UPDATE: "Details changed", PROGRESS: "Progress changed", COMPLETE: "Completed", REOPEN: "Reopened", DELETE: "Deleted", RESTORE: "Restored" };
const labels = { title: "Title", description: "Description", dueDate: "Deadline", assignee: "Responsible employee", status: "Status", workflowState: "Progress", completedAt: "Completed at", completedBy: "Completed by", isDeleted: "Deleted", deletedAt: "Deleted at", id: "Follow-up reference", projectId: "Project reference", revision: "Revision", createdAt: "Created at", createdBy: "Created by", updatedAt: "Changed at", updatedBy: "Changed by" };
const states = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done", OPEN: "Open", COMPLETED: "Completed" };
function actionLabel(entry) {
  if (entry.action === "PROGRESS") {
    if (entry.after?.workflowState === "IN_PROGRESS") return "Started work";
    if (entry.after?.workflowState === "TODO") return "Returned to To do";
  }
  return actions[entry.action] || "Recorded change";
}
function valueLabel(key, value) {
  if (value == null || value === "") return "Not recorded";
  if (key === "assignee") return value.displayName || `Employee #${value.employeeId}`;
  if (key.endsWith("By")) return value.username || `User #${value.userId}`;
  if (key.endsWith("At")) return uploadTimeLabel(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return ["status", "workflowState"].includes(key) && Object.prototype.hasOwnProperty.call(states, value) ? states[value] : String(value);
}
function Snapshot({ snapshot }) {
  if (!snapshot) return <p>No earlier state: this entry records creation.</p>;
  return <dl className={styles.historyValues}>{Object.entries(snapshot).map(([key, value]) => <React.Fragment key={key}><dt>{labels[key] || key}</dt><dd>{valueLabel(key, value)}{value && typeof value === "object" && <small> · Reference {value.employeeId ?? value.userId}</small>}</dd></React.Fragment>)}</dl>;
}
export default function FollowUpHistory({ task, authFetch }) {
  const [paging, setPaging] = useState({ revision: task.revision, page: 0 });
  const page = paging.revision === task.revision ? paging.page : 0;
  const setPage = value => setPaging({ revision: task.revision, page: typeof value === "function" ? value(page) : value });
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/projects/${task.projectId}/follow-ups/${task.id}/history?page=${page}&size=20`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load follow-up history."));
        const result = await res.json();
        if (!Array.isArray(result.content) || !["FROM_CREATION", "PARTIAL_LEGACY"].includes(result.coverage) || result.followUpId !== task.id || result.projectId !== task.projectId) throw new Error("Could not read follow-up history.");
        if (!controller.signal.aborted) {
          if (page > 0 && !result.content.length) { setPaging({ revision: task.revision, page: 0 }); return; }
          setData(result);
        }
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, task.id, task.projectId, task.revision, page, attempt]);
  return <section aria-label="Follow-up history" className={styles.history}>
    <h4>Activity history</h4>
    <p className={styles.muted}>Newest changes first. Expand an entry to see what changed.</p>
    {loading && !data && <p role="status">Loading history…</p>}
    {error && <div role="alert"><p>{error} {data ? "Showing the previously loaded history." : "History is unavailable; this does not mean there were no changes."}</p><button type="button" onClick={() => setAttempt(v => v + 1)}>Retry history</button></div>}
    {data && <>
      {data.coverage === "PARTIAL_LEGACY" && <p className={styles.historyNotice}>Detailed history is available from the introduction of this feature. Earlier changes are not available.</p>}
      {data.coverage === "FROM_CREATION" && <p className={styles.muted}>History recorded from creation.</p>}
      {!data.content.length && <p>No detailed changes have yet been recorded.</p>}
      <ol className={styles.timeline}>{data.content.map(entry => <li key={entry.id}>
        <details className={styles.historyEntry}>
          <summary><strong>{actionLabel(entry)}</strong><span>{uploadTimeLabel(entry.occurredAt)} · {entry.actor?.employeeName || entry.actor?.username || (entry.actor?.employeeId ? `Employee #${entry.actor.employeeId}` : `User #${entry.actor?.userId}`)}</span></summary>
          <p className={styles.muted}>Account: {entry.actor?.username || `User #${entry.actor?.userId}`} · Revision {entry.revision}</p>
          {(entry.changedFields || []).map(field => <div key={field} className={styles.historyChange}><strong>{labels[field] || field}</strong>{entry.before && <p><b>Before: </b>{valueLabel(field, entry.before[field])}</p>}<p><b>{entry.before ? "After" : "Initial value"}: </b>{valueLabel(field, entry.after?.[field])}</p></div>)}
          <details><summary>Full recorded details and references</summary><p>Entry #{entry.id} · Account #{entry.actor?.userId}{entry.actor?.employeeId != null ? ` · Employee #${entry.actor.employeeId}` : " · No employee attribution recorded"}</p><h5>Before</h5><Snapshot snapshot={entry.before} /><h5>After</h5><Snapshot snapshot={entry.after} /></details>
        </details>
      </li>)}
      {data.coverage === "PARTIAL_LEGACY" && task.createdAt && data.page >= Math.max(0, data.totalPages - 1) && <li key="legacy-creation">
        <strong>Created · from existing record</strong>
        <p className={styles.muted}>{uploadTimeLabel(task.createdAt)} · {task.createdBy?.username || (task.createdBy?.userId ? `User #${task.createdBy.userId}` : "Creator not recorded")}</p>
      </li>}
      </ol>
      <div className={styles.actions}><button disabled={loading || page === 0} onClick={() => setPage(v => v - 1)}>Newer history</button><span>{data.totalElements} recorded changes · Page {data.totalPages ? data.page + 1 : 0} of {data.totalPages}</span><button disabled={loading || page + 1 >= data.totalPages} onClick={() => setPage(v => v + 1)}>Older history</button>{page > 0 && <button disabled={loading} onClick={() => setPage(0)}>Latest history</button>}</div>
    </>}
  </section>;
}
