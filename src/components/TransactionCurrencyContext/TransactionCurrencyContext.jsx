import React from "react";
import { fundingCurrencyLabel } from "../../utils/transactionFunding";

export default function TransactionCurrencyContext({ event }) {
  if (event.entityType !== "TRANSACTION") return null;
  const context = event.transactionCurrencyContext;
  if (!context) return <p>Historical currency observation not recorded.</p>;
  if (context.version !== 1) return <p>Currency observation uses an unsupported format.</p>;
  const label = (observation) => `${fundingCurrencyLabel(observation)}${observation?.budgetId != null ? ` · Budget #${observation.budgetId}` : ""}`;
  return <details><summary>Budget currency observed at this event: {label(context.current)}</summary>
    {context.previous && <p>Before: {label(context.previous)}</p>}
    <p>After: {label(context.current)}</p>
    <p>This records the budget configuration at the event, not verified historical denomination.</p>
  </details>;
}
