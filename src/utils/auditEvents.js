export const AUDIT_ACTION_LABELS = {
  CREATE: "Created",
  SUBMIT: "Submitted",
  APPROVE: "Approved",
  RETURN: "Returned",
  DELETE: "Deleted",
  RESTORE: "Restored",
};

export const hasAuditTransition = (event) =>
  !["CREATE", "DELETE", "RESTORE"].includes(event.action) &&
  Boolean(event.previousState && event.newState);
