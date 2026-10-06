import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { FundingReturnsPanel } from "./FundingReturns";
import FundingReturnSummary from "./FundingReturnSummary";
import FundingReturnAuditDetails from "./FundingReturnAuditDetails";
import { mutationNotice } from "../../utils/appFetch";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
const reply = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
const receipt = { id: 51, projectId: 4, revision: 3, amount: "7000.000", receivedDate: "2026-09-25", currency: { id: 3, name: "USD" } };
const row = { id: 9, originalReceiptId: 51, amount: "500.000", returnedDate: "2026-09-26", reason: "Unspent principal", currency: receipt.currency, documents: [{ documentId: 81, downloadEligible: false }], eligibility: { canCorrect: true, canVoid: true, canManageEvidence: true } };
const envelope = () => ({ sourceRevision: 3, returnsRevision: 2, content: [row], totalElements: 41, remainingReturnable: "5500.000", summary: { status: "AVAILABLE", grossReceived: "7000.000", returnedToFinancier: "1500.000", netRetained: "5500.000" }, eligibility: { canRecord: true } });
let data;
beforeEach(() => { data = envelope(); sessionStorage.clear(); Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "cfeee7af-569c-44c2-bc58-f4a55a4f4a74") } }); });
const setup = command => { global.fetch = jest.fn(async (url, options) => {
  if (options?.method === "POST") return command(url, options);
  if (String(url).includes("/documents/project/")) return reply([]);
  if (String(url).endsWith("/funding-receipts/51")) return reply(receipt);
  return reply(data);
}); };
const mount = () => render(<BrowserRouter><FundingReturnsPanel receipt={receipt} /></BrowserRouter>);
const create = async () => { fireEvent.click(await screen.findByRole("button", { name: "Record money returned to financier" })); fireEvent.change(screen.getByLabelText("Amount returned"), { target: { value: "1000.125" } }); fireEvent.change(screen.getByLabelText("Reason for actual return"), { target: { value: "Unspent funds" } }); };

test("records exact strings against captured currency and both revisions; totals span all pages", async () => {
  setup(() => reply({ return: { id: 10 }, returnsRevision: 3 }, 201)); mount();
  await create();
  expect(screen.getByText("1500.000")).toBeInTheDocument();
  expect(screen.getByText(/41 returns/)).toBeInTheDocument();
  expect(screen.getByLabelText("Date returned")).toHaveAttribute("min", "2026-09-25");
  fireEvent.click(screen.getByText("Confirm return action"));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain("/funding-receipts/51/returns");
  expect(JSON.parse(options.body)).toMatchObject({ amount: "1000.125", expectedReturnsRevision: 2, expectedSourceRevision: 3, currencyId: 3, documentIds: [], reason: "Unspent funds" });
  await waitFor(() => expect(sessionStorage.length).toBe(0));
});
test("uncertain response preserves exact command across remount and replays it once on request", async () => {
  let attempts = 0;
  setup(() => { if (++attempts === 1) throw new Error("Connection lost"); return reply({ return: { id: 10 }, returnsRevision: 3 }); });
  const view = mount(); await create(); fireEvent.click(screen.getByText("Confirm return action"));
  await screen.findByText(/Connection lost/);
  const body = fetch.mock.calls.find(([, options]) => options?.method === "POST")[1].body;
  view.unmount(); mount(); fireEvent.click(await screen.findByText("Retry same return request"));
  await waitFor(() => expect(sessionStorage.length).toBe(0));
  const writes = fetch.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(writes).toHaveLength(2); expect(writes[1][1].body).toBe(body);
});
test("cap conflict preserves input and requires deliberate review, never automatic retry", async () => {
  setup(() => reply({ code: "RETURN_LIMIT_EXCEEDED", message: "Return exceeds original receipt" }, 409)); mount(); await create();
  fireEvent.click(screen.getByText("Confirm return action")); await screen.findByText(/Return exceeds original receipt/);
  expect(screen.getByLabelText("Amount returned")).toHaveValue("1000.125");
  expect(screen.getByText("Confirm return action")).toBeDisabled();
  await waitFor(() => expect(screen.getByText("Use refreshed revisions after review (keep input)")).toBeEnabled());
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
});
test("correction keeps source and currency and explicitly clears replacement evidence", async () => {
  setup(() => reply({ return: { id: 10 }, voidedReturn: row, returnsRevision: 3 })); mount();
  fireEvent.click(await screen.findByText("Correct erroneous return #9"));
  fireEvent.change(screen.getByLabelText("Amount returned"), { target: { value: "400.000" } });
  fireEvent.change(screen.getByLabelText("Correction explanation"), { target: { value: "Incorrect amount entered" } });
  fireEvent.click(screen.getByText("Confirm return action"));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain("/funding-returns/9/corrections");
  expect(JSON.parse(options.body)).toMatchObject({ amount: "400.000", reason: "Unspent principal", correctionReason: "Incorrect amount entered", documentIds: [], currencyId: 3 });
});
test("unavailable or multi-currency summaries never invent zero scalar totals", () => {
  const view = render(<FundingReturnSummary />);
  expect(screen.getByText(/Return information unavailable/)).toBeInTheDocument();
  view.rerender(<FundingReturnSummary summary={{ status: "SEPARATE_CURRENCIES", totalsByCurrency: [{ currencyId: 3, recordedLabel: "USD", grossReceived: "7", returnedToFinancier: "1", netRetained: "6" }] }} />);
  expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  expect(screen.getByText(/USD \(#3\): Gross 7/)).toBeInTheDocument();
});
test("audit and success banners distinguish real returns from voids and receipt creation", () => {
  render(<FundingReturnAuditDetails event={{ parentTransactionId: 31, fundingReturnContext: { version: 1, originalReceiptId: 51, returnsRevision: 2, amount: "400.001", currency: { id: 3, label: "USD" }, reason: "Principal returned", changeReason: "Correction", documentsBefore: [{ id: 81, label: "Original advice" }] } }} />);
  expect(screen.getByText("400.001")).toBeInTheDocument(); expect(screen.getByText("Original advice (#81)")).toBeInTheDocument();
  expect(mutationNotice("/api/funding-receipts/51/returns", { method: "POST" }, { ok: true, status: 201 })).toBe("Money returned to financier recorded.");
  expect(mutationNotice("/api/funding-returns/9/void", { method: "POST" }, { ok: true, status: 200 })).toBe("Erroneous financier return voided.");
});
