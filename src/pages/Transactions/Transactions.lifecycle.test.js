import { approvedBudgetOptions } from "./Transactions";

const budgets = [
  { id: 1, lifecycleStatus: "DRAFT" },
  { id: 2, lifecycleStatus: "SUBMITTED" },
  { id: 3, lifecycleStatus: "APPROVED" },
  { id: 4, lifecycleStatus: "RETURNED" },
];

test("new transactions can select only approved budgets", () => {
  expect(approvedBudgetOptions(budgets).map((budget) => budget.id)).toEqual([3]);
});

test("editing preserves the currently assigned historical budget", () => {
  expect(approvedBudgetOptions(budgets, 2).map((budget) => budget.id)).toEqual([
    2,
    3,
  ]);
});
