import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import BudgetExecution from "./BudgetExecution";

const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const state = () => ({ executionStatus: "NOT_ACTIVATED", originBudgetId: 1, currentPlanBudgetId: 2, executableBudgetId: null, familyRevision: 8, executionRevision: 13, obligations: null, uncommittedPlannedCapacity: null, coverage: { capacity: "NOT_ACTIVATED" }, currency: { id: 3, name: "USD" }, eligibility: { mayManageActivation: true, canRequestActivation: true }, buckets: [] });
const candidate = () => ({ expectedFamilyRevision: 8, expectedExecutionRevision: 13, expectedBudgetRevision: 19, donorDecisionId: 44, blockingIssues: [], eligibility: { canActivate: true }, limit: "99999999999999.000", plannedCosts: "1500.000", basis: [{ bucketId: 12, cap: "1500.000", obligations: "1499.999999", remaining: "0.000001" }] });
const writes = () => fetch.mock.calls.filter(([, opts]) => opts?.method === "POST");
function mount(data = state(), preview = candidate(), save) {
  global.fetch = jest.fn(async (url, opts) => opts?.method === "POST" ? save?.(url, opts) || reply({ ...data, executionStatus: "ACTIVE" }) : reply(url.includes("execution-candidates") ? preview : data));
  return render(<BrowserRouter><BudgetExecution familyId={7} budgetId={2} /></BrowserRouter>);
}
test("activation preserves exact preview amounts and sends only observed revisions and reason", async () => {
  mount();
  expect(await screen.findAllByText("Unavailable")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Preview activation of this budget" }));
  expect(await screen.findByText("0.000001")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Activation reason"), { target: { value: "Use approved plan" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm activation / reaffirmation" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedFamilyRevision: 8, expectedExecutionRevision: 13, expectedBudgetRevision: 19, donorDecisionId: 44, budgetId: 2, reason: "Use approved plan" });
  await waitFor(() => expect(screen.queryByLabelText("Activation reason")).not.toBeInTheDocument());
});
test("capacity blockers cannot be confirmed", async () => {
  mount(state(), { ...candidate(), blockingIssues: [{ message: "Retained obligations exceed bucket 12" }], eligibility: { canActivate: false } });
  fireEvent.click(await screen.findByRole("button", { name: "Preview activation of this budget" }));
  await screen.findByText("Retained obligations exceed bucket 12");
  expect(screen.getByRole("button", { name: "Confirm activation / reaffirmation" })).toBeDisabled();
  expect(writes()).toHaveLength(0);
});
test("uncertain activation retains reason and requires a fresh preview without replay", async () => {
  const data = state();
  mount(data, candidate(), () => { data.executionRevision = 14; return reply({ message: "Stale revision" }, 409); });
  fireEvent.click(await screen.findByRole("button", { name: "Preview activation of this budget" }));
  fireEvent.change(await screen.findByLabelText("Activation reason"), { target: { value: "Retain this reason" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm activation / reaffirmation" }));
  await screen.findByText(/Review refreshed execution and retained family history/);
  expect(screen.getByLabelText("Activation reason")).toHaveValue("Retain this reason");
  expect(screen.getByRole("button", { name: "Confirm activation / reaffirmation" })).toBeDisabled();
  expect(writes()).toHaveLength(1);
});
test("suspension is visible with retained capacity and read-only users have no activation action", async () => {
  mount({ ...state(), executionStatus: "SUSPENDED", executableBudgetId: 2, obligations: "900.000001", eligibility: { mayManageActivation: false } });
  expect(await screen.findByText(/Execution suspended/)).toBeInTheDocument();
  expect(screen.getByText("900.000001")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Preview activation/ })).not.toBeInTheDocument();
});
