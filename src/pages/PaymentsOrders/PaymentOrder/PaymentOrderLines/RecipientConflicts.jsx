import React from "react";
export default function RecipientConflicts({ conflicts = [] }) {
  if (!conflicts.length) return null;
  return <div role="alert"><strong>Recipient contribution needs attention</strong>
    <ul>{conflicts.map((conflict, index) => <li key={`${conflict.paymentOrderId}-${conflict.recipientId}-${index}`}>
      Payment order #{conflict.paymentOrderId} · Recipient #{conflict.recipientId} · Organization #{conflict.organizationId}
      <div>Current subtotal: {conflict.currentSubtotal} → Proposed subtotal: {conflict.proposedSubtotal}</div>
      <div>{conflict.reason === "POSITIVE_SUBTOTAL_REQUIRED" ? "A positive matching contribution must remain." : conflict.reason === "LEGACY_SUBTOTAL_WOULD_WORSEN" ? "An existing nonpositive subtotal cannot be reduced further." : `Conflict: ${conflict.reason || "Review required"}`}</div>
    </li>)}</ul>
    <p>Keep a sufficient matching contribution, or review the recipient in Recipients. Changing or removing it requires the usual permissions and an editable, unbooked order. These are numeric subtotals; unavailable currency does not mean zero.</p>
    <p>Your edit has not been saved. Refresh to review current saved data; your entered values will be kept. Nothing is retried automatically.</p>
  </div>;
}
