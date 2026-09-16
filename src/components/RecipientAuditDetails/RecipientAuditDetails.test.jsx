import { render, screen } from "@testing-library/react";
import RecipientAuditDetails from "./RecipientAuditDetails";
import { auditActionLabel } from "../../utils/auditEvents";
const base = { entityType: "RECIPIENT", entityId: 77, parentPaymentOrderId: 120,
  recipientContext: { version: 1, organization: { id: "9", label: "Community Partner" }, amount: "123.456", bankAccount: "secret-account" } };
test.each(["CREATE", "DELETE", "RESTORE"])("%s displays only recipient organization context", (action) => {
  const event = { ...base, action };
  const view = render(<RecipientAuditDetails event={event} />);
  expect(screen.getByText("Community Partner (ID 9)")).toBeInTheDocument();
  expect(view.container).not.toHaveTextContent("123.456");
  expect(view.container).not.toHaveTextContent("secret-account");
  expect(view.container).not.toHaveTextContent("Before");
  expect(auditActionLabel(event)).toBe(`Recipient #77 ${action === "CREATE" ? "created" : action === "DELETE" ? "deleted" : "restored"}`);
});
test("move shows historical parents and organization changes", () => {
  const event = { ...base, action: "UPDATE", previousParentPaymentOrderId: 119, fieldChangesVersion: 1,
    fieldChanges: [{ field: "organizationId", type: "REFERENCE", oldValue: { id: "8", label: "Old partner" }, newValue: { id: "9", label: "Community Partner" } }] };
  render(<RecipientAuditDetails event={event} />);
  expect(screen.getByText("Moved from payment order #119 to #120")).toBeInTheDocument();
  expect(screen.getByText("Old partner (ID 8)")).toBeInTheDocument();
  expect(auditActionLabel(event)).toBe("Recipient #77 moved");
});
test("missing and future contexts have safe fallbacks", () => {
  const view = render(<RecipientAuditDetails event={{ action: "CREATE" }} />);
  expect(screen.getByText("No recipient context recorded.")).toBeInTheDocument();
  view.rerender(<RecipientAuditDetails event={{ action: "CREATE", recipientContext: { version: 2 } }} />);
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
});
