import { uploadTimeLabel } from "../../utils/documentMetadata";
import React, { useId, useState } from "react";
import { Attribution, HistorySnapshot, Pagination, ReadState } from "../Results/ResultViews";
import { HistoryIntro } from "../../components/Workflow/Workflow";
import { label, useTravelRead } from "./travelApi";
import styles from "./Travel.module.scss";

export function ReportBasis({ basis }) {
  if (!basis) return <p>No captured plan basis.</p>;
  return <section aria-label="Captured report plan"><h4>Captured report plan</h4>
    <p><strong>{basis.kind === "RECORDED_APPROVAL" ? `Recorded approval #${basis.approvalId}` : "Unapproved plan observation"}</strong></p>
    <dl className={styles.snapshot}><dt>Traveller</dt><dd>{basis.traveller?.displayName} (#{basis.traveller?.employeeId})</dd><dt>Purpose</dt><dd>{basis.purpose}</dd><dt>Destination</dt><dd>{basis.destination}</dd><dt>Captured planned dates</dt><dd>{basis.departureDate} through {basis.returnDate}</dd></dl>
    {basis.approvalRecordedAt && <p>Approval recorded {uploadTimeLabel(basis.approvalRecordedAt)}</p>}
    <p className={styles.muted}>This saved basis stays separate from the live travel plan and the actual account. Reporting does not grant retrospective travel approval.</p>
  </section>;
}
export function ReportAccount({ report }) {
  return <section aria-label="Reported travel outcome"><h4>Reported outcome: {report.outcome ? label(report.outcome) : "Not assessed"}</h4>
    <p>Actual dates: {report.actualDepartureDate || "Unknown"} through {report.actualReturnDate || "Unknown"}</p>
    <p className={styles.text}>{report.outcomeSummary || "No outcome summary recorded."}</p>
    <p>Material differences: {report.materialDifferences == null ? "Not assessed" : report.materialDifferences ? "Yes" : "No"}</p>
    {report.explanation && <p className={styles.text}>Explanation: {report.explanation}</p>}
  </section>;
}
export function ReportDecisions({ report }) {
  return <>{[["Report submission", report.currentSubmission], ["Report acceptance", report.currentAcceptance]].map(([title, decision]) => decision && <section key={title} className={styles.panel} aria-label={title}>
    <h4>{title} #{decision.id}</h4><Attribution at={decision.recordedAt} actor={decision.actor} />
    {decision.actor?.employeeName && <p>Employee: {decision.actor.employeeName} (#{decision.actor.employeeId})</p>}
    <p className={styles.text}>{decision.note}</p>
    <details open={report.state === "SUBMITTED"}><summary>Frozen report, plan and submitted links</summary><HistorySnapshot value={decision.basis} /></details>
    <details><summary>Authorization observed at this report decision</summary><HistorySnapshot value={decision.authorizationObservation} /></details>
    {decision.observedEvidence && <details><summary>Evidence availability observed at acceptance</summary><HistorySnapshot value={decision.observedEvidence} /></details>}
  </section>)}</>;
}
export function ReportHistory({ endpoint, authFetch, refresh }) {
  const [page, setPage] = useState(0);
  const state = useTravelRead(authFetch, `${endpoint}/history?page=${page}&size=20`, refresh);
  return <section aria-label="Retained report history" className={styles.panel}><h3>Report history</h3>
    <HistoryIntro>Newest first. Report edits, submissions, acceptance and corrections are retained separately from travel authorization history.</HistoryIntro>
    <ReadState state={state} /><ol className={styles.timeline}>{state.data?.content?.map(event => <li key={event.id}><h4>{label(event.action)} · Report revision {event.revision}</h4><Attribution at={event.occurredAt} actor={event.actor} />{event.reason && <p>Reason: {event.reason}</p>}<details><summary>Before report change</summary><HistorySnapshot value={event.before} /></details><details><summary>After report change</summary><HistorySnapshot value={event.after} /></details></li>)}</ol>
    {state.data?.content?.length === 0 && <p>No report history on this page.</p>}<Pagination data={state.data} page={page} setPage={setPage} label="report history" disabled={state.loading} />
  </section>;
}

export function ApprovalBasisPicker({ endpoint, authFetch, refresh, value, onChange }) {
  const basisGroup = useId();
  const [page, setPage] = useState(0);
  const state = useTravelRead(authFetch, `${endpoint}/history?page=${page}&size=20`, refresh);
  const approvals = state.data?.content?.filter(event => event.action === "APPROVE") || [];
  return <section aria-label="Choose report plan basis"><p>Choose the retained approval that describes this trip, including a withdrawn approval when appropriate. Or explicitly capture the current plan without approval. Nothing is selected automatically.</p>
    <label><input type="radio" name={basisGroup} checked={value === "unapproved"} onChange={() => onChange("unapproved")} />Use current plan as an unapproved observation</label>
    <p>Selected basis: {value === "" ? "None selected" : value === "unapproved" ? "Unapproved plan observation" : `Recorded approval #${value}`}</p>
    <ReadState state={state} />{approvals.map(event => <article key={event.id} className={styles.panel}>
      <label><input type="radio" name={basisGroup} checked={String(value) === String(event.id)} onChange={() => onChange(String(event.id))} />Use retained approval #{event.id}</label><Attribution at={event.occurredAt} actor={event.actor} />
      <details><summary>Inspect retained approval #{event.id}</summary><HistorySnapshot value={event.after} /></details>
    </article>)}{state.data && !approvals.length && <p>No approvals on this history page. Check earlier pages or explicitly choose the unapproved observation.</p>}
    <Pagination data={state.data} page={page} setPage={setPage} label="approval history" disabled={state.loading} />
  </section>;
}
