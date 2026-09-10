import { render, screen } from "@testing-library/react";
import AuditFieldChanges, { formatFieldValue } from "./AuditFieldChanges";

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
