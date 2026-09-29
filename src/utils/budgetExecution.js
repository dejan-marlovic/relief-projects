/* global BigInt */
import { safeReadJson } from "./http";
import { decimalUnits } from "./transactionFunding";

export async function readExecution(response) {
  const data = await safeReadJson(response);
  if (!response.ok) throw new Error([...new Set([data?.message, ...Object.values(data?.fieldErrors || {})].filter(Boolean))].join(" ") || `Request failed (${response.status}).`);
  if (!data) throw new Error("The response could not be read.");
  return data;
}
export const executionChanged = () => window.dispatchEvent(new Event("budget-revisions-changed"));
export function assignmentAmountError(value, creating = false) {
  const units = decimalUnits(value);
  if (units == null || units < BigInt(0) || units > BigInt("99999999999999999999")) return "Use a nonnegative amount with at most 14 integer digits and 6 meaningful decimals. Amounts are not rounded.";
  if (creating && units === BigInt(0)) return "A new assignment must be greater than zero.";
  return "";
}
export const exactAmount = value => value == null ? "Unavailable" : String(value);
