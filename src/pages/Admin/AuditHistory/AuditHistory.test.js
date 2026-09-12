import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AuditHistory, { buildAuditQuery, formatAuditTimestamp } from "./AuditHistory";
import { ProjectContext } from "../../../context/ProjectContext";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));

test("Admin can request exact line history and see the line and parent identifiers", async () => {
  const event = { id: 50, entityType: "PAYMENT_ORDER_LINE", entityId: 81, parentPaymentOrderId: 73, action: "CREATE", performedByDisplay: "admin.user" };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ content: [event, event], number: 0, totalPages: 1, totalElements: 1 }) });
  render(<ProjectContext.Provider value={{ projects: [] }}><AuditHistory /></ProjectContext.Provider>);
  await screen.findByText("Line #81 created");
  expect(screen.getByText("Payment order #73")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(2);
  fireEvent.change(screen.getByRole("combobox", { name: "Record type" }), { target: { value: "PAYMENT_ORDER_LINE" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Record ID" }), { target: { value: "81" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[1][0]).toContain("entityType=PAYMENT_ORDER_LINE&entityId=81");
  expect(fetch.mock.calls[1][0]).not.toContain("includeChildren");
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
});

test.each([["UPDATE", "Updated"], ["CREATE", "Created"], ["DELETE", "Deleted"], ["RESTORE", "Restored"]])("Admin can filter %s events and render their null states", async (action, label) => {
  const auditEvent = { id: 9, entityType: "BUDGET", entityId: 7, action, previousState: null, newState: null, returnReason: null, performedBy: "42", performedByDisplay: "admin.user", occurredAt: "2026-09-08T12:00:00Z" };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ content: [auditEvent], number: 0, totalPages: 1, totalElements: 1 }) });
  render(<ProjectContext.Provider value={{ projects: [] }}><AuditHistory /></ProjectContext.Provider>);
  const row = (await screen.findByText("admin.user")).closest("tr");
  expect(within(row).getByText(label)).toBeInTheDocument();
  expect(row).not.toHaveTextContent("→");
  expect(row).not.toHaveTextContent("Return reason");
  expect(row).toHaveTextContent(formatAuditTimestamp(auditEvent.occurredAt));
  fireEvent.change(screen.getByRole("combobox", { name: "Action" }), { target: { value: action } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Record ID" }), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const query = new URL(fetch.mock.calls[1][0], "http://localhost").searchParams;
  expect(query.get("action")).toBe(action);
  expect(query.get("entityId")).toBe("7");
  expect(query.get("page")).toBe("0");
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
});

describe("audit history helpers", () => {
  test("builds a paginated query containing only active filters", () => {
    const query = new URLSearchParams(buildAuditQuery({
      entityType: "BUDGET",
      entityId: "12",
      projectId: "",
      action: "APPROVE",
      performedBy: " 7 ",
      occurredFrom: "",
      occurredTo: "",
    }, 2, 20));

    expect(Object.fromEntries(query)).toEqual({
      page: "2",
      size: "20",
      entityType: "BUDGET",
      entityId: "12",
      action: "APPROVE",
      performedBy: "7",
    });
  });

  test("formats missing and invalid timestamps safely", () => {
    expect(formatAuditTimestamp(null)).toBe("—");
    expect(formatAuditTimestamp("not-a-date")).toBe("—");
  });
});
