export const fields = { capacitySummary: "Capacity", suitabilitySummary: "Suitability for this role", materialConcerns: "Material concerns", notes: "Notes" };
export const commands = {
  create: ["Create assessment", "canCreate"], edit: ["Edit assessment", "canEdit"],
  submit: ["Submit for review", "canSubmit"], review: ["Record independent review", "canReview"],
  return: ["Return for changes", "canReturn"], "withdraw-submission": ["Withdraw submission", "canWithdrawSubmission"],
  "withdraw-review": ["Withdraw review", "canWithdrawReview"], evidence: ["Link supporting document", "canLinkEvidence"],
  "evidence-remove": ["Remove evidence association", "canRemove"], delete: ["Delete assessment", "canDelete"], restore: ["Restore assessment", "canRestore"],
};
export const draftFrom = record => ({ ...Object.fromEntries(Object.keys(fields).map(key => [key, record?.[key] || ""])), decision: "", decisionExplanation: "", reason: "", note: "", evidenceGapExplanation: "", purpose: "ASSESSMENT", documentId: null });
export function assessmentPayload(action, draft, record) {
  const clean = key => draft[key]?.trim() || null;
  const check = (key, max, required = false) => { const value = clean(key); if ((required && !value) || (value && [...value].length > max)) throw new Error(`${fields[key] || key}: ${required ? "enter 1–" : "maximum "}${max} characters.`); return value; };
  let body = {};
  if (["create", "edit"].includes(action)) {
    body = Object.fromEntries(Object.keys(fields).map(key => [key, check(key, key === "notes" ? 2000 : 4000)]));
    if (action === "edit") body.reason = check("reason", 1000, !!record?.currentSubmission);
  } else if (action === "submit") {
    body.note = check("note", 1000);
  } else if (action === "review") {
    if (!["SUITABLE_FOR_STATED_ROLE", "NOT_RECOMMENDED_FOR_STATED_ROLE"].includes(draft.decision)) throw new Error("Select a review outcome.");
    body = { decision: draft.decision, decisionExplanation: check("decisionExplanation", 2000, true), evidenceGapExplanation: check("evidenceGapExplanation", 1000, record?.requiresEvidenceGapExplanation) };
  } else if (action === "evidence") {
    if (!Number.isSafeInteger(draft.documentId) || draft.documentId <= 0) throw new Error("Select an available exact document version.");
    body = { documentId: draft.documentId, purpose: draft.purpose };
  } else body.reason = check("reason", 1000, true);
  return body;
}

export const decisionLabel = value => ({ SUITABLE_FOR_STATED_ROLE: "Suitable for the stated role", NOT_RECOMMENDED_FOR_STATED_ROLE: "Not recommended for the stated role" }[value] || "No current recorded outcome");
