import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Documents from "./Documents";
import { ProjectContext } from "../../context/ProjectContext";
import { jsonResponse, makeUser } from "../../testUtils/authTestUtils";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
const { useAuth } = require("../../context/AuthContext");
const categories = [{ id: "FINANCE", label: "Finance" }, { id: "UNCATEGORIZED", label: "Uncategorized" }];
const row = { id: 7, isCurrent: true, isDeleted: false, versionNumber: 1, projectId: 1, employeeId: 2, documentName: "Report.pdf", category: "FINANCE", documentDate: "2024-02-29", uploadedByUsername: "original.user", uploadedByUserId: 4, uploadedAt: "2026-09-19T10:00:00Z" };
const mount = () => render(<MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: "1" }}><Documents /></ProjectContext.Provider></MemoryRouter>);
beforeEach(() => {
  localStorage.setItem("authToken", "token");
  useAuth.mockReturnValue({ user: { ...makeUser(["ADMIN"]), employeeId: 2 }, hasRole: () => true, hasAnyRole: () => true });
  global.fetch = jest.fn((url, options) => {
    if (url.endsWith("/categories")) return Promise.resolve(jsonResponse(categories));
    if (url.includes("/employees/")) return Promise.resolve(jsonResponse([{ id: 2, firstName: "Attributed", lastName: "Employee" }]));
    if (options?.method === "PUT" || options?.method === "POST") return Promise.resolve(jsonResponse(row));
    if (url.includes("?category=UNCATEGORIZED")) return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse([row]));
  });
});
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

test("uses backend labels, preserves a date-only value and separates uploader from employee", async () => {
  mount();
  expect(await screen.findByText("Finance · Document date: 2024-02-29")).toBeInTheDocument();
  expect(screen.getByText(/Uploaded by original.user/)).toBeInTheDocument();
  expect(await screen.findByText("Employee attribution: Attributed Employee")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "UNCATEGORIZED" } });
  expect(await screen.findByText("No documents match this category.")).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.includes("?category=UNCATEGORIZED"))).toBe(true);
  fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "" } });
  expect(await screen.findByText("Report.pdf")).toBeInTheDocument();
});

test("editing clears a date with null, resets classification and omits immutable metadata", async () => {
  mount();
  await screen.findByText("Report.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.change(screen.getByLabelText("Category", { exact: true }), { target: { value: "UNCATEGORIZED" } });
  fireEvent.change(screen.getByLabelText("Document date", { exact: true }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save details" }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(true));
  const request = fetch.mock.calls.find(([, options]) => options?.method === "PUT")[1];
  expect(JSON.parse(request.body)).toEqual({ id: 7, projectId: 1, employeeId: 2, documentName: "Report.pdf", category: "UNCATEGORIZED", documentDate: null });
  await waitFor(() => expect(screen.queryByRole("button", { name: "Save details" })).not.toBeInTheDocument());
});

test.each(["", "2024-02-29"])("upload sends optional date %s and refreshes the active filter", async (date) => {
  const view = mount();
  await screen.findByText("Report.pdf");
  fireEvent.change(screen.getByLabelText("Upload category"), { target: { value: "FINANCE" } });
  fireEvent.change(screen.getByLabelText("Document date (optional)"), { target: { value: date } });
  fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "UNCATEGORIZED" } });
  await screen.findByText("No documents match this category.");
  fireEvent.change(view.container.querySelector('input[type="file"]'), { target: { files: [new File(["demo"], "demo.txt", { type: "text/plain" })] } });
  await screen.findByText(/Upload complete/);
  const request = fetch.mock.calls.find(([, options]) => options?.method === "POST")[1];
  expect(request.body.get("category")).toBe("FINANCE");
  expect(request.body.get("documentDate")).toBe(date || null);
  expect(request.headers["Content-Type"]).toBeUndefined();
  expect(screen.queryByText("Report.pdf")).not.toBeInTheDocument();
  await screen.findByText("No documents match this category.");
});

test("a late unfiltered response cannot replace filtered results", async () => {
  let finish;
  const normalFetch = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith("/project/1?currentOnly=true") ? new Promise((resolve) => { finish = resolve; }) : normalFetch(url, options));
  mount();
  await waitFor(() => expect(screen.getByLabelText("Filter by category")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "UNCATEGORIZED" } });
  await screen.findByText("No documents match this category.");
  await act(async () => finish(jsonResponse([row])));
  expect(screen.queryByText("Report.pdf")).not.toBeInTheDocument();
});

test("validation errors keep the edit form open and explain the invalid field", async () => {
  const normalFetch = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "PUT"
    ? Promise.resolve({ ok: false, status: 400, json: async () => ({ message: "Validation failed.", fieldErrors: { documentDate: "Use a valid document date." } }) })
    : normalFetch(url, options));
  mount();
  await screen.findByText("Report.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.click(screen.getByRole("button", { name: "Save details" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Use a valid document date.");
  expect(screen.getByLabelText("Document date", { exact: true })).toHaveValue("2024-02-29");
});

test("lookup failure can be retried without losing access to downloads", async () => {
  const normalFetch = fetch.getMockImplementation();
  let failed = true;
  fetch.mockImplementation((url, options) => url.endsWith("/categories") && failed
    ? Promise.resolve({ ok: false, json: async () => ({ message: "Categories unavailable" }) })
    : normalFetch(url, options));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Categories unavailable");
  expect(await screen.findByRole("button", { name: "Download" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Edit details" })).toBeDisabled();
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry categories" }));
  await waitFor(() => expect(screen.getByLabelText("Filter by category")).toBeEnabled());
});

test("defaults to current versions and freezes historical records in the all-active view", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.includes('/project/1')
    ? Promise.resolve(jsonResponse(url.includes('currentOnly=true') ? [row] : [row, { ...row, id: 8, documentName: 'Earlier.pdf', isCurrent: false }]))
    : normal(url, options));
  mount();
  await screen.findByText('Report.pdf');
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/project/1?currentOnly=true'))).toBe(true);
  fireEvent.change(screen.getByLabelText('Versions shown'), { target: { value: 'all' } });
  await screen.findByText('Earlier.pdf');
  expect(screen.getAllByRole('button', { name: 'Edit details' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Version history' })).toHaveLength(2);
});

test("current metadata can set Final without sending relationship fields", async () => {
  mount();
  await screen.findByText('Report.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Status', { exact: true }), { target: { value: 'FINAL' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(true));
  expect(JSON.parse(fetch.mock.calls.find(([, options]) => options?.method === 'PUT')[1].body)).toEqual({ id: 7, projectId: 1, employeeId: 2, documentName: 'Report.pdf', status: 'FINAL' });
});
