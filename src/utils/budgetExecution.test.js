import { assignmentAmountError, exactAmount } from "./budgetExecution";
import { financialBudgetEligible, financialReferenceEligible, budgetFinancialRole } from "./budgetRevisions";

test("exact assignment boundaries never round excess precision or overflow", () => {
  expect(assignmentAmountError("99999999999999.999999")).toBe("");
  expect(assignmentAmountError("0.0000010000", true)).toBe("");
  for (const value of ["0.0000001", "100000000000000", "-0.000001", "", "NaN", "1e3"]) expect(assignmentAmountError(value)).not.toBe("");
  expect(assignmentAmountError("0", true)).not.toBe("");
  expect(assignmentAmountError("0", false)).toBe("");
  expect(exactAmount(null)).toBe("Unavailable");
});
test("superseded budgets are retained references but cannot receive new funding", () => {
  const old = { canCreateFundingTransaction: false, financialReferenceEligible: true, eligibleForFinancialUse: false };
  expect(financialBudgetEligible(old)).toBe(false);
  expect(financialReferenceEligible(old)).toBe(true);
  expect(budgetFinancialRole(old)).toBe("Existing financial references");
  expect(financialBudgetEligible({ ...old, canCreateFundingTransaction: true })).toBe(true);
  expect(financialReferenceEligible({ eligibleForFinancialUse: false })).toBe(false);
});
