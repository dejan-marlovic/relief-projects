import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UpdateDocument from "./UpdateDocument";
import { jsonResponse } from "../../../testUtils/authTestUtils";

test("metadata updates omit the immutable stored key", async () => {
  const row = { id: 7, employeeId: 2, projectId: 1, documentName: "Report.pdf", documentPath: "stored.pdf" };
  localStorage.setItem("authToken", "token");
  global.fetch = jest.fn((url, options) => {
    if (url.endsWith("/categories")) return jsonResponse([{ id: "UNCATEGORIZED", label: "Uncategorized" }]);
    if (options?.method === "PUT") return jsonResponse(row);
    if (url.endsWith("/documents/active")) return jsonResponse([row]);
    if (url.endsWith("/employees/active")) return jsonResponse([{ id: 2, firstName: "Test" }]);
    return jsonResponse([{ id: 1, projectName: "Project" }]);
  });
  render(<MemoryRouter><UpdateDocument /></MemoryRouter>);
  await screen.findByRole("option", { name: /Report.pdf/ });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "7" } });
  expect(screen.getByLabelText("Stored file (read-only)")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: /Update document/i }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(true));
  const [, options] = fetch.mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(options.body)).toEqual({ employeeId: 2, projectId: 1, documentName: "Report.pdf" });
  localStorage.clear();
});

test("admin edits clear dates explicitly without sending captured upload identity", async () => {
  const row = { id: 7, employeeId: 2, projectId: 1, documentName: "Report.pdf", documentPath: "stored.pdf", category: "FINANCE", documentDate: "2024-02-29", uploadedByUsername: "captured.user", uploadedAt: "2026-09-19T10:00:00Z", uploadedByUserId: 5 };
  localStorage.setItem("authToken", "token");
  global.fetch = jest.fn((url, options) => {
    if (options?.method === "PUT") return jsonResponse({ ...row, category: "UNCATEGORIZED", documentDate: null });
    if (url.endsWith("/categories")) return jsonResponse([{ id: "FINANCE", label: "Finance" }, { id: "UNCATEGORIZED", label: "Uncategorized" }]);
    if (url.endsWith("/documents/active")) return jsonResponse([row]);
    if (url.endsWith("/employees/active")) return jsonResponse([{ id: 2, firstName: "Test" }]);
    return jsonResponse([{ id: 1, projectName: "Project" }]);
  });
  render(<MemoryRouter><UpdateDocument /></MemoryRouter>);
  await screen.findByRole("option", { name: /Report.pdf/ });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "7" } });
  expect(screen.getByText("Uploaded by captured.user")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "UNCATEGORIZED" } });
  fireEvent.change(screen.getByLabelText("Document date (optional)"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /Update document/i }));
  await screen.findByText(/updated successfully/);
  const [, options] = fetch.mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(options.body)).toEqual({ employeeId: 2, projectId: 1, documentName: "Report.pdf", category: "UNCATEGORIZED", documentDate: null });
  expect(screen.getByText("Uploaded by captured.user")).toBeInTheDocument();
  localStorage.clear();
});
