import { paymentAmountError, exactAmount, groupedPaymentTotals, summaryExcel, decimalUnits, matchesDecimalRange } from "./paymentFunding";
const record = (amount, id = 1, status = "CONSISTENT") => ({amount, amountSummary:{status, source:"CURRENT_BUDGET_CONFIGURATION",currency:{id,name:"Same label"}}});
test("six-decimal precision accepts trailing zeros without rounding or aggregate caps", () => {
  for (const value of ["0.000001", "99999999999999.999999", "1.2300000", 1.25]) expect(paymentAmountError(value)).toBe("");
  for (const value of [null,"", "0", "-1", "1.2300001", "100000000000000", "1e3"]) expect(paymentAmountError(value)).not.toBe("");
  expect(exactAmount("125.123456")).toBe("125.123456");
  expect(exactAmount("1.230000")).toBe("1.23");
  expect(exactAmount(null)).toBe("Unavailable");
});
test("totals group by currency ID and exclude unknown and conflicting summaries", () => {
  expect(groupedPaymentTotals([record("99999999999999.999999"),record("99999999999999.999999"),record("0.000001",2),record("99",1,"INCONSISTENT"),record("3",null),record(null)])).toEqual([
    {currency:{id:1,name:"Same label"}, amount:"199999999999999.999998"},
    {currency:{id:2,name:"Same label"}, amount:"0.000001"},
  ]);
  expect(summaryExcel(record("99999999999999.999999"))).toBe("99999999999999.999999");
  expect(summaryExcel(record(null,1,"UNAVAILABLE"))).toBe("Unavailable");
  expect(summaryExcel(record("0",1,"EMPTY"))).toBe(0);
});
test("filters and sort keys distinguish exact values beyond Number precision", () => {
  expect(decimalUnits("99999999999999.999998")).toBeLessThan(decimalUnits("99999999999999.999999"));
  expect(matchesDecimalRange("99999999999999.999998",{min:"99999999999999.999999"})).toBe(false);
});
