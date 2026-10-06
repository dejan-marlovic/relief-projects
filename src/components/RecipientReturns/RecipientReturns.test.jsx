import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { RecipientReturnsPanel } from "./RecipientReturns";
import RecipientReturnSummary from "./RecipientReturnSummary";
import RecipientReturnAuditDetails from "./RecipientReturnAuditDetails";
import { mutationNotice } from "../../utils/appFetch";
import { paymentAmountError } from "../../utils/outgoingPayments";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
const reply = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
const payment = { id: 51, paymentOrderId: 3, recipientId: 17, organization: { id: 8, name: "Partner" }, projectId: 4, revision: 3, amount: "7000.000", paidDate: "2026-09-25", currency: { id: 3, name: "USD" } };
const row = { id: 9, originalPaymentId: 51, amount: "500.000", returnedDate: "2026-09-26", reason: "Unspent principal", currency: payment.currency, documents: [{ documentId: 81, downloadEligible: false }], eligibility: { canCorrect: true, canVoid: true, canManageEvidence: true } };
const envelope = () => ({ sourceRevision: 3, returnsRevision: 2, content: [row], totalElements: 41, remainingReturnable: "5500.000", summary: { status: "AVAILABLE", grossPaid: "7000.000", returnedFromRecipient: "1500.000", netPaid: "5500.000" }, eligibility: { canRecord: true } });
let data;
beforeEach(() => { data = envelope(); sessionStorage.clear(); Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "cfeee7af-569c-44c2-bc58-f4a55a4f4a74") } }); });
const setup = command => { global.fetch = jest.fn(async (url, options) => {
  if (options?.method === "POST") return command(url, options);
  if (String(url).includes("/documents/project/")) return reply([]);
  if (String(url).endsWith("/outgoing-payments/51")) return reply(payment);
  return reply(data);
}); };
const mount = () => render(<BrowserRouter><RecipientReturnsPanel payment={payment} /></BrowserRouter>);
test("recipient returns use six decimal places and reject rounding or overflow", () => {
  expect(paymentAmountError("0.000001")).toBe("");
  expect(paymentAmountError("9999999999999999999.999999")).toBe("");
  for (const value of ["0", "-1", "0.0000001", "10000000000000000000"]) expect(paymentAmountError(value)).not.toBe("");
});
const create = async () => { fireEvent.click(await screen.findByRole("button", { name: "Record money returned by recipient" })); fireEvent.change(screen.getByLabelText("Amount returned"), { target: { value: "1000.125001" } }); fireEvent.change(screen.getByLabelText("Reason for actual return"), { target: { value: "Unspent funds" } }); };

test("records exact strings against captured currency and both revisions; totals span all pages", async () => {
  setup(() => reply({ return: { id: 10 }, returnsRevision: 3 }, 201)); mount();
  await create();
  expect(screen.getByText("1500.000")).toBeInTheDocument();
  expect(screen.getByText(/41 returns/)).toBeInTheDocument();
  expect(screen.getByLabelText("Date returned")).toHaveAttribute("min", "2026-09-25");
  fireEvent.click(screen.getByText("Confirm return action"));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain("/outgoing-payments/51/returns");
  expect(JSON.parse(options.body)).toMatchObject({ amount: "1000.125001", expectedReturnsRevision: 2, expectedSourceRevision: 3, currencyId: 3, documentIds: [], reason: "Unspent funds" });
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
  setup(() => reply({ code: "RETURN_LIMIT_EXCEEDED", message: "Return exceeds original payment" }, 409)); mount(); await create();
  fireEvent.click(screen.getByText("Confirm return action")); await screen.findByText(/Return exceeds original payment/);
  expect(screen.getByLabelText("Amount returned")).toHaveValue("1000.125001");
  expect(screen.getByText("Confirm return action")).toBeDisabled();
  await waitFor(() => expect(screen.getByText("Use refreshed revisions after review (keep input)")).toBeEnabled());
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
});
test("correction keeps source and currency and explicitly clears replacement evidence", async () => {
  setup(() => reply({ return: { id: 10 }, voidedReturn: row, returnsRevision: 3 })); mount();
  fireEvent.click(await screen.findByText("Correct erroneous return #9"));
  fireEvent.change(screen.getByLabelText("Amount returned"), { target: { value: "400.000001" } });
  fireEvent.change(screen.getByLabelText("Correction explanation"), { target: { value: "Incorrect amount entered" } });
  fireEvent.click(screen.getByText("Confirm return action"));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain("/recipient-returns/9/corrections");
  expect(JSON.parse(options.body)).toMatchObject({ amount: "400.000001", reason: "Unspent principal", correctionReason: "Incorrect amount entered", documentIds: [], currencyId: 3 });
});
test("unavailable or multi-currency summaries never invent zero scalar totals", () => {
  const view = render(<RecipientReturnSummary />);
  expect(screen.getByText(/Return information unavailable/)).toBeInTheDocument();
  view.rerender(<RecipientReturnSummary summary={{ status: "SEPARATE_CURRENCIES", totalsByCurrency: [{ currencyId: 3, recordedLabel: "USD", grossPaid: "7", returnedFromRecipient: "1", netPaid: "6" }] }} />);
  expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  expect(screen.getByText(/USD \(#3\): Gross 7/)).toBeInTheDocument();
});
test("audit and success banners distinguish real returns from voids and payment creation", () => {
  render(<RecipientReturnAuditDetails event={{ parentPaymentOrderId: 31, recipientReturnContext: { version: 1, originalPaymentId: 51, returnsRevision: 2, amount: "400.001", currency: { id: 3, label: "USD" }, reason: "Principal returned", changeReason: "Correction", documentsBefore: [{ id: 81, label: "Original advice" }] } }} />);
  expect(screen.getByText("400.001")).toBeInTheDocument(); expect(screen.getByText("Original advice (#81)")).toBeInTheDocument();
  expect(mutationNotice("/api/outgoing-payments/51/returns", { method: "POST" }, { ok: true, status: 201 })).toBe("Money returned by recipient recorded.");
  expect(mutationNotice("/api/recipient-returns/9/void", { method: "POST" }, { ok: true, status: 200 })).toBe("Erroneous recipient return voided.");
});
