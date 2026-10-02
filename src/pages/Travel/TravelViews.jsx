import React, { useState } from "react";
import { downloadDocument } from "../../utils/documentDownload";
import { Attribution, HistorySnapshot, Issues, Pagination, ReadState } from "../Results/ResultViews";
import { TaskLink } from "../Management/ManagementViews";
import { label, useTravelRead } from "./travelApi";
import styles from "./Travel.module.scss";

export function TravelSummary({ record }) {
  const counts = record.linkedActionSummary;
  return <section className={styles.summary} aria-label="Travel state and linked work">
    <h4><span className={`${styles.statusBadge} ${styles[`status${record.state}`] || ""}`} aria-label={`Travel status: ${record.state}`}>{record.state}</span>{record.isDeleted ? " · Deleted request" : ""}</h4>
    <p>{record.traveller?.displayName || `Employee #${record.travellerEmployeeId}`} · {record.destination}</p>
    <p>Planned: {record.departureDate} through {record.returnDate}</p>
    {record.hasCurrentAuthorization && <p>Travel approval recorded. This does not confirm travel, booking, payment or completed tasks.</p>}
    {record.state === "RETURNED" && <p>Changes require resubmission and a new approval.</p>}
    {record.state === "CANCELLED" && <p>Cancelled — retained record. Restoration cannot reopen or approve it.</p>}
    {counts && <p>Linked follow-ups: <strong>{counts.completed} completed · {counts.open} open · {counts.unavailable} unavailable</strong> ({counts.total} total).</p>}
    <Issues issues={record.issues} />
  </section>;
}
export function TravelDecisions({ record }) {
  return <>{[["Current submission", record.currentSubmission], ["Current approval", record.currentApproval]].map(([title, decision]) => decision && <section className={styles.panel} key={title}>
    <h4>{title} #{decision.id}</h4><Attribution at={decision.recordedAt} actor={decision.actor} />
    {decision.actor?.employeeName && <p>Employee: {decision.actor.employeeName} (#{decision.actor.employeeId})</p>}
    {decision.note && <p className={styles.text}>{decision.note}</p>}
    <details><summary>{title === "Current approval" ? "Frozen approved submission" : "Frozen submitted trip and links"}</summary><HistorySnapshot value={decision.basis} /></details>
    {decision.observedEvidence && <details><summary>Evidence availability observed at approval</summary><HistorySnapshot value={decision.observedEvidence} /></details>}
  </section>)}</>;
}
export function Associations({ kind, endpoint, authFetch, refresh, open, locked, approved }) {
  const [page, setPage] = useState(0), [removed, setRemoved] = useState(false), [downloadError, setDownloadError] = useState("");
  const state = useTravelRead(authFetch, `${endpoint}/${kind}?includeRemoved=${removed}&page=${page}&size=20`, refresh);
  return <section aria-label={kind === "actions" ? "Linked follow-ups" : "Supporting documents"} className={styles.panel}><h3>{kind === "actions" ? "Linked follow-ups" : "Supporting documents"}</h3><label><input type="checkbox" checked={removed} onChange={e => { setRemoved(e.target.checked); setPage(0); }} />Include removed associations</label><ReadState state={state} />{downloadError && <p role="alert">{downloadError}</p>}
    {state.data?.content.map(row => <article className={styles.panel} key={row.id}>
      <h4>{kind === "actions" ? `Follow-up #${row.followUpId} · ${row.capturedTitle}` : `${row.capturedName || `Document #${row.documentId}`} · Version ${row.versionNumber ?? "unknown"}`}</h4>
      <p>{kind === "actions" && `${label(row.purpose)} · `}{row.associationActive ? "Active association" : "Removed association"} · {label(row.availability)}</p>
      {approved && <p><strong>{row.includedInCurrentApproval ? "Included in approved submission" : row.associationActive ? "Added after approval — outside the approved submission" : "Outside the current approved submission"}</strong></p>}{row.changedSinceSubmission && <p>Task changed since submission. This does not withdraw travel approval.</p>}{kind === "actions" ? <>{row.current ? <><p>Current title: {row.current.title}</p><p>Current status: {label(row.current.status)}{row.current.isDeleted ? " · Task deleted; not counted as completed" : ""} · Due {row.current.dueDate}</p><p>Assigned to: {row.current.assignee?.displayName || "Unknown"}{row.current.assignee?.isDeleted !== false ? " · Inactive or unavailable" : ""} · Task revision {row.current.revision}</p></> : <p>Current task metadata unavailable.</p>}<TaskLink /></> : <><p>Current name: {row.currentName || "Unavailable"} · Status: {row.currentStatus || "Unknown"}</p><button disabled={!row.downloadEligible} onClick={async () => { setDownloadError(""); try { await downloadDocument(row.documentId, authFetch); } catch (e) { setDownloadError(e.message); } }}>Download document #{row.documentId} version {row.versionNumber ?? "unknown"}</button><p className={styles.muted}>Metadata availability does not verify the stored file or its contents.</p></>}
      <p>Linked <Attribution at={row.linkedAt} actor={row.linkedBy} /></p>{row.removedAt && <p>Removed <Attribution at={row.removedAt} actor={row.removedBy} /> · {row.removalReason}</p>}
      {row.permissions?.canRemove && <button disabled={locked || state.loading} onClick={() => open(`${kind}-remove`, { ...row, page, includeRemoved: removed })}>Remove {kind === "actions" ? "action" : "evidence"} association #{row.id}</button>}
    </article>)}{state.data && !state.data.content.length && <p>No associations on this page.</p>}
    <Pagination data={state.data} page={page} setPage={setPage} label={kind} disabled={state.loading} />
  </section>;
}
const historyActions = { CREATE: "created the request", UPDATE: "updated the trip plan", SUBMIT: "submitted the plan", APPROVE: "approved the trip", RETURN: "returned the plan for changes", WITHDRAW_APPROVAL: "withdrew approval", CANCEL: "cancelled the request", DELETE: "deleted the request", RESTORE: "restored the request", EVIDENCE_LINKED: "linked a document", EVIDENCE_REMOVED: "removed a document link", ACTION_LINKED: "linked a follow-up", ACTION_REMOVED: "removed a follow-up link" };
export function TravelHistory({ endpoint, authFetch, refresh }) {
  const [page, setPage] = useState(0);
  const state = useTravelRead(authFetch, `${endpoint}/history?page=${page}&size=20`, refresh);
  return <section className={styles.panel} aria-label="Retained travel history"><h3>Travel history</h3><p className={styles.muted}>Newest first. Earlier plans and decisions remain available when a request is returned, changed or cancelled.</p><ReadState state={state} /><ol className={styles.timeline}>{state.data?.content.map(event => <li key={event.id}><h4>{event.actor?.username || "Recorded actor"} {historyActions[event.action] || label(event.action)}</h4><p className={styles.muted}>Revision {event.revision}</p><Attribution at={event.occurredAt} actor={event.actor} />{event.reason && <p>Reason: {event.reason}</p>}<details><summary>Before</summary><HistorySnapshot value={event.before} /></details><details><summary>After</summary><HistorySnapshot value={event.after} /></details></li>)}</ol><Pagination data={state.data} page={page} setPage={setPage} label="travel history" disabled={state.loading} /></section>;
}


