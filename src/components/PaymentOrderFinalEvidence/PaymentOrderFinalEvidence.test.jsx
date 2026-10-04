import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FinalEvidencePanel } from "./PaymentOrderFinalEvidence";
import { appFetch } from "../../utils/appFetch";
import { downloadDocument } from "../../utils/documentDownload";
jest.mock("../../utils/appFetch", () => ({ appFetch: jest.fn() }));
jest.mock("../../utils/documentDownload", () => ({ downloadDocument: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: (...roles) => roles.includes("FINANCE") }) }));
const response = (data, ok = true) => ({ ok, status: ok ? 200 : 409, json: async () => data });
const entry = { id: 12, documentId: 7, capturedDocumentName: "Old.pdf", versionNumber: 1, role: "SIGNED_PAYMENT_ORDER", warnings: ["HISTORICAL_VERSION"], document: { downloadEligible: true, status: "FINAL" }, permissions: { canReplace: true, canRemove: true } };
let collection;
beforeEach(() => {
  jest.clearAllMocks(); localStorage.setItem("authToken", "test");
  collection = { revision: 4, entries: [entry], permissions: { canAttach: true }, issues: [] };
  appFetch.mockImplementation(async (url, options = {}) => {
    if (options.method === "POST") return response({ revision: 5 });
    if (url.includes("/history")) return response({ content: [], totalElements: 0 });
    if (url.endsWith("/final-evidence")) return response(collection);
    if (url.endsWith("/payment-orders/73")) return response({ transactionId: 8 });
    if (url.endsWith("/transactions/8")) return response({ projectId: 5 });
    if (url.endsWith("/documents/project/5")) return response([{ id: 7, documentName: "Old.pdf", versionNumber: 1, projectId: 5, isDeleted: false, isCurrent: false }, { id: 42, documentName: "New.pdf", versionNumber: 2, projectId: 5, isDeleted: false, isCurrent: true }]);
    throw new Error(`Unexpected request: ${url}`);
  });
});
afterEach(() => localStorage.clear());
const mount = () => render(<MemoryRouter><FinalEvidencePanel paymentOrderId={73} /></MemoryRouter>);
test("uses server capabilities, protected exact downloads and existing uploader rights", async () => {
  mount(); fireEvent.click(await screen.findByText("Download exact version #7"));
  await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith(7, expect.any(Function)));
  expect(screen.queryByText(/Open Documents to upload/)).not.toBeInTheDocument();
  expect(screen.getByText("Replace attachment #12")).toBeEnabled();
});
test("replacement sends one atomic command with revision and selected exact version", async () => {
  mount(); fireEvent.click(await screen.findByText("Replace attachment #12"));
  await screen.findByRole("option", { name: /New.pdf/ });
  fireEvent.change(screen.getByLabelText("Exact document version"), { target: { value: "42" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: " Correct file " } });
  fireEvent.click(screen.getByText("Save replace"));
  await waitFor(() => expect(appFetch.mock.calls.some(([url, options]) => url.endsWith("/12/replace") && JSON.parse(options.body).documentId === 42)).toBe(true));
  const writes = appFetch.mock.calls.filter(([, options]) => options.method === "POST");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][1].body)).toEqual({ expectedRevision: 4, documentId: 42, role: "SIGNED_PAYMENT_ORDER", reason: "Correct file" });
});
test("conflicts preserve drafts and require review before another command", async () => {
  const original = appFetch.getMockImplementation();
  appFetch.mockImplementation((url, options) => options?.method === "POST" ? Promise.resolve(response({ message: "Stale revision" }, false)) : original(url, options));
  mount(); fireEvent.click(await screen.findByText("Remove attachment #12"));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong file" } });
  fireEvent.click(screen.getByText("Save remove"));
  await screen.findByText(/Stale revision/);
  await waitFor(() => expect(screen.getByText("Refresh late evidence and history")).toBeEnabled());
  expect(screen.getByLabelText("Reason")).toHaveValue("Wrong file");
  expect(screen.getByText("Save remove")).toBeDisabled();
  expect(appFetch.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
});
test("empty ineligible collections show issues and no attach action", async () => {
  collection = { revision: 0, entries: [], permissions: { canAttach: false }, issues: [{ code: "ORDER_INELIGIBLE", message: "An approved order is required." }] };
  mount(); await screen.findByText("An approved order is required.");
  expect(screen.queryByRole("button", { name: "Attach late evidence" })).not.toBeInTheDocument();
});
