import { isValidCostDetail } from "./CostDetails";

const completeCostDetail = {
  costDescription: "Emergency shelter",
  costTypeId: 1,
  costId: 2,
  noOfUnits: 10,
  unitPrice: 100,
  percentageCharging: 50,
  amountLocalCurrency: 500,
  amountReportingCurrency: 500,
  amountGBP: 40,
  amountEuro: 45,
};

describe("cost-detail required-field validation", () => {
  test("accepts a complete cost detail", () => {
    expect(isValidCostDetail(completeCostDetail)).toBe(true);
  });

  test.each([
    "costDescription",
    "costTypeId",
    "costId",
    "noOfUnits",
    "unitPrice",
    "percentageCharging",
    "amountLocalCurrency",
    "amountReportingCurrency",
    "amountGBP",
    "amountEuro",
  ])("rejects a cost detail with missing %s", (field) => {
    expect(
      isValidCostDetail({ ...completeCostDetail, [field]: "" })
    ).toBe(false);
  });
});
