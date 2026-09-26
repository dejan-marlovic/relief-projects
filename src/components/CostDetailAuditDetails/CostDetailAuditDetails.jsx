import React from "react";
import AuditFieldChanges, { formatFieldValue } from "../AuditFieldChanges/AuditFieldChanges";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

function CurrencyConfiguration({ value, label }) {
  return <details><summary>{label}</summary>
    <dl className={styles.context}>
      {[["Local", "local"], ["Reporting (SEK field)", "reporting"], ["GBP", "gbp"], ["EUR", "euro"]].map(([name, key]) =>
        <div key={key}><dt>{name}</dt><dd>{formatFieldValue(value?.[key], "REFERENCE")}</dd></div>)}
    </dl>
    <p>Configuration recorded at this event; it does not establish how stored amounts were converted.</p>
  </details>;
}

export default function CostDetailAuditDetails({ event }) {
  const context = event.costDetailContext;
  const moved = event.previousParentBudgetId != null && event.parentBudgetId != null &&
    String(event.previousParentBudgetId) !== String(event.parentBudgetId);
  return <div className={styles.details}>
    <p>{moved ? `Moved from budget #${event.previousParentBudgetId} to #${event.parentBudgetId}`
      : event.parentBudgetId != null ? `Budget #${event.parentBudgetId}` : "Budget not recorded"}</p>
    {!context ? <p>No cost-detail context recorded.</p> : context.version !== 1 ? <p>Cost-detail context uses an unsupported format.</p> : <>
      <dl className={styles.context} aria-label="Cost-detail context">
        {[["Type", context.costType, "REFERENCE"], ["Category", context.cost, "REFERENCE"],
          ["Description", context.costDescription, "TEXT"], ["Local amount", context.amountLocalCurrency, "DECIMAL"],
          ["Reporting amount (SEK field)", context.amountReportingCurrency, "DECIMAL"],
          ["GBP amount", context.amountGBP, "DECIMAL"], ["EUR amount", context.amountEuro, "DECIMAL"]].map(([label, value, type]) =>
          <div key={label}><dt>{label}</dt><dd>{formatFieldValue(value, type)}</dd></div>)}
      </dl>
      <CurrencyConfiguration value={context.configuredCurrencies} label="Recorded currency configuration" />
      {(moved || context.previousConfiguredCurrencies) && <CurrencyConfiguration value={context.previousConfiguredCurrencies} label="Previous budget currency configuration" />}
    </>}
    {event.action === "UPDATE" && <div className={styles.changes}><AuditFieldChanges event={event} /></div>}
  </div>;
}
