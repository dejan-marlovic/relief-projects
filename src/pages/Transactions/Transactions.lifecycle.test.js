import {
  approvedBudgetOptions,
  canSubmitTransactionLifecycle,
  costDetailsForBudget,
  transactionLifecycleStatus,
} from "./Transactions";

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

test("transaction lifecycle status defaults safely to draft", () => {
  expect(transactionLifecycleStatus({})).toBe("DRAFT");
  expect(transactionLifecycleStatus({ lifecycleStatus: "SUBMITTED" })).toBe(
    "SUBMITTED",
  );
});

test("finance and admin users can submit only draft or returned transactions", () => {
  expect(canSubmitTransactionLifecycle({ lifecycleStatus: "DRAFT" }, true)).toBe(
    true,
  );
  expect(
    canSubmitTransactionLifecycle({ lifecycleStatus: "RETURNED" }, true),
  ).toBe(true);
  expect(
    canSubmitTransactionLifecycle({ lifecycleStatus: "SUBMITTED" }, true),
  ).toBe(false);
  expect(
    canSubmitTransactionLifecycle({ lifecycleStatus: "APPROVED" }, true),
  ).toBe(false);
  expect(canSubmitTransactionLifecycle({ lifecycleStatus: "DRAFT" }, false)).toBe(
    false,
  );
});

test("allocation options include only cost details from the transaction budget", () => {
  const costDetails = [
    { costDetailId: 10, budgetId: 1 },
    { costDetailId: 20, budgetId: 2 },
    { costDetailId: 21, budgetId: "2" },
  ];

  expect(
    costDetailsForBudget(costDetails, 2).map((detail) => detail.costDetailId),
  ).toEqual([20, 21]);
  expect(costDetailsForBudget(costDetails, null)).toEqual([]);
});
