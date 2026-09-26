import React from "react";
import AuditFieldChanges, { formatFieldValue } from "../AuditFieldChanges/AuditFieldChanges";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function SignatureAuditDetails({ event }) {
  const context = event.signatureContext;
  const moved = event.previousParentPaymentOrderId != null && event.parentPaymentOrderId != null &&
    String(event.previousParentPaymentOrderId) !== String(event.parentPaymentOrderId);
  return <div className={styles.details}>
    <p>{moved ? `Moved from payment order #${event.previousParentPaymentOrderId} to #${event.parentPaymentOrderId}`
      : event.parentPaymentOrderId != null ? `Payment order #${event.parentPaymentOrderId}` : "Payment order not recorded"}</p>
    {!context ? <p>No signature context recorded.</p> : context.version !== 1 ? <p>Signature context uses an unsupported format.</p> :
      <dl className={styles.context} aria-label="Signature context">
        {[["Signature status", context.signatureStatus, "REFERENCE"], ["Named signer", context.employee, "REFERENCE"],
          ["Signature date", context.signatureDate, "LOCAL_DATETIME"]].map(([label, value, type]) =>
          <div key={label}><dt>{label}</dt><dd>{formatFieldValue(value, type)}</dd></div>)}
      </dl>}
    {event.action === "UPDATE" && <div className={styles.changes}><AuditFieldChanges event={event} /></div>}
  </div>;
}
