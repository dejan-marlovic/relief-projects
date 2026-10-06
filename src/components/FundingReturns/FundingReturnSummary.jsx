import React from "react";
import { receiptMoney } from "../../utils/fundingReceipts";
import styles from "../FundingReceipts/FundingReceipts.module.scss";

export default function FundingReturnSummary({ summary }) {
  if (!summary) return <p className={styles.hint}>Return information unavailable. This does not mean no funds were returned.</p>;
  return <section aria-label="Recorded returns summary">
    <h4>Returned to financier and net retained</h4>
    <p className={styles.hint}>Recorded principal only, not spending capacity or a bank balance. Gross receipt comparisons remain unchanged. Totals cover all pages; do not add receipt subtotals to transaction totals.</p>
    <p>{summary.status?.replaceAll("_", " ")} · {summary.recordedCount ?? "Unknown"} recorded returns · {summary.voidedCount ?? "Unknown"} voided</p>
    <dl className={styles.totals}>{[["Gross received", summary.grossReceived], ["Returned to financier", summary.returnedToFinancier], ["Net retained", summary.netRetained]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{receiptMoney(amount)}</dd></div>)}</dl>
    {summary.totalsByCurrency?.map(group => <p key={group.currencyId}>{group.recordedLabel || "Currency"} (#{group.currencyId}): Gross {receiptMoney(group.grossReceived)} · Returned {receiptMoney(group.returnedToFinancier)} · Net {receiptMoney(group.netRetained)}</p>)}
    {summary.issues?.map((issue, index) => <p key={index}>{issue.message || issue.code}</p>)}
    <p className={styles.hint}>Zero means no recorded amount; it does not confirm that no bank movement occurred. Net retained does not determine what the financier owes.</p>
  </section>;
}
