import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ReceiptsPanel } from "./FundingReceipts";
import FundingReceiptAuditDetails from "./FundingReceiptAuditDetails";
import { receiptAmountError } from "../../utils/fundingReceipts";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
const reply = (value, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(value) });
const receipt = { id: 51, revision: 3, status: "RECORDED", amount: "4000.125", receivedDate: "2026-09-25", currency: { id: 3, name: "USD" }, documents: [{ documentId: 81, documentName: "Original advice", versionNumber: 1, downloadEligible: false }] };
const envelope = () => ({ content: [receipt], page: 0, size: 20, totalElements: 41, summary: { status: "PARTIALLY_RECEIVED", approvedFunding: "10000", receivedTotal: "9000.125", remainingToReceive: "999.875", excessReceived: "0", currentFundingCurrency: { currency: { id: 3, name: "USD" } }, issues: [] }, eligibility: { canCreate: true, canManageEvidence: true, canCorrect: false, canVoid: false, requiresDenominationConfirmation: true, issues: [] } });
const mount = () => render(<BrowserRouter><ReceiptsPanel transactionId={31} projectId={4} /></BrowserRouter>);
beforeEach(() => { sessionStorage.clear(); Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "cfeee7af-569c-44c2-bc58-f4a55a4f4a74") } }); });
const setup = (data, command) => { global.fetch = jest.fn(async (url, options) => options?.method === "POST" ? command(url, options) : String(url).includes("/documents/project/") ? reply([]) : reply(data)); };
const createForm = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Record funding receipt" }));
  fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "9999999999999999999.999" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I adopt USD/ }));
};

test("server totals span pages and Finance cannot correct or void", async () => {
  setup(envelope(), () => reply(receipt)); mount();
  expect(await screen.findByText("9000.125")).toBeInTheDocument();
  expect(screen.getByText(/41 receipts/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Void receipt/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Correct receipt/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download evidence #81" })).toBeDisabled();
});

test("uncertain delivery preserves exact body and UUID across remount and retry", async () => {
  let attempts = 0;
  setup(envelope(), () => { if (++attempts === 1) throw new Error("Connection lost"); return reply(receipt, 201); });
  const view = mount(); await createForm(); fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await screen.findByText(/Connection lost/);
  const original = fetch.mock.calls.find(([, options]) => options?.method === "POST")[1].body;
  expect(JSON.parse(original)).toMatchObject({ amount: "9999999999999999999.999", currencyId: 3, confirmApprovedFundingCurrency: true });
  view.unmount(); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }));
  await waitFor(() => expect(sessionStorage.length).toBe(0));
  const calls = fetch.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(calls).toHaveLength(2); expect(calls[1][1].body).toBe(original);
});

test("correction defaults to no evidence and stale errors retain values and revision", async () => {
  const data = envelope(); data.eligibility.canCorrect = true;
  setup(data, () => reply({ message: "Revision changed", code: "STALE_REVISION" }, 409)); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Correct receipt #51" }));
  fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "4100.125" } });
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Correct advice amount" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await screen.findByText(/Revision changed/);
  expect(screen.getByLabelText("Amount received")).toHaveValue("4100.125");
  const body = JSON.parse(fetch.mock.calls.find(([, options]) => options?.method === "POST")[1].body);
  expect(body).toMatchObject({ expectedRevision: 3, documentIds: [], reason: "Correct advice amount" });
  expect(body).not.toHaveProperty("confirmApprovedFundingCurrency");
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
});

test("unavailable comparisons never display a zero remaining amount", async () => {
  const data = envelope(); data.summary.status = "COMPARISON_UNAVAILABLE"; data.summary.remainingToReceive = null; data.summary.excessReceived = null; data.eligibility.canCreate = false;
  setup(data, () => reply(receipt)); mount();
  expect(await screen.findByText("Comparison unavailable")).toBeInTheDocument();
  expect(screen.getByText("Remaining to receive").parentElement).toHaveTextContent("Unavailable");
  expect(screen.queryByRole("button", { name: "Record funding receipt" })).not.toBeInTheDocument();
});

test.each(["void", "remove"])("Admin %s command sends the original revision and required reason", async kind => {
  const data = envelope(); data.eligibility.canVoid = true;
  setup(data, () => reply({ ...receipt, revision: 4 })); mount();
  fireEvent.click(await screen.findByRole("button", { name: kind === "void" ? "Void receipt #51" : "Remove evidence #81" }));
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Wrong entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain(kind === "void" ? "/51/void" : "/51/documents/remove");
  expect(JSON.parse(options.body)).toMatchObject({ expectedRevision: 3, reason: "Wrong entry", ...(kind === "remove" ? { documentId: 81 } : {}) });
  await waitFor(() => expect(sessionStorage.length).toBe(0));
});

test("precision rejects zero, overflow and rounding; receipt audit renders retained context", () => {
  for (const value of ["0", "-1", "0.0001", "10000000000000000000"]) expect(receiptAmountError(value)).not.toBe("");
  expect(receiptAmountError("1.23000")).toBe("");
  render(<FundingReceiptAuditDetails event={{ parentTransactionId: 31, fundingReceiptContext: { version: 1, amount: "4000.125", currency: { id: 3, label: "USD" }, reason: "Duplicate", documentsBefore: [{ id: 81, label: "Old advice" }], documentsAfter: [] } }} />);
  expect(screen.getByText("4000.125")).toBeInTheDocument(); expect(screen.getByText("Duplicate")).toBeInTheDocument(); expect(screen.getByText("Old advice (#81)")).toBeInTheDocument();
});
