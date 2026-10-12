// Tab-local recovery only; these drafts never represent a recorded decision.
export function assessmentDraftKey(relationshipId, action, linkId) {
  try {
    const token = localStorage.getItem("authToken");
    const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!claims.sub) return null;
    return `organisation-assessment-draft:${encodeURIComponent(claims.sub)}:${relationshipId}:${action}:${linkId || ""}`;
  } catch { return null; }
}
export function readAssessmentDraft(key) {
  try {
    const value = key && JSON.parse(sessionStorage.getItem(key));
    return value && typeof value.draft === "object" && value.draft !== null ? value : null;
  } catch { return null; }
}
export function storeAssessmentDraft(key, form) {
  try {
    if (!key) return false;
    sessionStorage.setItem(key, JSON.stringify({ draft: form.draft, expectedRevision: form.expectedRevision, reviewRequired: form.reviewRequired }));
    return true;
  } catch { return false; }
}
export function clearAssessmentDraft(key) {
  try { if (key) sessionStorage.removeItem(key); } catch { /* Recovery storage may be unavailable. */ }
}
