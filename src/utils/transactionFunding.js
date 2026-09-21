/* global BigInt */
import { addDecimals, excelDecimal } from "./budgetCalculations";
export const fundingFields = ["appliedForAmount", "approvedAmount"];
export const decimalUnits = (value, scale = 6) => {
  const text = String(value ?? "").trim();
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  if (fraction.slice(scale).replace(/0/g, "")) return null;
  return BigInt(`${whole || "0"}${fraction.slice(0, scale).padEnd(scale, "0")}`) * BigInt(negative ? -1 : 1);
};
export const fundingErrors = (values) => {
  const errors = {};
  for (const field of fundingFields) {
    const text = String(values[field] ?? "").trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) { errors[field] = "Enter a nonnegative decimal amount."; continue; }
    if (["appliedForAmount", "approvedAmount"].includes(field)) {
      const units = decimalUnits(text, 3);
      if (units == null || units > BigInt("9999999999999999999999")) errors[field] = "Use at most 19 integer digits and 3 meaningful decimal places. Amounts are not rounded.";
    }
  }
  return errors;
};
export const fundingCurrencyLabel = (observation) => observation?.source === "CURRENT_BUDGET_CONFIGURATION" && observation?.availability === "AVAILABLE" && observation.currency?.id != null
  ? observation.currency.name || `Currency #${observation.currency.id}` : "Currency unavailable";
export const matchesDecimalRange = (value, range) => {
  const min = decimalUnits(range?.min), max = decimalUnits(range?.max), current = decimalUnits(value);
  if (min == null && max == null) return true;
  return current != null && (min == null || current >= min) && (max == null || current <= max);
};
export const sumAmounts = (values) => {
  if (values.some((value) => decimalUnits(value) == null)) return null;
  return values.reduce((sum, value) => addDecimals(sum, value, 6), "0.000000");
};
export const remainingFunding = (approved, allocated) => decimalUnits(approved) == null || decimalUnits(allocated) == null ? null : addDecimals(approved, String(allocated).startsWith("-") ? String(allocated).slice(1) : `-${allocated}`, 6);
export const fundingExcel = (value) => value == null || value === "" ? "Unavailable" : excelDecimal(value);
