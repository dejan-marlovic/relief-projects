import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { PaymentsPanel } from "./OutgoingPayments";
import OutgoingPaymentAuditDetails from "./OutgoingPaymentAuditDetails";
import { paymentAmountError } from "../../utils/outgoingPayments";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const row = () => ({ id: 41, revision: 3, recipientId: 17, status: "RECORDED", amount: "7000.000001", paidDate: "2026-09-25", currency: { id: 3, name: "USD" }, organization: { id: 8, name: "Recipient organization" }, documents: [{ documentId: 81, documentName: "Original evidence", versionNumber: 1, downloadEligible: false }], eligibility: { canVoid: false, canCorrect: false, canManageEvidence: true, voidIssues: [{ code: "INSUFFICIENT_PERMISSION", message: "ADMIN is required to void payments." }] } });
const envelope = () => ({ content: [row()], page: 0, size: 20, totalElements: 41, summary: { status: "OVER_PAID", comparisonStatus: "AVAILABLE", paidTotal: "7000.000001", recipientCommitment: "6000.000000", recipientRemaining: "0.000000", recipientExcess: "1000.000001", orderCommitment: "10000.000000", orderRemaining: "2999.999999", orderExcess: "0.000000", currentOrderConfiguration: { projectId: 7, currency: { id: 3, name: "USD" } }, issues: [] }, eligibility: { canRecord: true, canVoid: false, canCorrect: false, canManageEvidence: false, requiresDenominationConfirmation: true, recipient: { id: 17, organizationName: "Recipient organization", contributingSubtotal: "6000.000000" }, recordingIssues: [] } });
const mount = () => render(<BrowserRouter><PaymentsPanel paymentOrderId={12} /></BrowserRouter>);
const setup = (data, post = () => reply(row(), 201)) => { global.fetch = jest.fn(async (url, options) => options?.method === "POST" ? post(url, options) : String(url).includes("/documents/project/") ? reply([{ id: 81, projectId: 7, isDeleted: false, documentName: "Advice", versionNumber: 1, isCurrent: false }]) : reply(data)); };
beforeEach(() => { sessionStorage.clear(); Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "b52b9b5f-c099-457a-ab34-db595df7a1f1") } }); });

test("recipient excess stays primary when the whole order still has remaining commitments", async () => {
  setup(envelope()); mount();
  expect(await screen.findByText("Over paid")).toBeInTheDocument();
  expect(screen.getByText("Recipient excess").parentElement).toHaveTextContent("1000.000001");
  expect(screen.getByText("Order remaining").parentElement).toHaveTextContent("2999.999999");
  expect(screen.getByText(/Order remaining is not authorization/)).toBeInTheDocument();
  expect(screen.getByText(/41 payments/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add evidence #41" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Void payment #41" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download evidence #81" })).toBeDisabled();
});

test("headerless orders use envelope project/currency and send exact six-decimal amounts", async () => {
  setup(envelope()); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Record outgoing payment" }));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes("/documents/project/7"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Amount paid"), { target: { value: "9999999999999999999.999999" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I adopt USD/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain("/payment-orders/12/payments");
  expect(JSON.parse(options.body)).toMatchObject({ recipientId: 17, currencyId: 3, amount: "9999999999999999999.999999", confirmCommitmentDenomination: true, documentIds: [] });
  await waitFor(() => expect(sessionStorage.length).toBe(0));
});

test("per-record permissions allow correction even though envelope actions are false", async () => {
  const data = envelope(); data.content[0].eligibility.canCorrect = true;
  setup(data, () => reply({ code: "STALE_REVISION", message: "Review current revision" }, 409)); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Correct payment #41" }));
  fireEvent.change(screen.getByLabelText("Amount paid"), { target: { value: "200.000001" } });
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Incorrect entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await screen.findByText(/Review current revision/);
  expect(screen.getByLabelText("Amount paid")).toHaveValue("200.000001");
  const body = JSON.parse(fetch.mock.calls.find(([, options]) => options?.method === "POST")[1].body);
  expect(body).toMatchObject({ recipientId: 17, expectedRevision: 3, currencyId: 3, documentIds: [], reason: "Incorrect entry" });
  expect(body).not.toHaveProperty("confirmCommitmentDenomination");
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
});

test("uncertain correction reuses exact persisted command and accepts payment replay envelope", async () => {
  const data = envelope(); data.content[0].eligibility.canCorrect = true; let attempt = 0;
  setup(data, () => { if (++attempt === 1) throw new Error("Connection lost"); return reply({ voidedPayment: row(), payment: { ...row(), id: 42 } }, 201); });
  const view = mount(); fireEvent.click(await screen.findByRole("button", { name: "Correct payment #41" }));
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Correction" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" })); await screen.findByText(/Connection lost/);
  const original = fetch.mock.calls.find(([, options]) => options?.method === "POST")[1].body;
  view.unmount(); mount(); fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }));
  await waitFor(() => expect(sessionStorage.length).toBe(0));
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "POST")[1][1].body).toBe(original);
});

test.each(["void", "remove"])("reasoned %s uses the displayed revision", async kind => {
  const data = envelope(); data.content[0].eligibility.canVoid = true; setup(data); mount();
  fireEvent.click(await screen.findByRole("button", { name: kind === "void" ? "Void payment #41" : "Remove evidence #81" }));
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Wrong entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toContain(kind === "void" ? "/41/void" : "/41/documents/remove");
  expect(JSON.parse(options.body)).toMatchObject({ expectedRevision: 3, reason: "Wrong entry", ...(kind === "remove" ? { documentId: 81 } : {}) });
  await waitFor(() => expect(sessionStorage.length).toBe(0));
});

test("missing recipient is actionable and unavailable comparisons do not become zero", async () => {
  const data = envelope(); data.eligibility.canRecord = false; data.eligibility.recipient = null; data.eligibility.recordingIssues = [{ code: "RECIPIENT_UNAVAILABLE", message: "Approved order has no active recipient." }]; data.summary.status = "COMPARISON_UNAVAILABLE"; data.summary.recipientRemaining = null;
  setup(data); mount(); expect(await screen.findByText("Approved order has no active recipient.")).toBeInTheDocument();
  expect(screen.getByText("Recipient remaining").parentElement).toHaveTextContent("Unavailable");
  expect(screen.queryByRole("button", { name: "Record outgoing payment" })).not.toBeInTheDocument();
});

test("voided rows remain visible but cannot change evidence", async () => {
  const data = envelope(); data.content[0].status = "VOIDED"; data.content[0].voidReason = "Duplicate"; setup(data); mount();
  expect(await screen.findByText("Payment #41 · Voided")).toBeInTheDocument();
  expect(within(screen.getByRole("article", { name: "Payment 41" })).queryByRole("button", { name: /Remove evidence/ })).not.toBeInTheDocument();
});

test("exact precision and retained audit context", () => {
  for (const value of ["0", "-1", "0.0000001", "10000000000000000000"]) expect(paymentAmountError(value)).not.toBe("");
  expect(paymentAmountError("0.000001")).toBe(""); expect(paymentAmountError("1.23000000")).toBe("");
  render(<OutgoingPaymentAuditDetails event={{ parentPaymentOrderId: 12, outgoingPaymentContext: { version: 1, amount: "4000.000001", paidDate: "2026-09-25", recipientId: 17, currency: { id: 3, label: "USD" }, reason: "Duplicate", documentsBefore: [{ id: 81, label: "Original advice" }] } }} />);
  expect(screen.getByText("4000.000001")).toBeInTheDocument(); expect(screen.getByText("Original advice (#81)")).toBeInTheDocument();
});
