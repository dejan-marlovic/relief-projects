export const reportCommands = {
  edit: ["Edit report", "canEdit"], basis: ["Change report plan basis", "canChangeBasis"],
  submit: ["Submit report for review", "canSubmit"], accept: ["Accept report", "canAccept"],
  return: ["Return report for changes", "canReturn"], reopen: ["Reopen accepted report", "canReopen"],
  delete: ["Delete report", "canDelete"], restore: ["Restore report", "canRestore"],
  evidence: ["Link report document", "canAddEvidence"], actions: ["Link report follow-up", "canLinkAction"],
};
export const reportTitles = { ...Object.fromEntries(Object.entries(reportCommands).map(([key, value]) => [key, value[0]])), create: "Create post-trip report", "evidence-remove": "Remove report document link", "actions-remove": "Remove report follow-up link" };
export const reportDraft = (record = {}) => ({
  outcome: record.outcome ?? "", actualDepartureDate: record.actualDepartureDate ?? "", actualReturnDate: record.actualReturnDate ?? "",
  outcomeSummary: record.outcomeSummary ?? "", materialDifferences: record.materialDifferences == null ? "" : String(record.materialDifferences), explanation: record.explanation ?? "",
  basisApprovalId: "", reason: "", note: "",
});
export function reportPayload({ action, draft, record, link }) {
  const text = (key, max, required = false) => {
    const value = (draft[key] || "").trim();
    if ((required && !value) || [...value].length > max) throw new Error(`Enter ${key} ${required ? "of 1" : "of up"} to ${max.toLocaleString()} characters.`);
    return value || null;
  };
  const positiveId = (value, name) => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Select ${name}.`);
    return id;
  };
  const body = {};
  if (["create", "edit"].includes(action)) {
    if (draft.outcome && !["COMPLETED", "PARTIALLY_COMPLETED", "NOT_TAKEN"].includes(draft.outcome)) throw new Error("Select a report outcome.");
    if (!["", "true", "false"].includes(draft.materialDifferences)) throw new Error("Assess material differences explicitly.");
    Object.assign(body, { outcome: draft.outcome || null, actualDepartureDate: draft.actualDepartureDate || null, actualReturnDate: draft.actualReturnDate || null,
      outcomeSummary: text("outcomeSummary", 4000), materialDifferences: draft.materialDifferences === "" ? null : draft.materialDifferences === "true", explanation: text("explanation", 2000) });
    if (body.outcome === "NOT_TAKEN" && (body.actualDepartureDate || body.actualReturnDate)) throw new Error("Clear both actual dates for travel not taken.");
    if (body.actualDepartureDate && body.actualReturnDate && body.actualReturnDate < body.actualDepartureDate) throw new Error("Actual return must be on or after departure.");
  }
  if (["create", "basis"].includes(action)) {
    if (draft.basisApprovalId === "") throw new Error("Explicitly choose a retained approval or an unapproved plan observation.");
    body.basisApprovalId = draft.basisApprovalId === "unapproved" ? null : positiveId(draft.basisApprovalId, "a retained approval");
  }
  if (["submit", "accept"].includes(action)) body.note = text("note", 1000, action === "accept");
  if (["accept", "return"].includes(action)) body.expectedSubmissionId = positiveId(record.currentSubmission?.id, "the current report submission");
  if (action === "reopen") body.expectedAcceptanceId = positiveId(record.currentAcceptance?.id, "the current report acceptance");
  if (["basis", "return", "reopen", "delete", "restore", "evidence-remove", "actions-remove"].includes(action) || action === "edit") {
    body.reason = text("reason", 1000, action !== "edit" || !!record?.currentSubmission);
  }
  if (action === "evidence") body.documentId = positiveId(draft.documentId, "an exact document version");
  if (action === "actions") {
    body.followUpId = positiveId(draft.followUp?.id, "an existing follow-up");
    if (!Number.isSafeInteger(draft.followUp.revision) || draft.followUp.revision < 0) throw new Error("Refresh and select a current follow-up revision.");
    body.expectedFollowUpRevision = draft.followUp.revision;
  }
  if (action.endsWith("-remove")) positiveId(link?.id, "an association");
  return body;
}
