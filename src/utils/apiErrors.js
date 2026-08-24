const dependencyLabels = {
  allocations: "Allocations",
  bankDetails: "Bank details",
  budgets: "Budgets",
  childProjects: "Child projects",
  costDetails: "Cost details",
  documents: "Documents",
  employeeAssignments: "Employee assignments",
  locations: "Locations",
  memos: "Memos",
  organizations: "Organizations",
  paymentOrderLines: "Payment-order lines",
  paymentOrders: "Payment orders",
  projectOrganizations: "Project organizations",
  projectRelationships: "Project relationships",
  projects: "Projects",
  recipients: "Recipients",
  sectors: "Sectors",
  signatures: "Signatures",
  transactions: "Transactions",
  users: "Users",
};

export const dependencyLabel = (key) =>
  dependencyLabels[key] ||
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());

export const formatApiError = (data, fallback = "The operation failed.") => {
  const message = data?.message || data?.detail || fallback;
  const dependencies = Object.entries(data?.dependencies || {}).filter(
    ([, count]) => Number(count) > 0,
  );

  if (dependencies.length === 0) return message;

  const details = dependencies
    .map(([key, count]) => `${dependencyLabel(key)}: ${count}`)
    .join("\n");
  return `${message}\n\nActive dependencies:\n${details}`;
};

export const readApiError = async (response, fallback) => {
  if (typeof response?.text !== "function") {
    const data =
      typeof response?.json === "function"
        ? await response.json().catch(() => null)
        : null;
    return formatApiError(data, fallback);
  }

  const raw = await response.text().catch(() => "");
  if (!raw) return formatApiError(null, fallback);

  try {
    return formatApiError(JSON.parse(raw), fallback);
  } catch {
    return raw || fallback;
  }
};
