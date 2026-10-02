export { readManagement as readTravel, useManagementRead as useTravelRead, label } from "../Management/managementApi";

export const commands = {
  edit: ["Edit trip details", "canEdit"], submit: ["Submit for approval", "canSubmit"],
  approve: ["Approve travel", "canApprove"], return: ["Return for changes", "canReturn"],
  "withdraw-approval": ["Withdraw approval", "canWithdrawApproval"], cancel: ["Cancel travel request", "canCancel"],
  delete: ["Delete travel request", "canDelete"], restore: ["Restore travel request", "canRestore"],
  evidence: ["Link supporting document", "canAddEvidence"], actions: ["Link existing follow-up", "canLinkAction"],
};
export const titles = { ...Object.fromEntries(Object.entries(commands).map(([key, value]) => [key, value[0]])), create: "Create travel request", "actions-remove": "Remove action association", "evidence-remove": "Remove evidence association" };
export const tripDraft = (record = {}) => Object.fromEntries(["travellerEmployeeId", "purpose", "destination", "departureDate", "returnDate", "notes"].map(key => [key, record[key] ?? ""]));
export const employeeName = employee => employee.displayName || [employee.firstName, employee.lastName].filter(Boolean).join(" ") || `Employee #${employee.id}`;
export function travelPayload(form) {
  const { action, draft, record } = form;
  const length = value => [...(value || "").trim()].length;
  const required = (value, max, name) => { if (!length(value) || length(value) > max) throw new Error(`Enter ${name} of 1–${max.toLocaleString()} characters.`); };
  let body = {};
  if (["create", "edit"].includes(action)) {
    required(draft.purpose, 2000, "a purpose"); required(draft.destination, 300, "a destination");
    if (!Number.isSafeInteger(Number(draft.travellerEmployeeId)) || Number(draft.travellerEmployeeId) <= 0) throw new Error("Select a traveller.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.departureDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.returnDate) || draft.returnDate < draft.departureDate) throw new Error("Enter a valid date range; return must be on or after departure.");
    if (length(draft.notes) > 2000) throw new Error("Notes allow up to 2,000 characters.");
    body = { travellerEmployeeId: Number(draft.travellerEmployeeId), purpose: draft.purpose.trim(), destination: draft.destination.trim(), departureDate: draft.departureDate, returnDate: draft.returnDate, notes: draft.notes.trim() || null };
  }
  if (["approve", "submit"].includes(action)) {
    if (action === "approve") required(draft.note, 1000, "an approval note");
    if (length(draft.note) > 1000) throw new Error("Submission note allows up to 1,000 characters.");
    if (length(draft.note)) body.note = draft.note.trim();
  }
  if (["approve", "return"].includes(action)) body.expectedSubmissionId = record.currentSubmission.id;
  if (action === "withdraw-approval") body.expectedApprovalId = record.currentApproval.id;
  if (action === "actions") {
    if (!draft.followUp) throw new Error("Select the existing follow-up you reviewed.");
    body = { followUpId: draft.followUp.id, expectedFollowUpRevision: draft.followUp.revision, purpose: draft.actionPurpose };
  }
  if (action === "evidence") {
    if (!draft.documentId) throw new Error("Select an exact document version.");
    body = { documentId: draft.documentId };
  }
  const reasonRequired = ["return", "withdraw-approval", "cancel", "delete", "restore", "actions-remove", "evidence-remove"].includes(action) || (action === "edit" && !!record.currentSubmission);
  if (reasonRequired) { required(draft.reason, 1000, "a reason"); body.reason = draft.reason.trim(); }
  return body;
}
