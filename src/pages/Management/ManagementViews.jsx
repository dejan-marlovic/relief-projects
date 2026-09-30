import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { downloadDocument } from "../../utils/documentDownload";
import { Attribution, HistorySnapshot, Issues, Pagination, ReadState } from "../Results/ResultViews";
import { label, useManagementRead } from "./managementApi";
import styles from "./Management.module.scss";

export function TaskLink() { return <Link to="/follow-ups" target="_blank" rel="noopener noreferrer">Open Follow-ups in a new tab</Link>; }

export function DecisionSummary({ record }) {
  const counts = record.linkedActionSummary;
  return <section className={styles.summary} aria-label="Management decision and linked work">
    <h4>Management resolution: {record.state === "RESOLVED" ? "Recorded" : "Open"}{record.isDeleted ? " · Deleted record" : ""}</h4>
    {counts && <p>Linked actions across all active associations: <strong>{counts.completed} completed · {counts.open} open · {counts.unavailable} unavailable</strong> ({counts.total} total).</p>}
    {record.resolvedWithOutstandingActions && <p><strong>Resolved with outstanding actions.</strong> This decision did not complete those tasks.</p>}
    {record.resolutionReviewRequired && <p role="status"><strong>Review required after linked task changes.</strong> Reopen and resolve again after review to reaffirm the decision.</p>}
    <Issues issues={record.issues} />
  </section>;
}
export function Decisions({ record }) {
  return <>
    <section className={styles.panel}><h4>Recorded management response</h4>{record.response ? <><p><strong>{label(record.response.disposition)}</strong></p><p className={styles.text}>{record.response.text}</p><p>Response date: {record.response.responseDate} · Recorded <Attribution at={record.response.recordedAt} actor={record.response.actor} /></p><details><summary>Associations observed with this response</summary><HistorySnapshot value={record.response.associationBasis} /></details></> : <p>{record.type === "LESSON" ? "Response not recorded (optional for lesson)." : "No response recorded. A finding needs a response before resolution."}</p>}</section>
    {record.latestReview && <section className={styles.panel}><h4>Latest review</h4><p>{record.latestReview.reviewDate} · {record.latestReview.note}</p><Attribution at={record.latestReview.recordedAt} actor={record.latestReview.actor} /><details><summary>Associations observed at review</summary><HistorySnapshot value={record.latestReview.associationBasis} /></details></section>}
    {record.resolution && <section className={styles.panel}><h4>Recorded resolution</h4><p>Resolution date: {record.resolution.resolvedDate}</p><p>Reason: {record.resolution.reason}</p>{record.resolution.outstandingActionExplanation && <p>Outstanding-action explanation: {record.resolution.outstandingActionExplanation}</p>}<Attribution at={record.resolution.recordedAt} actor={record.resolution.actor} /><details><summary>Retained resolution basis</summary><HistorySnapshot value={record.resolution} /></details></section>}
  </>;
}

