import { render, screen } from "@testing-library/react";
import CostDetailAuditDetails from "./CostDetailAuditDetails";
import { auditActionLabel } from "../../utils/auditEvents";
const base = { entityType: "COST_DETAIL", entityId: 81, parentBudgetId: 12,
  costDetailContext: { version: 1, costType: { id: "2", label: "Equipment" }, cost: { id: "7", label: "Pumps" },
    costDescription: "Village pumps", amountLocalCurrency: "220.000", configuredCurrencies: { local: { id: "9", label: "KES" } } } };
test.each(["CREATE", "DELETE", "RESTORE"])("%s shows recorded context without invented transitions or changes", (action) => {
  const event = { ...base, action };
  const view = render(<CostDetailAuditDetails event={event} />);
  expect(screen.getByText("220.000")).toBeInTheDocument();
  expect(screen.getByText("Village pumps")).toBeInTheDocument();
  expect(screen.getByText("KES (ID 9)")).toBeInTheDocument();
  expect(view.container).not.toHaveTextContent("Before");
  expect(auditActionLabel(event)).toBe(`Cost detail #81 ${action === "CREATE" ? "created" : action === "DELETE" ? "deleted" : "restored"}`);
});
test("move preserves both configurations and exact integer differences", () => {
  const event = { ...base, action: "UPDATE", previousParentBudgetId: 11,
    costDetailContext: { ...base.costDetailContext, previousConfiguredCurrencies: { local: { id: "8", label: "UGX" } } },
    fieldChangesVersion: 1, fieldChanges: [{ field: "noOfUnits", type: "INTEGER", oldValue: "2", newValue: "9007199254740993" }] };
  render(<CostDetailAuditDetails event={event} />);
  expect(screen.getByText("Moved from budget #11 to #12")).toBeInTheDocument();
  expect(screen.getByText("UGX (ID 8)")).toBeInTheDocument();
  expect(screen.getByText("9007199254740993")).toBeInTheDocument();
  expect(screen.getByText("Units")).toBeInTheDocument();
  expect(auditActionLabel(event)).toBe("Cost detail #81 moved");
});
test("missing and future contexts have safe fallbacks", () => {
  const view = render(<CostDetailAuditDetails event={{ action: "CREATE" }} />);
  expect(screen.getByText("No cost-detail context recorded.")).toBeInTheDocument();
  view.rerender(<CostDetailAuditDetails event={{ ...base, costDetailContext: { version: 2 } }} />);
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
});

test("shows prior currency configuration for a same-parent currency change", () => {
  render(<CostDetailAuditDetails event={{ ...base, costDetailContext: { ...base.costDetailContext, previousConfiguredCurrencies: { local: { id: "8", label: "UGX" } } } }} />);
  expect(screen.getByText("Previous budget currency configuration")).toBeInTheDocument();
  expect(screen.getByText("UGX (ID 8)")).toBeInTheDocument();
});
