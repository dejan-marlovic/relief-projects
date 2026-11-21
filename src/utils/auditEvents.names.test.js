import { auditRecordName } from "./auditEvents";

test("uses captured party and cost names for financial history", () => {
  expect(auditRecordName({ outgoingPaymentContext: { organization: { label: "Recorded recipient" } } })).toBe("Recorded recipient");
  expect(auditRecordName({ allocationContext: { costDetail: { label: "Pump repairs" } } })).toBe("Pump repairs");
  expect(auditRecordName({ signatureContext: { employee: { label: "Recorded signer" } } })).toBe("Recorded signer");
});

test("uses the matching recorded title change, never an unrelated field or current project", () => {
  expect(auditRecordName({ entityType: "BUDGET", fieldChanges: [{ field: "budgetName", newValue: "Revised repair budget" }] })).toBe("Revised repair budget");
  expect(auditRecordName({ entityType: "TRANSACTION", projectName: "Different current project", fieldChanges: [{ field: "budgetName", newValue: "Unrelated budget" }] })).toBe("Name not recorded");
});
