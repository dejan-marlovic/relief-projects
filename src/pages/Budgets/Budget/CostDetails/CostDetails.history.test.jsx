import { render, screen, waitFor } from "@testing-library/react";
import CostDetails from "./CostDetails";
jest.mock("../../../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true }) }));
jest.mock("./CostDetail/CostDetail", () => (props) => <div>{props.cost.costDescription}</div>);
test("budget refresh only reads persisted rows, never PUTs stale child inputs", async () => {
  let reads = 0;
  global.fetch = jest.fn((url) => {
    const body = url.includes("/by-budget/") ? [{ costDetailId: 81, costTypeId: 2, costId: 7, costDescription: ++reads === 1 ? "Original" : "Persisted result", amountLocalCurrency: "0.001", amountReportingCurrency: "0.002" }] : [];
    return Promise.resolve({ ok: true, status: 200, json: async () => body });
  });
  const props = { budgetId: 12, budget: { id: 12, lifecycleStatus: "DRAFT" }, exchangeRates: [] };
  const { rerender } = render(<CostDetails {...props} refreshTrigger={0} />);
  await screen.findByText("Original");
  rerender(<CostDetails {...props} refreshTrigger={1} />);
  await screen.findByText("Persisted result");
  await waitFor(() => expect(reads).toBe(2));
  expect(global.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  expect(screen.getByText(/Local: 0.001/)).toHaveTextContent("Reporting: 0.002");
});
