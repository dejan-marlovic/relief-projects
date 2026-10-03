export const fields = { rationale: "Rationale and need", feasibilitySummary: "Feasibility and capacity", riskConsiderations: "Risk considerations", notes: "Notes" };
export const commands = {
  create: ["Create assessment", "canCreate"], edit: ["Edit assessment", "canEdit"],
  submit: ["Submit for approval", "canSubmit"], approve: ["Approve assessment", "canApprove"],
  return: ["Return for changes", "canReturn"], "withdraw-submission": ["Withdraw submission", "canWithdrawSubmission"],
  "withdraw-approval": ["Withdraw approval", "canWithdrawApproval"], evidence: ["Link supporting document", "canLinkEvidence"],
  "evidence-remove": ["Remove evidence association", "canRemove"], delete: ["Delete assessment", "canDelete"], restore: ["Restore assessment", "canRestore"],
};
export const draftFrom = record => ({ ...Object.fromEntries(Object.keys(fields).map(key => [key, record?.[key] || ""])), recommendation: record?.recommendation || "", reason: "", note: "", evidenceGapExplanation: "", purpose: "ASSESSMENT", documentId: null });
export function assessmentPayload(action, draft, record) {
  const clean = key => draft[key]?.trim() || null;
  const check = (key, max, required = false) => { const value = clean(key); if ((required && !value) || (value && [...value].length > max)) throw new Error(`${fields[key] || key}: ${required ? "enter 1–" : "maximum "}${max} characters.`); return value; };
  let body = {};
  if (["create", "edit"].includes(action)) {
    body = Object.fromEntries(Object.keys(fields).map(key => [key, check(key, key === "notes" ? 2000 : 4000)]));
    body.recommendation = draft.recommendation || null;
    if (action === "edit") body.reason = check("reason", 1000, !!record?.currentSubmission);
  } else if (["submit", "approve"].includes(action)) {
    body.note = check("note", 1000, action === "approve");
    if (action === "approve") body.evidenceGapExplanation = check("evidenceGapExplanation", 1000, record?.requiresEvidenceGapExplanation);
  } else if (action === "evidence") {
    if (!Number.isSafeInteger(draft.documentId) || draft.documentId <= 0) throw new Error("Select an available exact document version.");
    body = { documentId: draft.documentId, purpose: draft.purpose };
  } else body.reason = check("reason", 1000, true);
  return body;
}
