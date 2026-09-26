import { render, screen } from "@testing-library/react";
import SignatureAuditDetails from "./SignatureAuditDetails";
import { auditActionLabel } from "../../utils/auditEvents";
const base = { entityType: "SIGNATURE", entityId: 77, parentPaymentOrderId: 120,
  signatureContext: { version: 1, signatureStatus: { id: "3", label: "Reviewed" }, employee: { id: "42", label: "Named Signer" },
    signatureDate: "2026-09-13T10:30:00", signature: "Never render this" } };
test.each(["CREATE", "DELETE", "RESTORE"])("%s displays whitelisted context and a local date", (action) => {
  const event = { ...base, action };
  const view = render(<SignatureAuditDetails event={event} />);
  expect(screen.getByText("Named signer")).toBeInTheDocument();
  expect(screen.getByText("Named Signer (ID 42)")).toBeInTheDocument();
  expect(screen.getByText("2026-09-13 10:30:00")).toBeInTheDocument();
  expect(view.container).not.toHaveTextContent("Never render this");
  expect(view.container).not.toHaveTextContent("Before");
  expect(auditActionLabel(event)).toBe(`Signature #77 ${action === "CREATE" ? "created" : action === "DELETE" ? "deleted" : "restored"}`);
});
test.each(["REDACTED", "TEXT"])("signature changes with type %s never render supplied values", (type) => {
  const event = { ...base, action: "UPDATE", previousParentPaymentOrderId: 119, fieldChangesVersion: 1,
    fieldChanges: [{ field: "signature", type, oldValue: "secret old", newValue: "secret new" }] };
  const view = render(<SignatureAuditDetails event={event} />);
  expect(screen.getByText("Signature content changed; values not retained.")).toBeInTheDocument();
  expect(screen.getByText("Moved from payment order #119 to #120")).toBeInTheDocument();
  expect(view.container).not.toHaveTextContent("secret");
  expect(view.container).not.toHaveTextContent("Before");
  expect(auditActionLabel(event)).toBe("Signature #77 moved");
});
test("missing and future context have safe fallbacks", () => {
  const view = render(<SignatureAuditDetails event={{ action: "CREATE" }} />);
  expect(screen.getByText("No signature context recorded.")).toBeInTheDocument();
  view.rerender(<SignatureAuditDetails event={{ action: "CREATE", signatureContext: { version: 2 } }} />);
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
});
