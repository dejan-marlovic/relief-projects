import { getCostDetailPlannedAmount } from "./TransactionAllocations";

describe("transaction allocation defaults", () => {
  test("uses the cost detail local amount as the planned amount", () => {
    expect(
      getCostDetailPlannedAmount({ amountLocalCurrency: "1250.75" })
    ).toBe(1250.75);
  });

  test("keeps the field empty when the cost detail has no valid amount", () => {
    expect(getCostDetailPlannedAmount({ amountLocalCurrency: null })).toBe("");
    expect(getCostDetailPlannedAmount({ amountLocalCurrency: "invalid" })).toBe("");
  });
});
