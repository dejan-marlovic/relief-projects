import { decimalUnits, fundingErrors, fundingCurrencyLabel, matchesDecimalRange, sumAmounts, remainingFunding, fundingExcel } from "./transactionFunding";
import { sortRows } from "./tableSorting";
const values = { appliedForAmount: "0", approvedAmount: "9999999999999999999.999", };
test("funding accepts the full 19-digit range and zero, independently of requested funding", () => {
  expect(fundingErrors(values)).toEqual({});
  expect(fundingErrors({ ...values, approvedAmount: "1.23000" })).toEqual({});
  for (const value of ["1.23001", "10000000000000000000", "-0.001", "", null]) expect(fundingErrors({ ...values, approvedAmount: value })).toHaveProperty("approvedAmount");
});
test("six-decimal commitment comparison preserves a one-millionth shortfall", () => {
  const total = sumAmounts(["40.000000", "50.000001"]);
  expect(total).toBe("90.000001");
  expect(remainingFunding("90.000", total)).toBe("-0.000001");
  expect(remainingFunding("90.001", total)).toBe("0.000999");
  expect(sumAmounts(["1", null])).toBeNull();
  expect(remainingFunding(null, "1")).toBeNull();
});
test("sort and range filters distinguish decimals above the JavaScript safe integer range", () => {
  const amounts = ["9007199254740993.002", null, "9007199254740993.001", "9.01", "9.1"];
  expect(sortRows(amounts, decimalUnits)).toEqual(["9.01", "9.1", "9007199254740993.001", "9007199254740993.002", null]);
  expect(matchesDecimalRange(amounts[0], { max: "9007199254740993.001" })).toBe(false);
  expect(matchesDecimalRange(amounts[2], { min: "9007199254740993.001" })).toBe(true);
});
test("Excel preserves large amounts and unknown values; currency requires an available observation", () => {
  expect(fundingExcel("9999999999999999999.999")).toBe("9999999999999999999.999");
  expect(fundingExcel("12.125")).toBe(12.125);
  expect(fundingExcel(null)).toBe("Unavailable");
  expect(fundingCurrencyLabel({ source: "CURRENT_BUDGET_CONFIGURATION", availability: "CURRENCY_DELETED", currency: { id: 1, name: "USD" } })).toBe("Currency unavailable");
});
