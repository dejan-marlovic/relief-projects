import { isValidCostDetail, validateCostDetail } from "./CostDetails";

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

const costs = [
  { id: 2, costName: "Shelter", costTypeId: 1 },
  { id: 3, costName: "Monitoring", costTypeId: 2 },
];

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

  test("returns field-specific messages for incomplete rows", () => {
    expect(validateCostDetail({ ...completeCostDetail, costDescription: "", costId: "" }))
      .toEqual({
        costDescription: "Description is required.",
        costId: "Category is required.",
      });
  });

  test("rejects a category that belongs to a different type", () => {
    expect(validateCostDetail({ ...completeCostDetail, costId: 3 }, costs))
      .toMatchObject({
        costId: "Category must belong to the selected type.",
      });
  });

  test("accepts a category belonging to the selected type", () => {
    expect(isValidCostDetail(completeCostDetail, costs)).toBe(true);
  });
});
