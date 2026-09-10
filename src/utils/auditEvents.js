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
  !["CREATE", "UPDATE", "DELETE", "RESTORE"].includes(event.action) &&
  Boolean(event.previousState && event.newState);
