import { financialBudgetEligible, selectedPlanningBudgets } from "./budgetRevisions";

test("unselected families remain unavailable without using the financial root", () => {
  expect(selectedPlanningBudgets({ bases: [
    { familyId: 7, selection: "NO_CURRENT_PLAN", available: false, budget: null, budgetId: null },
    { familyId: null, selection: "STANDALONE", available: true, budgetId: 3, budget: { id: 3 } },
  ] })).toEqual({ budgets: [{ id: 3 }], unavailable: 1 });
});
test("uses exactly the selected member and rejects duplicate family contributions", () => {
  const basis = { familyId: 7, selection: "EXPLICIT_CURRENT_PLAN", available: true, budgetId: 9, budget: { id: 9 } };
  expect(selectedPlanningBudgets({ bases: [basis] }).budgets).toEqual([{ id: 9 }]);
  expect(() => selectedPlanningBudgets({ bases: [basis, { ...basis, budgetId: 8 }] })).toThrow("Duplicate");
});
test("approved planning successors are ineligible for financial use", () => {
  expect(financialBudgetEligible({ lifecycleStatus: "APPROVED", eligibleForFinancialUse: false })).toBe(false);
  expect(financialBudgetEligible({ eligibleForFinancialUse: true })).toBe(true);
});
