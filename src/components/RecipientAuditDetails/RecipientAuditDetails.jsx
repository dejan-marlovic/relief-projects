import React from "react";
import AuditFieldChanges, { formatFieldValue } from "../AuditFieldChanges/AuditFieldChanges";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function RecipientAuditDetails({ event }) {
  const context = event.recipientContext;
  const moved = event.previousParentPaymentOrderId != null && event.parentPaymentOrderId != null &&
    String(event.previousParentPaymentOrderId) !== String(event.parentPaymentOrderId);
  return <div className={styles.details}>
    <p>{moved ? `Moved from payment order #${event.previousParentPaymentOrderId} to #${event.parentPaymentOrderId}`
      : event.parentPaymentOrderId != null ? `Payment order #${event.parentPaymentOrderId}` : "Payment order not recorded"}</p>
    {!context ? <p>No recipient context recorded.</p> : context.version !== 1 ? <p>Recipient context uses an unsupported format.</p> :
      <dl className={styles.context} aria-label="Recipient context">
        {[["Organization", context.organization, "REFERENCE"]].map(([label, value, type]) =>
          <div key={label}><dt>{label}</dt><dd>{formatFieldValue(value, type)}</dd></div>)}
      </dl>}
    {event.action === "UPDATE" && <div className={styles.changes}><AuditFieldChanges event={event} /></div>}
  </div>;
}
