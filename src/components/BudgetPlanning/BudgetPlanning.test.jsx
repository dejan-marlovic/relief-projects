import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BudgetPlanning from "./BudgetPlanning";
import { budgetLimitError } from "../../utils/budgetLimit";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true }) }));
const budget = { id: 2, lifecycleStatus: "DRAFT", totalAmount: "100.000", localCurrencyId: 3 };
const summary = { budgetId: 2, budgetLimit: "100.000", plannedCosts: "120.000", remainingToAllocate: null, limitCurrencyConfirmed: false, localCurrency: { id: 3, name: "USD" }, status: "UNCONFIRMED", invalidCostDetailIds: [] };
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => { global.fetch = jest.fn(async (url, options) => response(options?.method === "PUT" ? { ...budget, budgetLimitCurrencyId: 3 } : summary)); });
test("requires explicit confirmation and saves only exact limit and currency", async () => {
  const updated = jest.fn();
  render(<BudgetPlanning budget={budget} onUpdated={updated} />);
  await screen.findByText("Local-currency meaning not confirmed");
  expect(screen.getByText("Save budget limit")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Set or confirm budget limit"), { target: { value: "999999999999999999.999" } });
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByText("Save budget limit"));
  await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
  const writes = fetch.mock.calls.filter(([, options]) => options?.method === "PUT");
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toMatch(/\/budgets\/2\/limit$/);
  expect(JSON.parse(writes[0][1].body)).toEqual({ totalAmount: "999999999999999999.999", confirmedLocalCurrencyId: 3 });
});
test("shows unavailable partial costs without fabricating capacity", async () => {
  fetch.mockResolvedValue(response({ ...summary, status: "UNAVAILABLE", plannedCosts: null, knownPlannedCosts: "45.001", invalidCostDetailIds: [8] }));
  render(<BudgetPlanning budget={budget} />);
  await screen.findByText("Planning total unavailable");
  expect(screen.getByText(/Known valid subtotal/)).toHaveTextContent("45.001 (partial, not total)");
  expect(screen.getByText(/Known valid subtotal/)).toHaveTextContent("8");
  expect(screen.getByText(/Confirm or correct/)).toBeInTheDocument();
});
test("negative capacity remains visible and approved budgets have no adoption form", async () => {
  fetch.mockResolvedValue(response({ ...summary, status: "OVER_LIMIT", limitCurrencyConfirmed: true, remainingToAllocate: "-20.000" }));
  render(<BudgetPlanning budget={{ ...budget, lifecycleStatus: "APPROVED" }} />);
  await screen.findByText("-20.000");
  expect(screen.queryByText("Save budget limit")).not.toBeInTheDocument();
});
test("limit failures remain errors and do not announce a successful save", async () => {
  fetch.mockImplementation(async (url, options) => options?.method === "PUT" ? response({ message: "Limit 100.000, proposed 100.001, excess 0.001 USD." }, 400) : response(summary));
  const updated = jest.fn(); render(<BudgetPlanning budget={budget} onUpdated={updated} />);
  await screen.findByText("Local-currency meaning not confirmed");
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByText("Save budget limit"));
  expect(await screen.findByRole("alert")).toHaveTextContent("excess 0.001 USD");
  expect(updated).not.toHaveBeenCalled();
});
test("limit validation is exact at storage and three-place boundaries", () => {
  expect(budgetLimitError("999999999999999999.999")).toBe("");
  expect(budgetLimitError("0.0010000")).toBe("");
  for (const value of ["0", "-1", "0.0001", "1000000000000000000", "1.0001"]) expect(budgetLimitError(value)).not.toBe("");
});
