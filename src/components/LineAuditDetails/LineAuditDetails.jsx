import React from "react";
import AuditFieldChanges, { formatFieldValue } from "../AuditFieldChanges/AuditFieldChanges";
import styles from "./LineAuditDetails.module.scss";

export default function LineAuditDetails({ event }) {
  const context = event.lineContext;
  const moved = event.previousParentPaymentOrderId != null && event.parentPaymentOrderId != null &&
    String(event.previousParentPaymentOrderId) !== String(event.parentPaymentOrderId);
  return <div className={styles.details}>
    <p>{moved ? `Moved from payment order #${event.previousParentPaymentOrderId} to #${event.parentPaymentOrderId}`
      : event.parentPaymentOrderId != null ? `Payment order #${event.parentPaymentOrderId}` : "Payment order not recorded"}</p>
    {!context ? <p>No line context recorded.</p> : context.version !== 1 ? <p>Line context uses an unsupported format.</p> :
      <dl className={styles.context} aria-label="Line context">
        {[["Transaction", context.transaction, "REFERENCE"], ["Organization", context.organization, "REFERENCE"],
          ["Cost detail", context.costDetail, "REFERENCE"], ["Amount", context.amount, "DECIMAL"]].map(([label, value, type]) =>
          <div key={label}><dt>{label}</dt><dd>{formatFieldValue(value, type)}</dd></div>)}
      </dl>}
    {event.action === "UPDATE" && <div className={styles.changes}><AuditFieldChanges event={event} /></div>}
  </div>;
}
