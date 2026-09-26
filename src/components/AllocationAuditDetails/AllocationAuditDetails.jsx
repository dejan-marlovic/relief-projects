import React from "react";
import AuditFieldChanges, { formatFieldValue } from "../AuditFieldChanges/AuditFieldChanges";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function AllocationAuditDetails({ event }) {
  const context = event.allocationContext;
  const moved = event.previousParentTransactionId != null && event.parentTransactionId != null &&
    String(event.previousParentTransactionId) !== String(event.parentTransactionId);
  const hasChanges = event.action === "UPDATE" || (event.action === "RESTORE" &&
    (event.fieldChangesVersion != null || event.fieldChanges?.length > 0));
  return <div className={styles.details}>
    <p>{moved ? `Moved from transaction #${event.previousParentTransactionId} to #${event.parentTransactionId}`
      : event.parentTransactionId != null ? `Transaction #${event.parentTransactionId}` : "Transaction not recorded"}</p>
    {!context ? <p>No allocation context recorded.</p> : context.version !== 1 ? <p>Allocation context uses an unsupported format.</p> :
      <dl className={styles.context} aria-label="Allocation context">
        {[["Cost detail", context.costDetail, "REFERENCE"], ["Planned amount", context.plannedAmount, "DECIMAL"]].map(([label, value, type]) =>
          <div key={label}><dt>{label}</dt><dd>{formatFieldValue(value, type)}</dd></div>)}
      </dl>}
    {hasChanges && <div className={styles.changes}><AuditFieldChanges event={event} /></div>}
  </div>;
}
