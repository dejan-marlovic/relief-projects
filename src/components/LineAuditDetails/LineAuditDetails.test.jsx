import { render, screen } from "@testing-library/react";
import LineAuditDetails from "./LineAuditDetails";
import { auditActionLabel } from "../../utils/auditEvents";
const context = { version: 1, transaction: { id: "42", label: "Transaction 42" }, organization: { id: "9", label: "Partner" }, costDetail: { id: "15", label: "Pumps" }, amount: "125.500000" };
test.each(["CREATE", "DELETE"])("%s shows immutable context without fictitious field changes", (action) => {
  const event = { entityType: "PAYMENT_ORDER_LINE", entityId: 81, parentPaymentOrderId: 73, action, lineContext: { ...context, memo: "Do not show", pinCode: "secret" } };
  const view = render(<LineAuditDetails event={event} />);
  expect(screen.getByText("125.500000")).toBeInTheDocument();
  expect(screen.getByText("Pumps (ID 15)")).toBeInTheDocument();
  expect(view.container).not.toHaveTextContent("Before");
  expect(view.container).not.toHaveTextContent("Do not show");
  expect(view.container).not.toHaveTextContent("secret");
  expect(auditActionLabel(event)).toBe(`Line #81 ${action === "CREATE" ? "created" : "deleted"}`);
});
test("move shows both historical parent IDs and changes separately from context", () => {
  const event = { entityType: "PAYMENT_ORDER_LINE", entityId: 81, action: "UPDATE", parentPaymentOrderId: 74, previousParentPaymentOrderId: 73, lineContext: context, fieldChangesVersion: 1,
    fieldChanges: [{ field: "amount", type: "DECIMAL", oldValue: "100.000000", newValue: "125.500000" }] };
  render(<LineAuditDetails event={event} />);
  expect(screen.getByText("Moved from payment order #73 to #74")).toBeInTheDocument();
  expect(screen.getByText("Before")).toBeInTheDocument();
  expect(screen.getByText("100.000000")).toBeInTheDocument();
  expect(auditActionLabel(event)).toBe("Line #81 moved");
});
test("missing and future context have safe fallbacks", () => {
  const view = render(<LineAuditDetails event={{ action: "CREATE" }} />);
  expect(screen.getByText("No line context recorded.")).toBeInTheDocument();
  view.rerender(<LineAuditDetails event={{ action: "CREATE", lineContext: { version: 2 } }} />);
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
});
