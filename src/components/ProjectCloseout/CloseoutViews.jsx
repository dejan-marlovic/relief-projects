import React from "react";
import styles from "./ProjectCloseout.module.scss";
export const readable = value => value ? String(value).toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase()) : "Not recorded";
export const stamp = value => value ? new Date(value).toLocaleString() : "Not recorded";
const attribution = value => value?.recordedAt ? `${stamp(value.recordedAt)} · ${value.recordedBy?.username || "Unknown user"}` : "Not recorded";
const evidenceNames = list => list?.length ? list.map(item => `${item.capturedName || "Document"} (#${item.documentId})`).join(", ") : "None";
export function DecisionSnapshot({ value }) {
  if (!value) return <p>No decision recorded.</p>;
  const a = value.acceptance || {}, c = value.closure, archive = value.archive || {};
  return <dl className={styles.fields}>
    <dt>Acceptance</dt><dd>{readable(a.status)}{a.acceptedDate && ` · ${a.acceptedDate} · ${a.acceptedByLabel}`}{a.notApplicableReason && ` · ${a.notApplicableReason}`}</dd>
    <dt>Acceptance recorded</dt><dd>{attribution(a)}</dd><dt>Selected evidence</dt><dd>{evidenceNames(value.acceptanceEvidenceLabels)}</dd>
    <dt>Administrative closeout</dt><dd>{value.closeoutStatus === "CLOSED" ? "Administrative closeout recorded" : value.closeoutStatus === "REOPENED" ? "Reopened" : "No closeout decision recorded"}{value.closeoutReviewRequired && " · Review required"}</dd>
    {c && <><dt>Closeout date</dt><dd>{c.closedDate}</dd><dt>Closeout reason</dt><dd>{c.reason}</dd><dt>Closeout recorded</dt><dd>{attribution(c)}</dd><dt>Outstanding-item explanation</dt><dd>{c.outstandingReason || "None recorded"}</dd><dt>Acceptance relied on</dt><dd>{readable(c.acceptanceAtClose?.status)} · {c.acceptanceAtClose?.acceptedDate || c.acceptanceAtClose?.notApplicableReason || "—"} {c.acceptanceAtClose?.acceptedByLabel}</dd><dt>Evidence relied on</dt><dd>{evidenceNames(c.evidenceLabelsAtClose)}</dd></>}
    <dt>Archive assertion</dt><dd>{archive.status === "MARKED_ARCHIVED" ? "Marked archived" : "Not recorded"}{archive.reviewRequired && " · Review required"}</dd>
    {archive.status === "MARKED_ARCHIVED" && <><dt>Archive date</dt><dd>{archive.archivedDate}</dd><dt>Physical archive reference</dt><dd>{archive.physicalArchiveReference}</dd><dt>Digital archive reference</dt><dd>{archive.digitalArchiveReference}</dd><dt>Archive note</dt><dd>{archive.archiveNote || "None"}</dd><dt>Archive recorded</dt><dd>{attribution(archive)}</dd></>}
  </dl>;
}
export function Observation({ value }) {
  if (!value) return <p>Observation unavailable.</p>;
  const coverage = value.coverage || {}, financial = coverage.financial || {};
  return <div>
    <p><strong>{value.status === "NO_RECORDED_WARNINGS" ? "No recorded warnings" : "Attention required"}</strong> · Observed {stamp(value.observedAt)}</p>
    <p className={styles.hint}>This is an observation, not a completeness certificate. Decision state and readiness are read separately; other workflows can change afterwards.</p>
    {financial.status !== "COMPLETE" && <p role="alert">Financial coverage is partial or unavailable. Missing diagnostics do not mean there are no warnings.</p>}
    <dl className={styles.fields}>{[["Checklist coverage", readable(coverage.checklist)], ["Risk coverage", readable(coverage.risks)], ["Follow-up coverage", readable(coverage.followUps)], ["Financial coverage", `${readable(financial.status)} · ${financial.recordsAssessed ?? "Unknown"} assessed / ${financial.recordsConsidered ?? "Unknown"} considered`], ["Financial completion", "Not assessed by this feature"], ["Storage and filing contents", "Not checked"]].map(([label, text]) => <React.Fragment key={label}><dt>{label}</dt><dd>{text}</dd></React.Fragment>)}</dl>
    <ul>{value.warnings?.map((warning, index) => <li key={`${warning.code}-${index}`}><strong>{readable(warning.code)} ({warning.count})</strong>: {warning.message}</li>)}</ul>
  </div>;
}
export function FinancialRow({ row }) {
  if (row.coverage !== "COMPLETE") return <article className={styles.card}><h4>{readable(row.recordType)} · Restricted or unavailable</h4><p>Some diagnostics could not be assessed. This is not a zero-warning result.</p></article>;
  const s = row.summary || {}, payment = row.recordType === "PAYMENT", current = payment ? s.currentOrderConfiguration?.currency : s.currentFundingCurrency?.currency;
  const values = payment ? [["Paid",s.paidTotal],["Recipient commitments",s.recipientCommitment],["Recipient remaining",s.recipientRemaining],["Recipient excess",s.recipientExcess],["Order commitments",s.orderCommitment],["Order remaining",s.orderRemaining],["Order excess",s.orderExcess]] : [["Approved funding",s.approvedFunding],["Received",s.receivedTotal],["Remaining to receive",s.remainingToReceive],["Excess received",s.excessReceived]];
  return <article className={styles.card}><h4>{payment ? "Payment order" : "Transaction"} #{row.recordId} · {readable(row.status)}</h4><p>Current configuration: {current ? `${current.name} (#${current.id})` : "Currency unavailable"}</p>
    <dl className={styles.fields}>{values.map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value == null ? "Unavailable" : String(value)}</dd></React.Fragment>)}</dl>
    {s.totalsByCurrency?.map(t => <p key={t.currencyId}>Recorded {t.recordedLabel} (#{t.currencyId}): {String(t.amount)}</p>)}
    {payment && <p className={styles.hint}>Order remaining is not authorization to pay this recipient. This is an order-level diagnostic, not an amount attributed to this project.</p>}
    <ul>{s.issues?.map((issue,index) => <li key={index}>{issue.message || readable(issue.code)}</li>)}</ul>
  </article>;
}
