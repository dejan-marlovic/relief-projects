export const normalizeBudgetName = (value) => String(value ?? "").replace(/^[\p{White_Space}\uFEFF]+|[\p{White_Space}\uFEFF]+$/gu, "");

export const budgetNameError = (value) => {
  const name = normalizeBudgetName(value);
  if (!name) return "Budget name is required.";
  if ([...name].length > 150) return "Budget name must be 150 characters or fewer.";
  return "";
};

export const budgetOptionLabel = (budget) => {
  const id = budget?.id ?? budget?.budgetId;
  const name = normalizeBudgetName(budget?.budgetName);
  const label = name ? `${name} (ID: ${id})` : `Budget #${id}`;
  return budget?.revisionFamilyId ? `${label} · Revision ${budget.revisionNumber} · ${budget.eligibleForFinancialUse === false ? "Planning only" : "Financial basis"}` : label;
};
