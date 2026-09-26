import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BudgetCurrencyDialog from "./BudgetCurrencyDialog";
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
const response = (body, status = 200) => ({ ok: status === 200, status, text: async () => JSON.stringify(body) });
const budget = { id: 42, localCurrencyId: 1, reportingCurrencySekId: 2, localCurrencyToGbpId: 3, reportingCurrencyEurId: 4 };
const currencies = [{ id: 1, name: "USD" }, { id: 2, name: "SEK" }, { id: 3, name: "GBP" }, { id: 4, name: "EUR" }];
const rates = [[40, 1, 2, "10.50000000"], [41, 2, 2, "1.00000000"], [42, 2, 3, "0.07000000"], [43, 2, 4, "0.08000000"], [44, 2, 1, "0.09500000"]].map(([id, baseCurrencyId, quoteCurrencyId, rate]) => ({ id, baseCurrencyId, quoteCurrencyId, rate, rateDate: "2026-09-21T12:00:00" }));
const pair = { oldValue: "9007199254740993.001", newValue: "94575592174780426.511" };
const preview = { eligible: true, previewToken: "opaque-token", expiresAt: "2099-09-21T12:00:00Z", sourceCurrency: { id: "1", label: "USD" }, targetCurrency: { id: "2", label: "SEK" }, budgetLimit: pair, plannedCosts: { oldValue: "0.000", newValue: "0.000" }, remainingToAllocate: pair, excess: "0.000", budgetLimitRoundingDelta: "0.0005", costDetails: [{ costDetailId: 7, unitPrice: { oldValue: "1.000000000001", newValue: "10.500000000011" }, amountLocalCurrency: { oldValue: "0.000", newValue: "0.000" }, unitPriceRoundingDelta: "0.0000000000005" }], warnings: [{ message: "A positive amount rounded to zero.", costDetailIds: [7] }], blockingIssues: [] };
function show(props = {}) {
  const callbacks = { onUpdated: jest.fn(), onClose: jest.fn(), onKeep: jest.fn(), onDiscard: jest.fn() };
  const view = render(<BudgetCurrencyDialog budget={budget} currencies={currencies} rates={rates} {...callbacks} {...props} />);
  return { ...callbacks, ...view };
}
function choose() {
  fireEvent.click(screen.getByLabelText("Convert the saved limit and cost details"));
  fireEvent.change(screen.getByLabelText("New local currency"), { target: { value: "2" } });
  [/Conversion rate:/, /Reporting rate:/, /GBP rate:/, /EUR rate:/].forEach((label, index) => fireEvent.change(screen.getByLabelText(label), { target: { value: String(40 + index) } }));
}
async function getPreview() { fireEvent.click(screen.getByText("Preview conversion")); await screen.findByRole("region", { name: "Conversion preview" }); }
function confirm() { fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByText("Confirm conversion")); }
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue(response(preview)); localStorage.setItem("authToken", "token"); });
afterEach(() => localStorage.clear());

test("explicit selections send only six IDs; confirmation sends only the opaque token and keeps exact strings", async () => {
  const { onUpdated, onClose } = show(); choose();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText(/0.09500000/)).not.toBeInTheDocument();
  await getPreview();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ sourceCurrencyId: 1, targetCurrencyId: 2, conversionExchangeRateId: 40, reportingExchangeRateSekId: 41, localExchangeRateToGbpId: 42, reportingExchangeRateEurId: 43 });
  expect(screen.getAllByText(pair.newValue)).toHaveLength(2);
  expect(screen.getByText("10.500000000011")).toBeInTheDocument();
  expect(screen.getByText(/positive amount rounded to zero/)).toHaveTextContent("7");
  expect(screen.getByText("Confirm conversion")).toBeDisabled();
  const updated = { ...budget, localCurrencyId: 2, totalAmount: pair.newValue };
  fetch.mockResolvedValueOnce(response(updated)); confirm();
  await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ previewToken: "opaque-token" });
  expect(fetch.mock.calls[1][0]).not.toContain("opaque-token");
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(localStorage.length).toBe(1);
});
test("changing a rate or mode clears the preview and acknowledgement", async () => {
  show(); choose(); await getPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText(/GBP rate:/), { target: { value: "" } });
  expect(screen.queryByText("Confirm conversion")).not.toBeInTheDocument();
  expect(screen.getByText("Preview conversion")).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Keep entered values — no conversion"));
  expect(screen.queryByRole("region", { name: "Conversion preview" })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});
test("unsaved edits block preview until explicitly discarded; keep-values is a separate save", () => {
  const { onDiscard, onKeep } = show({ dirty: true, initialTargetId: 2, keepReady: true }); choose();
  expect(screen.getByText("Preview conversion")).toBeDisabled();
  fireEvent.click(screen.getByText("Discard header edits for conversion")); expect(onDiscard).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByLabelText("Keep entered values — no conversion"));
  expect(screen.getByText(/every retained cost-detail unit price/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Confirm and save entered values")); expect(onKeep).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});
test("ineligible preview shows blockers with IDs and unknown totals, never a confirm button", async () => {
  fetch.mockResolvedValueOnce(response({ ...preview, eligible: false, previewToken: null, budgetLimit: { oldValue: "1000", newValue: null }, blockingIssues: [{ message: "Restore deleted rows first.", costDetailIds: [7, 9] }] }));
  show(); choose(); await getPreview();
  expect(screen.getByRole("alert")).toHaveTextContent("7, 9");
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  expect(screen.queryByText("Confirm conversion")).not.toBeInTheDocument();
});
test("missing signing configuration is actionable and does not disable keep-values", async () => {
  fetch.mockResolvedValueOnce(response({ code: "CONVERSION_NOT_CONFIGURED" }, 503)); show(); choose();
  fireEvent.click(screen.getByText("Preview conversion"));
  expect(await screen.findByRole("alert")).toHaveTextContent("BUDGET_CONVERSION_SIGNING_SECRET");
  fireEvent.click(screen.getByLabelText("Keep entered values — no conversion"));
  expect(screen.getByText("Return to budget form")).toBeEnabled();
});
test.each(["stale", "network"])("%s confirmation requires reload without an automatic retry", async (kind) => {
  const { onUpdated } = show(); choose(); await getPreview();
  if (kind === "stale") fetch.mockResolvedValueOnce(response({}, 409)); else fetch.mockRejectedValueOnce(new Error("network"));
  confirm();
  await screen.findByRole("alert");
  expect(screen.getByText("Preview conversion")).toBeDisabled();
  expect(screen.getByText("Close")).toBeDisabled();
  expect(fetch).toHaveBeenCalledTimes(2);
  fetch.mockResolvedValueOnce(response(budget)); fireEvent.click(screen.getByText("Reload saved budget"));
  await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(budget));
  expect(fetch.mock.calls[2][0]).toMatch(/\/api\/budgets\/42$/);
});
