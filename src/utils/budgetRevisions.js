export const financialBudgetEligible = budget => (budget?.canCreateFundingTransaction ?? budget?.eligibleForFinancialUse) !== false;
export const financialReferenceEligible = budget => (budget?.financialReferenceEligible ?? budget?.eligibleForFinancialUse) !== false;
export const budgetFinancialRole = budget => financialBudgetEligible(budget) ? "New funding eligible" : financialReferenceEligible(budget) ? "Existing financial references" : "Planning only";

// A missing family selection is unknown, never a zero or a predecessor fallback.
export function selectedPlanningBudgets(envelope) {
  if (!Array.isArray(envelope?.bases)) throw new Error("Invalid planning basis response.");
  const seen = new Set();
  const budgets = [];
  let unavailable = 0;
  for (const basis of envelope.bases) {
    const key = basis.familyId == null ? `budget-${basis.budgetId}` : `family-${basis.familyId}`;
    if (seen.has(key)) throw new Error("Duplicate planning basis.");
    seen.add(key);
    if (!basis.available || !basis.budget || basis.selection === "NO_CURRENT_PLAN") unavailable++;
    else budgets.push(basis.budget);
  }
  return { budgets, unavailable };
}
