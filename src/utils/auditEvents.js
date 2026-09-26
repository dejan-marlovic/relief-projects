export const AUDIT_ACTION_LABELS = {
  CREATE: "Created",
  VOID: "Voided",
  UPDATE: "Updated",
  SUBMIT: "Submitted",
  APPROVE: "Approved",
  RETURN: "Returned",
  DELETE: "Deleted",
  RESTORE: "Restored",
};

export const hasAuditTransition = (event) =>
  !["FUNDING_RECEIPT", "PAYMENT_ORDER_LINE", "COST_DETAIL_ALLOCATION", "COST_DETAIL", "SIGNATURE", "RECIPIENT"].includes(event.entityType) &&
  !["CREATE", "UPDATE", "DELETE", "RESTORE"].includes(event.action) &&
  Boolean(event.previousState && event.newState);

export const auditActionLabel = (event) => {
  const label = AUDIT_ACTION_LABELS[event.action] || event.action || "—";
  if (event.entityType === "FUNDING_RECEIPT") return `Funding receipt #${event.entityId} ${label.toLowerCase()}`;
  if (event.entityType === "COST_DETAIL") {
    const moved = event.previousParentBudgetId != null && event.parentBudgetId != null &&
      String(event.previousParentBudgetId) !== String(event.parentBudgetId);
    return `Cost detail #${event.entityId} ${moved ? "moved" : label.toLowerCase()}`;
  }
  if (event.entityType === "COST_DETAIL_ALLOCATION") {
    const moved = event.previousParentTransactionId != null && event.parentTransactionId != null &&
      String(event.previousParentTransactionId) !== String(event.parentTransactionId);
    const action = moved ? (event.action === "RESTORE" ? "restored and moved" : "moved")
      : event.action === "CREATE" ? "added" : label.toLowerCase();
    return `Allocation #${event.entityId} ${action}`;
  }
  if (!["PAYMENT_ORDER_LINE", "SIGNATURE", "RECIPIENT"].includes(event.entityType)) return label;
  const moved = event.previousParentPaymentOrderId != null && event.parentPaymentOrderId != null &&
    String(event.previousParentPaymentOrderId) !== String(event.parentPaymentOrderId);
  return `${event.entityType === "RECIPIENT" ? "Recipient" : event.entityType === "SIGNATURE" ? "Signature" : "Line"} #${event.entityId} ${moved ? "moved" : label.toLowerCase()}`;
};

export const uniqueAuditEvents = (events) => {
  const seen = new Set();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
};
