import React from "react";
import { uploadTimeLabel } from "../../utils/documentMetadata";
import styles from "./ActivityHistory.module.scss";

export function HistoryTimeline({ children, ...props }) {
  return <ol className={styles.timeline} {...props}>{children}</ol>;
}
export function HistoryEntry({ title, at, actor, children, references, metadata, context }) {
  return <li><details className={styles.entry}>
    <summary><strong>{title}</strong><span className={styles.meta}><time dateTime={at || undefined}>{at ? uploadTimeLabel(at) : "Time not recorded"}</time>{actor && <> · <span>{actor}</span></>}</span>{context && <span className={styles.meta}>{context}</span>}</summary>
    {metadata && <p className={styles.meta}>{metadata}</p>}
    {children}
    {references && <details className={styles.full}><summary>Full recorded details and references</summary>{references}</details>}
  </details></li>;
}

// Only summarise known narrative fields. Domain snapshot renderers retain the
// full evidence, relationships and decision context; never dump arbitrary JSON.
const fields = {
  title: "Title", description: "Description", mitigationPlan: "Mitigation plan",
  ownerName: "Responsible employee", reviewDate: "Review date", likelihood: "Likelihood", impact: "Impact",
  status: "Status", state: "State", closureReason: "Closure reason", reason: "Reason",
  capacitySummary: "Capacity summary", financialControlsSummary: "Financial controls", governanceSummary: "Governance", decisionExplanation: "Decision explanation", evidenceGapExplanation: "Evidence gap explanation", recommendation: "Recommendation", note: "Note", response: "Response", name: "Name",
  targetValue: "Target value", baselineValue: "Baseline value", isDeleted: "Deleted",
  suitabilitySummary: "Suitability for this role", materialConcerns: "Material concerns", notes: "Notes",
  rationale: "Rationale and need", feasibilitySummary: "Feasibility and capacity", riskConsiderations: "Risk considerations",
  purpose: "Purpose", destination: "Destination", departureDate: "Departure date", returnDate: "Return date",
  actualDepartureDate: "Actual departure date", actualReturnDate: "Actual return date", outcome: "Outcome",
  outcomeSummary: "Outcome summary", materialDifferences: "Material differences", explanation: "Explanation",
  definition: "Definition", unit: "Unit", direction: "Target direction", value: "Reported value", asOfDate: "Reporting date",
  periodStart: "Reporting starts", periodEnd: "Reporting ends", baselineKnown: "Baseline known", baselineDate: "Baseline date",
  ownerEmployeeId: "Responsible employee reference",

};
const valueLabel = value => value == null || value === "" ? "Not recorded" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
export function SnapshotHistoryEntry({ event, title, Snapshot, children }) {
  const before = event.before, after = event.after;
  const beforeFields = before ? { ...before, ...(before.fields || {}) } : null;
  const afterFields = after ? { ...after, ...(after.fields || {}) } : null;
  const changes = Object.entries(fields).filter(([key]) =>
    (Object.prototype.hasOwnProperty.call(beforeFields || {}, key) || Object.prototype.hasOwnProperty.call(afterFields || {}, key)) &&
    (beforeFields?.[key] == null || typeof beforeFields[key] !== "object") && (afterFields?.[key] == null || typeof afterFields[key] !== "object") &&
    beforeFields?.[key] !== afterFields?.[key]);
  const actionTitle = ({ CREATE: "Created", UPDATE: "Details changed", SUBMIT: "Submitted", APPROVE: "Approved", RETURN: "Returned", DELETE: "Deleted", RESTORE: "Restored", REOPEN: "Reopened", CLOSE: "Closed", VOID: "Voided" })[event.action] || (typeof title === "string" ? title.charAt(0).toUpperCase() + title.slice(1) : title);
  return <HistoryEntry title={actionTitle} at={event.occurredAt}
    actor={event.actor?.employeeName || event.actor?.username || "Actor not recorded"}
    metadata={<>Revision {event.revision ?? "not recorded"}</>}
    references={<><p>Entry #{event.id}{event.actor?.username && <> · Account: {event.actor.username}</>}{event.actor?.userId != null && <> · Account #{event.actor.userId}</>}</p><h5>Before</h5><Snapshot value={before} /><h5>After</h5><Snapshot value={after} />{children}</>}>
    {event.reason && <p>Reason: {event.reason}</p>}
    {changes.map(([key, label]) => <div className={styles.change} key={key}><strong>{label}</strong>{before && <p><b>Before: </b>{valueLabel(beforeFields[key])}</p>}<p><b>{before ? "After" : event.action === "CREATE" ? "Initial value" : "Recorded value"}: </b>{valueLabel(afterFields?.[key])}</p></div>)}
    {!changes.length && <p>Expand the full recorded details to review this change.</p>}
  </HistoryEntry>;
}

export function HistoryPagination({ page, totalPages, totalElements, onPage, disabled = false, displayedPage = page }) {
  return <div className={styles.pagination}>
    <button type="button" disabled={disabled || page <= 0} onClick={() => onPage(page - 1)}>Newer history</button>
    <span>{totalElements ?? "…"} recorded changes · Page {totalPages ? displayedPage + 1 : 0} of {totalPages ?? "…"}</span>
    <button type="button" disabled={disabled || totalPages == null || page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Older history</button>
    {page > 0 && <button type="button" disabled={disabled} onClick={() => onPage(0)}>Latest history</button>}
  </div>;
}
