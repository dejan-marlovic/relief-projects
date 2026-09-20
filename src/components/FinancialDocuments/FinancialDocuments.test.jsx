import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinancialDocuments from "./FinancialDocuments";
import { downloadDocument } from "../../utils/documentDownload";
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/documentDownload", () => ({ downloadDocument: jest.fn() }));
const { useAuth } = require("../../context/AuthContext");
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const target = { id: 7, projectId: 2, transactionId: 9, lifecycleStatus: "DRAFT", locked: false };
const linked = { documentId: 10, documentName: "Evidence.pdf", versionNumber: 1, status: "FINAL", category: "FINANCE", downloadEligible: true, hasNewerVersion: true, currentDocumentId: 11, currentDocumentStatus: "DRAFT", documentDeleted: false, projectDeleted: false, targetDeleted: false };
const candidate = { id: 11, documentName: "Revised.pdf", projectId: 2, isDeleted: false, isCurrent: true, versionNumber: 2, status: "DRAFT" };
const mount = async (props = {}) => {
  const view = render(<MemoryRouter><FinancialDocuments entityType="BUDGET" entityId={7} lifecycleStatus="DRAFT" {...props} /></MemoryRouter>);
  const details = view.container.querySelector("details");
  details.open = true; fireEvent(details, new Event("toggle"));
  await screen.findByText("Evidence.pdf");
  await waitFor(() => expect(screen.queryByText("Loading supporting documents…")).not.toBeInTheDocument());
  return view;
};
beforeEach(() => {
  localStorage.setItem("authToken", "token");
  useAuth.mockReturnValue({ hasAnyRole: (...roles) => roles.includes("FINANCE") });
  downloadDocument.mockResolvedValue();
  global.fetch = jest.fn((url, options) => {
    if (url.endsWith("/categories")) return Promise.resolve(response([{ id: "FINANCE", label: "Finance" }]));
    if (options?.method === "POST" || options?.method === "DELETE") return Promise.resolve(response(linked));
    if (url.endsWith("/documents")) return Promise.resolve(response([linked]));
    if (url.includes("/documents/project/2")) return Promise.resolve(response([candidate]));
    if (url.endsWith("/transactions/9")) return Promise.resolve(response({ id: 9, projectId: 2 }));
    if (url.endsWith("/projects/2")) return Promise.resolve(response({ id: 2 }));
    return Promise.resolve(response(target));
  });
});
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

test.each(["BUDGET", "TRANSACTION", "PAYMENT_ORDER"])("%s links an exact version, never replacing the original automatically", async (entityType) => {
  await mount({ entityType });
  await screen.findByRole("option", { name: /Revised.pdf/ });
  fireEvent.change(screen.getByLabelText("Project document"), { target: { value: "11" } });
  fireEvent.click(screen.getByRole("button", { name: "Link selected version" }));
  await screen.findByText("Exact document version linked.");
  const writes = fetch.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][1].body)).toEqual({ documentId: 11 });
  expect(fetch.mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);
  expect(screen.getByText(/This link still uses version 1/)).toBeInTheDocument();
});

test("downloads the pinned ID rather than the newer current ID", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: "Download linked version" }));
  await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith(10, expect.any(Function), expect.any(AbortSignal)));
});

test.each(["PROJECT_MANAGER", "VIEWER", "APPROVER"])("%s can read but not change links", async (role) => {
  useAuth.mockReturnValue({ hasAnyRole: (...roles) => roles.includes(role) });
  await mount();
  expect(screen.queryByRole("button", { name: "Remove link" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Project document")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download linked version" })).toBeEnabled();
});

test.each(["SUBMITTED", "APPROVED"])("%s blocks mutations even for Admin", async (lifecycleStatus) => {
  useAuth.mockReturnValue({ hasAnyRole: () => true });
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith("/budgets/7") ? Promise.resolve(response({ ...target, lifecycleStatus })) : normal(url, options));
  await mount({ lifecycleStatus });
  expect(screen.queryByLabelText("Project document")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove link" })).not.toBeInTheDocument();
});

test("Booked payment order cannot change links", async () => {
  await mount({ entityType: "PAYMENT_ORDER", locked: true });
  expect(screen.queryByLabelText("Project document")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove link" })).not.toBeInTheDocument();
});

test("headerless order does not infer a project from its own projectId or lines", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith("/payment-orders/7") ? Promise.resolve(response({ ...target, transactionId: null })) : normal(url, options));
  await mount({ entityType: "PAYMENT_ORDER" });
  expect(screen.getByText(/Payment-order lines do not establish/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Project document")).not.toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.includes("/documents/project/"))).toBe(false);
  // Removing retained evidence remains allowed independently of header activity.
  expect(screen.getByRole("button", { name: "Remove link" })).toBeEnabled();
});

test("unavailable evidence stays visible, cannot download, and unlink does not delete the document", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith("/documents") && !options?.method ? Promise.resolve(response([{ ...linked, downloadEligible: false, documentDeleted: true }])) : normal(url, options));
  await mount();
  expect(screen.getByRole("button", { name: "Download linked version" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
  await screen.findByText("Link removed. The document is unchanged.");
  const writes = fetch.mock.calls.filter(([, options]) => options?.method === "DELETE");
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toMatch(/\/budgets\/7\/documents\/10$/);
});

test("explicitly including historical candidates omits currentOnly", async () => {
  await mount();
  await screen.findByRole("option", { name: /Revised.pdf/ });
  fireEvent.click(screen.getByLabelText("Include active historical versions"));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.endsWith("/documents/project/2"))).toBe(true));
});

test("409 refreshes links and eligibility without silently retrying", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "POST" ? Promise.resolve(response({ message: "Document is already linked." }, 409)) : normal(url, options));
  await mount();
  await screen.findByRole("option", { name: /Revised.pdf/ });
  fireEvent.change(screen.getByLabelText("Project document"), { target: { value: "11" } });
  fireEvent.click(screen.getByRole("button", { name: "Link selected version" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Document is already linked.");
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.endsWith('/budgets/7/documents')).length).toBeGreaterThan(2));
});

test("late responses after leaving a record cannot render its documents", async () => {
  let finish;
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith('/documents') ? new Promise((resolve) => { finish = resolve; }) : normal(url, options));
  const view = render(<MemoryRouter><FinancialDocuments entityType="BUDGET" entityId={7} /></MemoryRouter>);
  const details = view.container.querySelector('details'); details.open = true; fireEvent(details, new Event('toggle'));
  await waitFor(() => expect(finish).toBeDefined());
  view.unmount();
  await act(async () => finish(response([linked])));
  expect(screen.queryByText('Evidence.pdf')).not.toBeInTheDocument();
});

test("an inactive header cannot supply a project for linking", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith('/transactions/9') ? Promise.resolve(response({}, 404)) : normal(url, options));
  await mount({ entityType: 'PAYMENT_ORDER' });
  expect(screen.queryByLabelText('Project document')).not.toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.includes('/documents/project/'))).toBe(false);
  expect(screen.getByRole('button', { name: 'Remove link' })).toBeEnabled();
});

test("deleted target links remain readable but cannot be mutated", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith('/budgets/7') ? Promise.resolve(response({}, 404)) : normal(url, options));
  await mount();
  expect(screen.getByText('Evidence.pdf')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Remove link' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Project document')).not.toBeInTheDocument();
});

test("failed removal retains evidence and never deletes the document or retries", async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === 'DELETE' ? Promise.resolve(response({ message: 'Record is now approved.' }, 409)) : normal(url, options));
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Record is now approved.');
  expect(await screen.findByText('Evidence.pdf')).toBeInTheDocument();
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1);
});
