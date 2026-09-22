/* global BigInt */
import { decimalUnits, sumAmounts, fundingExcel } from "./transactionFunding";
export { decimalUnits, fundingExcel, matchesDecimalRange } from "./transactionFunding";
export const paymentAmountError = (value) => {
  const units = decimalUnits(value, 6);
  if (units == null || units <= BigInt(0)) return "Amount must be positive with at most 6 meaningful decimal places.";
  if (units > BigInt("99999999999999999999")) return "Amount allows at most 14 integer digits and 6 meaningful decimal places; values are never rounded.";
  return "";
};
export const exactAmount = (value) => {
  if (decimalUnits(value) == null) return "Unavailable";
  return String(value).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};
export const usableSummary = (summary) => ["CONSISTENT", "EMPTY"].includes(summary?.status);
export const summaryAmount = (record) => usableSummary(record?.amountSummary) ? record.amount : null;
export const summaryText = (summary) => {
  const currency = summary?.currency;
  return `${summary?.status || "UNAVAILABLE"} · ${currency?.id != null ? `${currency.name || "Currency"} (#${currency.id})` : "Currency unavailable"}`;
};
export const issueText = (issues = []) => issues.map(issue => `${issue.code}: ${issue.message || ""}${issue.lineIds?.length ? ` (lines ${issue.lineIds.join(", ")})` : ""}`).join("; ");
export const groupedPaymentTotals = (records) => {
  const groups = new Map();
  for (const record of records) {
    const summary = record.amountSummary;
    if (!usableSummary(summary) || summary?.source !== "CURRENT_BUDGET_CONFIGURATION" || summary.currency?.id == null || decimalUnits(record.amount) == null) continue;
    const key = String(summary.currency.id);
    const group = groups.get(key) || { currency: summary.currency, values: [] };
    group.values.push(record.amount); groups.set(key, group);
  }
  return [...groups.values()].map(group => ({ currency: group.currency, amount: sumAmounts(group.values) }));
};
export const summaryExcel = (record) => fundingExcel(summaryAmount(record));
