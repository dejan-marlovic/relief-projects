export const AUDIT_ACTION_LABELS = {
  SUBMIT: "Submitted",
  APPROVE: "Approved",
  RETURN: "Returned",
  DELETE: "Deleted",
  RESTORE: "Restored",
};

export const hasAuditTransition = (event) =>
  event.action !== "DELETE" && event.action !== "RESTORE" &&
  Boolean(event.previousState && event.newState);
