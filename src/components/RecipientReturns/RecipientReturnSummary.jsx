import React from "react";
import { paymentMoney } from "../../utils/outgoingPayments";
import styles from "../FundingReceipts/FundingReceipts.module.scss";

export default function RecipientReturnSummary({ summary }) {
  if (!summary) return <p className={styles.hint}>Return information unavailable. This does not mean no funds were returned.</p>;
  return <section aria-label="Recorded returns summary">
    <h4>Returned from recipient and net paid</h4>
    <p className={styles.hint}>Recorded principal only, not spending capacity or a bank balance. Gross payment comparisons remain unchanged. Totals cover all pages; do not add payment subtotals to order totals.</p>
    <p>{summary.status?.replaceAll("_", " ")} · {summary.recordedCount ?? "Unknown"} recorded returns · {summary.voidedCount ?? "Unknown"} voided</p>
    <dl className={styles.totals}>{[["Gross paid", summary.grossPaid], ["Returned from recipient", summary.returnedFromRecipient], ["Net paid — not spending capacity", summary.netPaid]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{paymentMoney(amount)}</dd></div>)}</dl>
    {summary.totalsByCurrency?.map(group => <p key={group.currencyId}>{group.recordedLabel || "Currency"} (#{group.currencyId}): Gross {paymentMoney(group.grossPaid)} · Returned {paymentMoney(group.returnedFromRecipient)} · Net {paymentMoney(group.netPaid)}</p>)}
    {summary.issues?.map((issue, index) => <p key={index}>{issue.message || issue.code}</p>)}
    <p className={styles.hint}>Zero means no recorded amount; it does not confirm that no bank movement occurred. Net paid does not authorise another payment.</p>
  </section>;
}
