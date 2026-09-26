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
