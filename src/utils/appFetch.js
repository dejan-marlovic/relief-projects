import { BASE_URL } from "../config/api";
import { notifySuccess } from "./successNotifications";
const names = { projects:"Project", budgets:"Budget", transactions:"Transaction", "payment-orders":"Payment order", "payment-order-lines":"Payment line", recipients:"Recipient", signatures:"Signature", documents:"Document", organizations:"Organization", employees:"Employee", users:"User", "cost-details":"Cost detail", "cost-allocations":"Allocation", "follow-ups":"Follow-up", currencies:"Currency", "exchange-rates":"Exchange rate", sectors:"Sector", addresses:"Address", "bank-details":"Bank details", memos:"Memo", images:"Image", positions:"Position", branding:"Theme", "project-statuses":"Project status", "project-types":"Project type", "transaction-statuses":"Transaction status", "signature-statuses":"Signature status", "organization-statuses":"Organization status", "cost-types":"Cost type", costs:"Cost category" };
export function mutationNotice(input, options = {}, response) {
  const method = String(options.method || input?.method || "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method) || !response.ok) return null;
  let url, base;
  try { url = new URL(typeof input === "string" ? input : input.url, window.location.origin); base = new URL(BASE_URL || window.location.origin, window.location.origin); } catch { return null; }
  if (url.origin !== base.origin || !url.pathname.startsWith("/api/")) return null;
  const path = url.pathname;
  // Preview/read-like commands and authentication are handled by their caller.
  if (/\/(auth|preview|validate|search|download|export)(\/|$)/.test(path)) return null;
  // Bulk responses may contain individual failures; keep their detailed page feedback.
  if (path.includes("bulk")) return null;
  if (response.status === 202) return "Request accepted for processing.";
  const segments = path.slice(5).split("/");
  if (segments[0] === "project-organizations" && segments[2] === "assessment") {
    if (/\/remove$/.test(path)) return "Organisation assessment evidence link removed.";
    const notices = { submit: "Organisation assessment submitted for review.", review: "Organisation role review recorded.", return: "Organisation assessment returned for changes.", "withdraw-submission": "Organisation assessment submission withdrawn.", "withdraw-review": "Organisation role review withdrawn.", evidence: "Organisation assessment evidence linked.", delete: "Organisation assessment deleted; history retained.", restore: "Organisation assessment restored without reinstating a review." };
    return notices[segments[3]] || (method === "POST" ? "Organisation assessment created." : "Organisation assessment updated.");
  }
  if (segments[0] === "projects" && segments[2] === "follow-ups" && segments[4] === "progress") return "Follow-up progress updated.";
  if (segments[0] === "projects" && segments[2] === "assessment") {
    if (/\/remove$/.test(path)) return "Assessment evidence link removed.";
    const notices = { submit: "Assessment submitted for approval.", approve: "Assessment approval recorded.", return: "Assessment returned for changes.", "withdraw-submission": "Assessment submission withdrawn.", "withdraw-approval": "Assessment approval withdrawn.", evidence: "Assessment evidence linked.", delete: "Assessment deleted; history retained.", restore: "Assessment restored without reinstating approval." };
    return notices[segments[3]] || (method === "POST" ? "Assessment created." : "Assessment updated.");
  }
  if (segments[0] === "projects" && segments[2] === "travel-requests") {
    if (segments[4] === "report") {
      if (/\/remove$/.test(path)) return "Travel report association removed.";
      const reportNotices = { submit: "Travel report submitted for review.", accept: "Travel report accepted.", return: "Travel report returned for changes.", reopen: "Travel report reopened.", basis: "Report plan basis changed.", delete: "Travel report deleted.", restore: "Travel report restored.", evidence: "Document linked to travel report.", actions: "Follow-up linked to travel report." };
      return reportNotices[segments.at(-1)] || "Travel report saved.";
    }
    if (/\/remove$/.test(path)) return "Travel association removed.";
    const notices = { submit: "Travel request submitted.", approve: "Travel approval recorded.", return: "Travel request returned for changes.", "withdraw-approval": "Travel approval withdrawn.", cancel: "Travel request cancelled.", delete: "Travel request deleted.", restore: "Travel request restored.", actions: "Existing follow-up linked to travel.", evidence: "Supporting document linked to travel." };
    return notices[segments.at(-1)] || "Travel request saved.";
  }
  if (segments[0] === "projects" && segments[2] === "management-records") {
    if (/\/remove$/.test(path)) return "Management record association removed.";
    if (/\/actions$/.test(path)) return "Existing follow-up linked.";
    if (/\/evidence$/.test(path)) return "Supporting document linked.";
    if (/\/response$/.test(path)) return "Management response saved.";
    if (/\/reviews$/.test(path)) return "Management review recorded.";
    if (/\/resolve$/.test(path)) return "Management resolution recorded.";
    if (/\/reopen$/.test(path)) return "Management record reopened.";
    if (/\/delete$/.test(path)) return "Management record deleted.";
    if (/\/restore$/.test(path)) return "Management record restored.";
    return "Finding or lesson saved.";
  }
  if (segments[0] === "projects" && segments[2] === "indicators") {
    if (/\/remove$/.test(path)) return "Result evidence association removed.";
    if (segments.includes("evidence")) return "Result evidence linked.";
    if (/\/correct$/.test(path)) return "Result correction saved.";
    if (/\/void$/.test(path)) return "Result voided.";
    if (/\/delete$/.test(path)) return "Indicator deleted.";
    if (/\/restore$/.test(path)) return "Indicator restored.";
    return segments.includes("results") ? "Result recorded." : "Indicator saved.";
  }
  if (segments.includes("revision-funding-assignments")) return "Revision funding assignment saved.";
  if (segments.includes("execution-activations")) return "Budget execution activated or reaffirmed.";
  if (segments[0] === "budget-revision-families") return "Current planning budget selected.";
  if (segments[0] === "budget-donor-decisions" || segments[2] === "donor-decisions") return "Recorded donor decision updated.";
  if (segments[0] === "budgets" && segments[2] === "revisions") return "Planning revision created.";
  if (segments[0] === "projects" && segments[2] === "closeout") {
    if (/\/final-report-acceptance$/.test(path)) return "Final-report acceptance decision saved.";
    if (/\/archive\/revoke$/.test(path)) return "Archive marker revoked.";
    if (/\/archive$/.test(path)) return "Archive filing assertion saved.";
    if (/\/reopen$/.test(path)) return "Administrative closeout reopened.";
    return "Administrative closeout recorded.";
  }
  if (segments[0] === "projects" && segments[2] === "risks") {
    if (/\/close$/.test(path)) return "Risk closed.";
    if (/\/reopen$/.test(path)) return "Risk reopened.";
    if (/\/restore$/.test(path)) return "Risk restored.";
    return method === "DELETE" ? "Risk removed." : "Risk saved.";
  }
  if (segments[0] === "outgoing-payments" || (segments[0] === "payment-orders" && segments[2] === "payments")) {
    if (/\/documents\/remove$/.test(path)) return "Payment evidence removed.";
    if (/\/documents$/.test(path)) return "Payment evidence linked.";
    if (/\/corrections$/.test(path)) return "Outgoing payment corrected.";
    if (/\/void$/.test(path)) return "Outgoing payment voided.";
    return "Outgoing payment recorded.";
  }
  if (segments[0] === "funding-returns" || (segments[0] === "funding-receipts" && segments[2] === "returns")) {
    if (/\/documents\/remove$/.test(path)) return "Financier return evidence removed.";
    if (/\/documents$/.test(path)) return "Financier return evidence linked.";
    if (/\/corrections$/.test(path)) return "Erroneous financier return corrected.";
    if (/\/void$/.test(path)) return "Erroneous financier return voided.";
    return "Money returned to financier recorded.";
  }
  if (segments.includes("funding-receipts")) {
    if (/\/documents\/remove$/.test(path)) return "Receipt evidence removed.";
    if (/\/documents$/.test(path)) return "Receipt evidence linked.";
    if (/\/corrections$/.test(path)) return "Funding receipt corrected.";
    if (/\/void$/.test(path)) return "Funding receipt voided.";
    return "Funding receipt recorded.";
  }
  const entity = segments.map(segment => names[segment]).filter(Boolean).pop() || "Record";
  if (path.includes("document-checklist")) return "Project document checklist updated.";
  if (/\/restore$/.test(path)) return `${entity} restored.`;
  if (/\/submit$/.test(path)) return `${entity} submitted for approval.`;
  if (/\/approve$/.test(path)) return `${entity} approved.`;
  if (/\/return$/.test(path)) return `${entity} returned for changes.`;
  if (/\/currency-conversion$/.test(path)) return "Budget currency converted.";
  if (/recalculate/.test(path)) return "Budget costs recalculated.";
  if (/\/(complete|reopen)$/.test(path)) return "Follow-up status updated.";
  if (/\/documents\/[^/]+\/replace$/.test(path)) return "Document replacement uploaded.";
  if (segments.length > 2 && /^(budgets|transactions|payment-orders)$/.test(segments[0]) && segments[2] === "documents") return method === "DELETE" ? "Document link removed." : "Document link saved.";
  if (method === "DELETE") return `${entity} removed.`;
  if (/upload/.test(path)) return `${entity} uploaded.`;
  if (/replacement/.test(path)) return "Document replacement uploaded.";
  return method === "POST" && segments.length === 1 ? `${entity} created.` : `${entity} changes saved.`;
}
export async function appFetch(input, options) {
  const response = await window.fetch(input, options);
  const message = mutationNotice(input, options, response);
  if (message) notifySuccess(message);
  return response;
}
