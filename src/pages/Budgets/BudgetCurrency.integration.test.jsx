import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Budget from "./Budget/Budget";
import UpdateBudget from "../Admin/UpdateBudget/UpdateBudget";

jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasRole: () => true, hasAnyRole: () => true }) }));
jest.mock("exceljs", () => ({}));
jest.mock("./Budget/CostDetails/CostDetails", () => (props) => <output aria-label="Cost refresh">{props.refreshTrigger}:{props.budget.localCurrencyId}</output>);
jest.mock("../../components/BudgetPlanning/BudgetPlanning", () => (props) => <output aria-label="Planning refresh">{props.refreshKey}:{props.budget.totalAmount}</output>);
jest.mock("../../components/RecordHistory/RecordHistory", () => (props) => <output aria-label="History refresh">{props.refreshKey}</output>);
jest.mock("../../components/FinancialDocuments/FinancialDocuments", () => (props) => <output aria-label="Documents refresh">{props.refreshKey}</output>);
jest.mock("../../components/BudgetCurrencyDialog/BudgetCurrencyDialog", () => (props) => <section aria-label="Currency dialog">
  <output aria-label="Header dirty">{String(props.dirty)}</output>
  <button onClick={props.onDiscard}>Discard for conversion</button>
  <button onClick={props.onKeep}>Keep confirmed</button>
  <button disabled={props.dirty} onClick={() => { props.onUpdated({ ...props.budget, localCurrencyId: 2, totalAmount: "9007199254740993.001", budgetLimitCurrencyId: 2 }); props.onClose(); }}>Complete conversion</button>
</section>);
const currencies = [{ id: 1, name: "USD" }, { id: 2, name: "GBP" }, { id: 3, name: "SEK" }, { id: 4, name: "EUR" }];
const rates = [1, 2].flatMap((base) => [2, 3, 4].map((quote) => ({ id: base * 10 + quote, baseCurrencyId: base, quoteCurrencyId: quote, rate: "1.00000000" })));
const saved = { id: 7, projectId: 2, budgetName: "Test budget", budgetDescription: "Original", lifecycleStatus: "DRAFT", totalAmount: "100.000", localCurrencyId: 1, localCurrencyToGbpId: 2, reportingCurrencySekId: 3, reportingCurrencyEurId: 4, localExchangeRateToGbpId: 12, reportingExchangeRateSekId: 13, reportingExchangeRateEurId: 14 };
const response = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
beforeEach(() => {
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === "PUT") return response({ ...saved, ...JSON.parse(options.body) });
    return response(url.includes("exchange-rates") ? rates : url.includes("currencies") ? currencies : url.includes("budgets/active") ? [saved] : [{ id: 2, projectName: "Test project" }]);
  });
  jest.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
async function mount(admin) {
  const onUpdate = jest.fn();
  render(<MemoryRouter>{admin ? <UpdateBudget /> : <Budget budget={saved} onUpdate={onUpdate} />}</MemoryRouter>);
  if (admin) { await screen.findByText(/Test budget/); fireEvent.change(screen.getByDisplayValue("Select budget"), { target: { value: "7" } }); }
  await screen.findByDisplayValue(admin ? /^USD -/ : "USD");
  return onUpdate;
}
test.each([false, true])("admin=%s: conversion updates exact saved values and refreshes dependent views", async (admin) => {
  const onUpdate = await mount(admin);
  fireEvent.click(screen.getByText("Change budget currency"));
  expect(screen.getByLabelText("Header dirty")).toHaveTextContent("false");
  fireEvent.click(screen.getByText("Complete conversion"));
  expect(screen.queryByRole("region", { name: "Currency dialog" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Planning refresh")).toHaveTextContent("1:9007199254740993.001");
  expect(onUpdate).toHaveBeenCalledTimes(admin ? 0 : 1);
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.includes("exchange-rates"))).toHaveLength(2));
});
test("main budget propagates the conversion to its parent and mounted children", async () => {
  const onUpdate = await mount(false);
  fireEvent.click(screen.getByText("Change budget currency"));
  fireEvent.click(screen.getByText("Complete conversion"));
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: "9007199254740993.001", localCurrencyId: 2 }));
  expect(screen.getByLabelText("Cost refresh")).toHaveTextContent("1:2");
  expect(screen.getByLabelText("History refresh")).toHaveTextContent("1");
  expect(screen.getByLabelText("Documents refresh")).toHaveTextContent("1");
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.includes("exchange-rates"))).toHaveLength(2));
});
test.each([false, true])("admin=%s: unsaved header changes must be explicitly discarded before conversion", async (admin) => {
  await mount(admin);
  fireEvent.change(screen.getByLabelText("Budget name"), { target: { name: "budgetName", value: "Unsaved name" } });
  fireEvent.click(screen.getByText("Change budget currency"));
  expect(screen.getByText("Complete conversion")).toBeDisabled();
  fireEvent.click(screen.getByText("Discard for conversion"));
  expect(screen.getByLabelText("Budget name")).toHaveValue("Test budget");
  expect(screen.getByText("Complete conversion")).toBeEnabled();
});
test.each([false, true])("admin=%s: currency selection does not write; explicit keep confirmation uses ordinary PUT", async (admin) => {
  await mount(admin);
  const change = (name, value) => fireEvent.change(screen.getAllByRole("combobox").find((element) => element.getAttribute("name") === name), { target: { name, value } });
  change("localCurrencyId", "2");
  change("localExchangeRateToGbpId", "22"); change("reportingExchangeRateSekId", "23"); change("reportingExchangeRateEurId", "24");
  fireEvent.click(screen.getByRole("button", { name: admin ? "Update budget" : "Save changes", exact: true }));
  expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  expect(screen.getByRole("region", { name: "Currency dialog" })).toBeInTheDocument();
  fireEvent.click(screen.getByText("Keep confirmed"));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(true));
  const [url, options] = fetch.mock.calls.find(([, options]) => options?.method === "PUT");
  expect(url).toMatch(/\/api\/budgets\/7$/);
  expect(JSON.parse(options.body)).toMatchObject({ totalAmount: "100.000", confirmedLocalCurrencyId: 2, localCurrencyId: 2 });
  await waitFor(() => expect(screen.getByLabelText("Planning refresh")).toHaveTextContent("1:100.000"));
});
