import { addDecimals, sumDecimals, previewAmounts, calculationErrors, costDetailInputs, excelDecimal, reportingTotals } from "./budgetCalculations";
const budget = { localCurrencyId: 1, reportingCurrencySekId: 2, localCurrencyToGbpId: 3, reportingCurrencyEurId: 4, reportingExchangeRateSekId: 20, localExchangeRateToGbpId: 21, reportingExchangeRateEurId: 22 };
const rates = [10.5, 0.8, 0.9].map((rate, index) => ({ id: 20 + index, baseCurrencyId: 1, quoteCurrencyId: 2 + index, rate: String(rate) }));
const row = { noOfUnits: "3", unitPrice: "19.99", frequencyMonths: "2", percentageCharging: "25" };
test("allocation formula uses periods and independently rounds converted raw local", () => {
  expect(previewAmounts(row, budget, rates)).toEqual({ amountLocalCurrency: "29.985", amountReportingCurrency: "314.843", amountGBP: "23.988", amountEuro: "26.987" });
  expect(previewAmounts({ ...row, noOfUnits: 1, unitPrice: ".01", frequencyMonths: 1, percentageCharging: 5 }, budget, rates).amountLocalCurrency).toBe("0.001");
  expect(previewAmounts({ ...row, noOfUnits: 1, unitPrice: "0.01", frequencyMonths: 1, percentageCharging: 5 }, budget, [{ ...rates[0], rate: "3" }])).toMatchObject({ amountLocalCurrency: "0.001", amountReportingCurrency: "0.002", amountGBP: "" });
});
test("zero is visible, invalid inputs/rates never reuse old converted amounts", () => {
  expect(previewAmounts({ ...row, percentageCharging: "0" }, budget, rates).amountGBP).toBe("0.000");
  expect(previewAmounts({ ...row, amountGBP: "99" }, budget, [{ ...rates[1], baseCurrencyId: 3 }]).amountGBP).toBe("");
  expect(calculationErrors({ ...row, frequencyMonths: 0, percentageCharging: 101 })).toHaveProperty("frequencyMonths");
  expect(calculationErrors({ ...row, unitPrice: "1.0000000000001" })).toHaveProperty("unitPrice");
  expect(calculationErrors({ ...row, unitPrice: "1.000", percentageCharging: "100.0000" })).toEqual({});
});
test("saved amounts sum exactly beyond Number precision, Excel preserves large decimals", () => {
  expect(sumDecimals(["99999999999999999.999", "0.001"])).toBe("100000000000000000.000");
  expect(addDecimals("0.001", "0.002")).toBe("0.003");
  expect(excelDecimal("99999999999999999.999")).toBe("99999999999999999.999");
  expect(excelDecimal("29.985")).toBe(29.985);
});
test("request sends editable inputs only and preserves decimal strings", () => {
  const payload = costDetailInputs({ ...row, costTypeId: 2, costId: 8, unitPrice: "999999999999999.99", amountGBP: "123.456" }, 10);
  expect(payload.unitPrice).toBe("999999999999999.99");
  expect(payload.frequencyMonths).toBe(2);
  expect(payload).not.toHaveProperty("amountGBP");
});

test("reporting totals keep different configured currencies separate", () => {
  expect(reportingTotals([{ reportingCurrencyLabel: "SEK", amountReportingCurrency: "0.001" }, { reportingCurrencyLabel: "USD", amountReportingCurrency: "2.000" }, { reportingCurrencyLabel: "SEK", amountReportingCurrency: "0.002" }])).toEqual([{ currency: "SEK", amount: "0.003" }, { currency: "USD", amount: "2.000" }]);
});
test("fractional inputs retain twelve meaningful places and exact request strings", () => {
  const precise = { ...row, noOfUnits: "18886.971409400761", unitPrice: "13.652165077302", frequencyMonths: "50", percentageCharging: "100" };
  expect(calculationErrors(precise)).toEqual({});
  expect(costDetailInputs(precise, 1).noOfUnits).toBe("18886.971409400761");
  expect(previewAmounts(precise, budget, [{ ...rates[0], rate: "0.315636" }])).toMatchObject({ amountLocalCurrency: "12892402.575", amountReportingCurrency: "4069306.379" });
  expect(excelDecimal(precise.noOfUnits)).toBe(precise.noOfUnits);
});
test("sub-unit quantity and independent conversion rounding match the backend", () => {
  expect(previewAmounts({ ...row, noOfUnits: "0.125", unitPrice: "19.99", frequencyMonths: "3", percentageCharging: "25" }, budget, rates)).toEqual({ amountLocalCurrency: "1.874", amountReportingCurrency: "19.678", amountGBP: "1.499", amountEuro: "1.687" });
  expect(calculationErrors({ ...row, noOfUnits: "0.000000000001" })).toEqual({});
});
test("input scale and storage bounds reject meaningful excess without rounding", () => {
  for (const field of ["noOfUnits", "unitPrice", "percentageCharging"]) {
    expect(calculationErrors({ ...row, [field]: "1.2500000000000" })).toEqual({});
    expect(calculationErrors({ ...row, [field]: "1.2500000000001" })).toHaveProperty(field);
  }
  expect(calculationErrors({ ...row, noOfUnits: "0" })).toHaveProperty("noOfUnits");
  expect(calculationErrors({ ...row, noOfUnits: "10000000000000000000" })).toHaveProperty("noOfUnits");
  expect(calculationErrors({ ...row, unitPrice: "1000000000000000000" })).toHaveProperty("unitPrice");
  expect(calculationErrors({ ...row, noOfUnits: "9999999999999999999.999999999999", unitPrice: "999999999999999999.999999999999" })).toEqual({});
  expect(calculationErrors({ ...row, frequencyMonths: "0.5" })).toHaveProperty("frequencyMonths");
});
