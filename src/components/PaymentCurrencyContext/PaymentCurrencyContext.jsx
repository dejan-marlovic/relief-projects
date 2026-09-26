import React from "react";
import { summaryText, issueText } from "../../utils/paymentFunding";
export default function PaymentCurrencyContext({ event }) {
  if (!["PAYMENT_ORDER", "PAYMENT_ORDER_LINE"].includes(event.entityType)) return null;
  const context = event.paymentCurrencyContext;
  if (!context) return <p>Historical payment currency observation not recorded.</p>;
  if (context.version !== 1) return <p>Payment currency observation uses an unsupported format.</p>;
  const describe = value => `${summaryText(value)}${value?.projectId != null ? ` · Project #${value.projectId}` : ""}${value?.issues?.length ? ` · ${issueText(value.issues)}` : ""}`;
  return <details><summary>Payment currency observed at this event</summary>
    {context.previous && <p>Before: {describe(context.previous)}</p>}
    <p>After: {describe(context.current)}</p>
    <p>Budget configuration recorded at the event, not verified historical denomination or settlement.</p>
  </details>;
}
