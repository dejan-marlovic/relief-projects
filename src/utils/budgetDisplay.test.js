import { budgetNameError, budgetOptionLabel, normalizeBudgetName } from "./budgetDisplay";

test("budget names trim Unicode whitespace and count code points", () => {
  expect(normalizeBudgetName("\u0085 Water supply \u2003")).toBe("Water supply");
  expect(budgetNameError("  ")).toMatch(/required/);
  expect(budgetNameError("😀".repeat(150))).toBe("");
  expect(budgetNameError("😀".repeat(151))).toMatch(/150/);
});

test("labels distinguish duplicate names and never fall back to long descriptions", () => {
  expect(budgetOptionLabel({ id: 7, budgetName: "Water", budgetDescription: "Long description" })).toBe("Water (ID: 7)");
  expect(budgetOptionLabel({ id: 8, budgetName: "Water" })).toBe("Water (ID: 8)");
  expect(budgetOptionLabel({ id: 7, budgetName: " ", budgetDescription: "Long description" })).toBe("Budget #7");
});
