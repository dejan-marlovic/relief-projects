import { render, screen } from "@testing-library/react";
import AuditFieldChanges, { formatFieldValue } from "./AuditFieldChanges";

test("renders all transaction fields with exact amounts and historical reference labels", () => {
  const fields = [
    ["organizationId", "Organization", "REFERENCE", { id: "5", label: "Old organization" }],
    ["projectId", "Project", "REFERENCE", { id: "8", label: "Project A" }],
    ["budgetId", "Budget", "REFERENCE", { id: "10", label: "Budget 10" }],
    ["financierOrganizationId", "Financier organization", "REFERENCE", { id: "6", label: "Financier" }],
    ["transactionStatusId", "Business status", "REFERENCE", { id: "2", label: "Funded" }],
    ["appliedForAmount", "Applied-for amount", "DECIMAL", "9007199254740993"],
    ["firstShareAmount", "First-share amount", "DECIMAL", "123.45"],
    ["approvedAmount", "Approved amount", "DECIMAL", "9007199254740995"],
    ["ownContribution", "Own contribution", "TEXT", "Yes"],
    ["secondShareAmount", "Second-share amount", "DECIMAL", "678.90"],
    ["datePlanned", "Planned date/time", "LOCAL_DATETIME", "2026-09-11T14:30:00"],
    ["okStatus", "OK status", "TEXT", "No"],
  ];
  const { container } = render(<AuditFieldChanges event={{ action: "UPDATE", entityType: "TRANSACTION", fieldChangesVersion: 1,
    fieldChanges: fields.map(([field, , type, newValue]) => ({ field, type, oldValue: null, newValue })),
  }} />);
  expect(Array.from(container.querySelectorAll("dt"), (node) => node.textContent)).toEqual(fields.map((field) => field[1]));
  for (const value of ["9007199254740993", "9007199254740995", "678.90", "2026-09-11 14:30:00", "Yes", "No", "Old organization (ID 5)", "Budget 10 (ID 10)", "Funded (ID 2)"]) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
});

test("preserves precision, local dates, nulls, empty text and historical references", () => {
  expect(formatFieldValue("999999999999999999.99", "DECIMAL")).toBe("999999999999999999.99");
  expect(formatFieldValue("2026-09-10T13:14:15", "LOCAL_DATETIME")).toBe("2026-09-10 13:14:15");
  expect(formatFieldValue(null, "TEXT")).toBe("Not set");
  expect(formatFieldValue("", "TEXT")).toBe("Empty text");
  expect(formatFieldValue({ id: "7", label: "Old project" }, "REFERENCE")).toBe("Old project (ID 7)");
  expect(formatFieldValue({ id: "8" }, "REFERENCE")).toBe("ID 8");
});
test("renders grouped field changes as escaped text with stable-name fallbacks", () => {
  const text = "<script>bad()</script>\nSecond line";
  const { container } = render(<AuditFieldChanges event={{ action: "UPDATE", fieldChangesVersion: 1, fieldChanges: [
    { field: "budgetDescription", type: "TEXT", oldValue: null, newValue: text },
    { field: "futureField", type: "TEXT", oldValue: "", newValue: "new" },
  ] }} />);
  expect(screen.getByText("Description")).toBeInTheDocument();
  expect(screen.getByText("futureField")).toBeInTheDocument();
  expect(container.textContent).toContain(text);
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getAllByText("Before")).toHaveLength(2);
});
test("handles historical and future versions without crashing", () => {
  const view = render(<AuditFieldChanges event={{ action: "CREATE" }} />);
  expect(view.container).toBeEmptyDOMElement();
  view.rerender(<AuditFieldChanges event={{ action: "UPDATE", fieldChanges: [] }} />);
  expect(screen.getByText("No field changes recorded.")).toBeInTheDocument();
  view.rerender(<AuditFieldChanges event={{ action: "UPDATE", fieldChangesVersion: 2 }} />);
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
});
