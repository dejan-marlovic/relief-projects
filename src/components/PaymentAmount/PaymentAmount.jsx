import React from "react";
import { exactAmount, summaryAmount, summaryText, issueText } from "../../utils/paymentFunding";
import styles from "./PaymentAmount.module.scss";
export default function PaymentAmount({ record, line = false, showAmount = true }) {
  const observation = record?.amountCurrency;
  const summary = record?.amountSummary;
  return <div className={styles.amount}>
    {showAmount && <span>{exactAmount(line ? record?.amount : summaryAmount(record))}</span>}
    <small title="Current budget configuration, not verified historical denomination.">{line
      ? observation?.availability === "AVAILABLE" && observation?.currency?.id != null
        ? `Current: ${observation.currency.name || "Currency"} (#${observation.currency.id})`
        : `Currency unavailable · ${observation?.availability || "Not recorded"}`
      : `Current: ${summaryText(summary)}`}</small>
    {!line && summary?.issues?.length > 0 && <details><summary>Amount issues</summary><p>{issueText(summary.issues)}</p></details>}
  </div>;
}
