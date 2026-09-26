import { render, screen } from "@testing-library/react";
import AllocationAuditDetails from "./AllocationAuditDetails";
import { auditActionLabel } from "../../utils/auditEvents";
const base = { entityType: "COST_DETAIL_ALLOCATION", entityId: 81, parentTransactionId: 42,
  allocationContext: { version: 1, costDetail: { id: "15", label: "Pumps" }, plannedAmount: "125.500000", note: "Hidden context note" } };
test.each([["CREATE", "added"], ["DELETE", "deleted"], ["RESTORE", "restored"]])("%s context preserves decimals without invented changes", (action, label) => {
  const event = { ...base, action };
  const view = render(<AllocationAuditDetails event={event} />);
  expect(screen.getByText("125.500000")).toBeInTheDocument();
  expect(screen.getByText("Pumps (ID 15)")).toBeInTheDocument();
  expect(view.container).not.toHaveTextContent("Before");
  expect(view.container).not.toHaveTextContent("Hidden context note");
  expect(auditActionLabel(event)).toBe(`Allocation #81 ${label}`);
});
test.each(["UPDATE", "RESTORE"])("%s move shows both parents and historical note clearing", (action) => {
  const event = { ...base, action, previousParentTransactionId: 41, fieldChangesVersion: 1,
    fieldChanges: [{ field: "note", type: "TEXT", oldValue: "Original note", newValue: null }] };
  render(<AllocationAuditDetails event={event} />);
  expect(screen.getByText("Moved from transaction #41 to #42")).toBeInTheDocument();
  expect(screen.getByText("Original note")).toBeInTheDocument();
  expect(screen.getByText("Not set")).toBeInTheDocument();
  expect(auditActionLabel(event)).toBe(`Allocation #81 ${action === "RESTORE" ? "restored and moved" : "moved"}`);
});
test("missing and future context and restore changes have safe fallbacks", () => {
  const view = render(<AllocationAuditDetails event={{ action: "CREATE" }} />);
  expect(screen.getByText("No allocation context recorded.")).toBeInTheDocument();
  view.rerender(<AllocationAuditDetails event={{ ...base, action: "RESTORE", allocationContext: { version: 2 }, fieldChangesVersion: 2 }} />);
  expect(screen.getAllByText(/unsupported format/)).toHaveLength(2);
});
