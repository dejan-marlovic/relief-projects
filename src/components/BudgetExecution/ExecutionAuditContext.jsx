import React from "react";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function ExecutionAuditContext({ context }) {
  if (!context) return null;
  if (context.version !== 1) return <p>Execution context uses an unsupported format.</p>;
  const fields = [["Family", context.familyId], ["Executable budget", context.executableBudgetId],
    ["Execution decision", context.executionDecisionId], ["Original budget", context.originBudgetId],
    ["Target budget", context.targetBudgetId], ["Cost bucket", context.bucketId], ["Funding assignment", context.assignmentId]];
  return <section aria-label="Recorded execution context">
    <strong>Financial execution recorded at this event</strong>
    <dl className={styles.context}>
      {fields.map(([label, id]) => <div key={label}><dt>{label}</dt><dd>{id == null ? "Not recorded" : `#${id}`}</dd></div>)}
      <div><dt>Recorded currency</dt><dd>{context.currencyId == null ? "Not recorded" : `${context.capturedCurrencyName || "Currency"} (#${context.currencyId})`}</dd></div>
      {context.reason && <div><dt>Reason</dt><dd>{context.reason}</dd></div>}
    </dl>
    <p>Captured execution context; later activation does not rewrite this history.</p>
  </section>;
}