export function TaskPicker({ projectId, authFetch, refresh, selected, onSelect }) {
  const [page, setPage] = useState(0);
  const state = useManagementRead(authFetch, `${BASE_URL}/api/projects/${projectId}/follow-ups?status=ALL&deleted=false&page=${page}&size=20`, refresh);
  return <section aria-label="Choose existing follow-up"><p>Choose an existing action for this project. Completed tasks may also be linked deliberately.</p><TaskLink /><p className={styles.muted}>Create or edit tasks there, then refresh here and link the existing task. Linking never creates, completes or duplicates a task.</p><ReadState state={state} />
    {selected && <p>Selected: #{selected.id} · {selected.title} · {label(selected.status)} · Revision {selected.revision}</p>}
    <ul className={styles.list}>{state.data?.content.filter(t => !t.isDeleted && String(t.projectId) === String(projectId)).map(t => <li key={t.id}><strong>#{t.id} · {t.title}</strong><p>{label(t.status)} · Due {t.dueDate} · {t.assignee?.displayName || "Unknown assignee"}{t.assignee?.isDeleted !== false ? " · Assignee inactive or unavailable" : ""}</p><button type="button" disabled={state.loading} onClick={() => onSelect(t)}>Select follow-up #{t.id}</button></li>)}</ul>
    <Pagination data={state.data} page={page} setPage={setPage} label="available follow-ups" disabled={state.loading} />
  </section>;
}
export function EvidencePicker({ projectId, authFetch, refresh, selected, onSelect }) {
  const state = useManagementRead(authFetch, `${BASE_URL}/api/documents/project/${projectId}`, refresh);
  const docs = Array.isArray(state.data) ? state.data.filter(d => d.isDeleted === false && String(d.projectId) === String(projectId)) : [];
  return <section><p>Select one exact document version. Historical active versions are included; replacements will not redirect this link.</p><ReadState state={state} /><label>Supporting document<select value={selected || ""} disabled={state.loading} onChange={e => onSelect(e.target.value ? Number(e.target.value) : null)}><option value="">Select a document version</option>{docs.map(d => <option key={d.id} value={d.id}>{d.documentName || `Document #${d.id}`} · Version {d.versionNumber ?? "unknown"} · #{d.id} · {d.status || "Unknown status"}</option>)}</select></label>{state.data && !docs.length && <p>No active document versions available for this project.</p>}{selected && !docs.some(d => d.id === selected) && <p role="alert">The selected version is no longer in the available list. Refresh and select again.</p>}</section>;
}

export function Associations({ kind, endpoint, authFetch, refresh, open, locked }) {
  const [page, setPage] = useState(0), [removed, setRemoved] = useState(false), [downloadError, setDownloadError] = useState("");
  const state = useManagementRead(authFetch, `${endpoint}/${kind}?includeRemoved=${removed}&page=${page}&size=20`, refresh);
  return <section aria-label={kind === "actions" ? "Linked follow-ups" : "Supporting documents"} className={styles.panel}><h3>{kind === "actions" ? "Linked follow-ups" : "Supporting documents"}</h3><label><input type="checkbox" checked={removed} onChange={e => { setRemoved(e.target.checked); setPage(0); }} />Include removed associations</label><ReadState state={state} />{downloadError && <p role="alert">{downloadError}</p>}
    {state.data?.content.map(row => <article className={styles.panel} key={row.id}>
      <h4>{kind === "actions" ? `Follow-up #${row.followUpId} · ${row.capturedTitle}` : `${row.capturedName || `Document #${row.documentId}`} · Version ${row.versionNumber ?? "unknown"}`}</h4>
      <p>{row.associationActive ? "Active association" : "Removed association"} · {label(row.availability)}</p>
      {kind === "actions" ? <>{row.current ? <><p>Current title: {row.current.title}</p><p>Current status: {label(row.current.status)}{row.current.isDeleted ? " · Task deleted; not counted as completed" : ""} · Due {row.current.dueDate}</p><p>Assigned to: {row.current.assignee?.displayName || "Unknown"}{row.current.assignee?.isDeleted !== false ? " · Inactive or unavailable" : ""} · Task revision {row.current.revision}</p></> : <p>Current task metadata unavailable.</p>}<TaskLink /></> : <><p>Current name: {row.currentName || "Unavailable"} · Status: {row.currentStatus || "Unknown"}</p><button disabled={!row.downloadEligible} onClick={async () => { setDownloadError(""); try { await downloadDocument(row.documentId, authFetch); } catch (e) { setDownloadError(e.message); } }}>Download document #{row.documentId} version {row.versionNumber ?? "unknown"}</button><p className={styles.muted}>Metadata availability does not verify the stored file or its contents.</p></>}
      <p>Linked <Attribution at={row.linkedAt} actor={row.linkedBy} /></p>{row.removedAt && <p>Removed <Attribution at={row.removedAt} actor={row.removedBy} /> · {row.removalReason}</p>}
      {row.permissions?.canRemove && <button disabled={locked || state.loading} onClick={() => open(`${kind}-remove`, { ...row, page, includeRemoved: removed })}>Remove {kind === "actions" ? "action" : "evidence"} association #{row.id}</button>}
    </article>)}{state.data && !state.data.content.length && <p>No associations on this page.</p>}
    <Pagination data={state.data} page={page} setPage={setPage} label={kind} disabled={state.loading} />
  </section>;
}
export function ManagementHistory({ endpoint, authFetch, refresh }) {
  const [page, setPage] = useState(0);
  const state = useManagementRead(authFetch, `${endpoint}/history?page=${page}&size=20`, refresh);
  return <section className={styles.panel} aria-label="Retained management history"><h3>Retained history</h3><ReadState state={state} /><ol className={styles.history}>{state.data?.content.map(event => <li key={event.id}><h4>{label(event.action)} · Revision {event.revision}</h4><Attribution at={event.occurredAt} actor={event.actor} />{event.reason && <p>Reason: {event.reason}</p>}<details><summary>Before</summary><HistorySnapshot value={event.before} /></details><details><summary>After</summary><HistorySnapshot value={event.after} /></details></li>)}</ol><Pagination data={state.data} page={page} setPage={setPage} label="management history" disabled={state.loading} /></section>;
}
