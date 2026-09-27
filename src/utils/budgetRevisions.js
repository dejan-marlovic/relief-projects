export const financialBudgetEligible = budget => budget?.eligibleForFinancialUse !== false;

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
