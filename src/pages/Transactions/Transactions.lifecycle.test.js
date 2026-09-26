import {
  approvedBudgetOptions,
  canSubmitTransactionLifecycle,
  costDetailsForBudget,
  isTransactionLifecycleEditable,
  transactionLifecycleStatus,
} from "./Transactions";

const budgets = [
  { id: 1, projectId: 10, lifecycleStatus: "DRAFT" },
  { id: 2, projectId: 10, lifecycleStatus: "SUBMITTED" },
  { id: 3, projectId: 10, lifecycleStatus: "APPROVED" },
  { id: 4, projectId: 10, lifecycleStatus: "RETURNED" },
  { id: 5, projectId: 20, lifecycleStatus: "APPROVED" },
];

test("new transactions can select only approved budgets", () => {
  expect(approvedBudgetOptions(budgets).map((budget) => budget.id)).toEqual([3, 5]);
});

test("editing preserves the currently assigned historical budget", () => {
  expect(approvedBudgetOptions(budgets, 2).map((budget) => budget.id)).toEqual([
    2, 3, 5,
  ]);
});

test("budget choices are restricted to the selected project", () => {
  expect(
    approvedBudgetOptions(budgets, null, 10).map((budget) => budget.id),
  ).toEqual([3]);
  expect(
    approvedBudgetOptions(budgets, null, 20).map((budget) => budget.id),
  ).toEqual([5]);
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

test("only draft and returned transactions are editable", () => {
  expect(isTransactionLifecycleEditable({ lifecycleStatus: "DRAFT" })).toBe(true);
  expect(isTransactionLifecycleEditable({ lifecycleStatus: "RETURNED" })).toBe(true);
  expect(isTransactionLifecycleEditable({ lifecycleStatus: "SUBMITTED" })).toBe(false);
  expect(isTransactionLifecycleEditable({ lifecycleStatus: "APPROVED" })).toBe(false);
});
