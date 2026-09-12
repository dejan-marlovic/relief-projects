export const AUDIT_ACTION_LABELS = {
  CREATE: "Created",
  UPDATE: "Updated",
  SUBMIT: "Submitted",
  APPROVE: "Approved",
  RETURN: "Returned",
  DELETE: "Deleted",
  RESTORE: "Restored",
};

export const hasAuditTransition = (event) =>
  event.entityType !== "PAYMENT_ORDER_LINE" &&
  !["CREATE", "UPDATE", "DELETE", "RESTORE"].includes(event.action) &&
  Boolean(event.previousState && event.newState);

export const auditActionLabel = (event) => {
  const label = AUDIT_ACTION_LABELS[event.action] || event.action || "—";
  if (event.entityType !== "PAYMENT_ORDER_LINE") return label;
  const moved = event.previousParentPaymentOrderId != null && event.parentPaymentOrderId != null &&
    String(event.previousParentPaymentOrderId) !== String(event.parentPaymentOrderId);
  return `Line #${event.entityId} ${moved ? "moved" : label.toLowerCase()}`;
};

export const uniqueAuditEvents = (events) => {
  const seen = new Set();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
};
