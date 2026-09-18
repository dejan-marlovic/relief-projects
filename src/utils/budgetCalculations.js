/* global BigInt */
// Exact decimal arithmetic for advisory previews and saved-value totals.
const ten = (n) => BigInt(10) ** BigInt(n);
const parse = (value) => {
  const text = String(value ?? "").trim();
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw new Error("Invalid decimal");
  const [whole, fraction = ""] = text.split(".");
  return { n: BigInt((whole === "-" ? "-0" : whole || "0") + fraction), s: fraction.length };
};
const format = ({ n, s }, scale = 3) => {
  const negative = n < BigInt(0);
  let magnitude = negative ? -n : n;
  if (s > scale) {
    const divisor = ten(s - scale);
    magnitude = (magnitude + divisor / BigInt(2)) / divisor;
  } else magnitude *= ten(scale - s);
  const digits = magnitude.toString().padStart(scale + 1, "0");
  return `${negative && magnitude !== BigInt(0) ? "-" : ""}${scale ? digits.slice(0, -scale) + "." + digits.slice(-scale) : digits}`;
};
export const addDecimals = (a, b, scale = 3) => {
  const x = parse(a), y = parse(b), s = Math.max(x.s, y.s);
  return format({ n: x.n * ten(s - x.s) + y.n * ten(s - y.s), s }, scale);
};
export const sumDecimals = (values, scale = 3) => values.reduce((sum, value) => addDecimals(sum, value ?? "0", scale), format(parse("0"), scale));
export const calculationErrors = (row) => {
  const errors = {};
  for (const [field, label] of [["noOfUnits", "Units"], ["frequencyMonths", "Periods"]]) {
    const text = String(row[field] ?? "");
    if (!/^\d+$/.test(text) || BigInt(text || "0") < BigInt(1) || BigInt(text || "0") > BigInt(Number.MAX_SAFE_INTEGER)) errors[field] = `${label} must be a positive whole number within the browser's exact integer range.`;
  }
  for (const [field, label, scale, max] of [["unitPrice", "Unit price", 2, "999999999999999999.99"], ["percentageCharging", "Allocated share", 3, "100"]]) {
    try {
      const x = parse(row[field]);
      const limit = parse(max);
      const common = Math.max(x.s, limit.s);
      if (x.n < BigInt(0) || x.n * ten(common - x.s) > limit.n * ten(common - limit.s) || (x.s > scale && x.n % ten(x.s - scale) !== BigInt(0))) throw new Error();
    } catch { errors[field] = `${label} must be between 0 and ${max}, with at most ${scale} decimal places.`; }
  }
  return errors;
};
export const costDetailInputs = (row, budgetId) => ({
  budgetId, costTypeId: Number(row.costTypeId), costId: Number(row.costId),
  costDescription: row.costDescription, noOfUnits: Number(row.noOfUnits),
  frequencyMonths: Number(row.frequencyMonths), unitPrice: String(row.unitPrice),
  percentageCharging: String(row.percentageCharging),
});
export const previewAmounts = (row, budget, rates = []) => {
  const result = { amountLocalCurrency: "", amountReportingCurrency: "", amountGBP: "", amountEuro: "" };
  if (Object.keys(calculationErrors(row)).length || !budget) return result;
  const raw = [row.noOfUnits, row.unitPrice, row.frequencyMonths, row.percentageCharging].map(parse).reduce((a, b) => ({ n: a.n * b.n, s: a.s + b.s }), { n: BigInt(1), s: 2 });
  result.amountLocalCurrency = format(raw);
  for (const [field, rateField, targetField] of [["amountReportingCurrency", "reportingExchangeRateSekId", "reportingCurrencySekId"], ["amountGBP", "localExchangeRateToGbpId", "localCurrencyToGbpId"], ["amountEuro", "reportingExchangeRateEurId", "reportingCurrencyEurId"]]) {
    const rate = rates.find((r) => String(r.id) === String(budget[rateField]));
    if (!rate || String(rate.baseCurrencyId) !== String(budget.localCurrencyId) || (budget[targetField] && String(rate.quoteCurrencyId) !== String(budget[targetField]))) continue;
    try {
      const value = parse(rate.rate);
      if (value.n <= BigInt(0) || (String(rate.baseCurrencyId) === String(rate.quoteCurrencyId) && value.n !== ten(value.s))) continue;
      result[field] = format({ n: raw.n * value.n, s: raw.s + value.s });
    } catch { /* Invalid configuration leaves the preview blank. */ }
  }
  return result;
};
// Excel supports only 15 significant digits. Preserve larger values as text.
export const excelDecimal = (value) => {
  if (value == null || value === "") return "";
  const text = String(value);
  const significant = text.replace(/^-/, "").replace(".", "").replace(/^0+/, "");
  return significant.length <= 15 && Number.isFinite(Number(text)) ? Number(text) : text;
};

export const reportingTotals = (rows) => {
  const totals = new Map();
  for (const row of rows) {
    const currency = row.reportingCurrencyLabel || "Reporting";
    totals.set(currency, addDecimals(totals.get(currency) || "0", row.amountReportingCurrency ?? "0"));
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount }));
};
