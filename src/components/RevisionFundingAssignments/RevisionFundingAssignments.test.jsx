import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AssignmentPanel } from "./RevisionFundingAssignments";

const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const envelope = () => ({ transactionId: 101, familyRevision: 8, executionRevision: 14, funding: { currency: { id: 3, name: "USD" }, approved: "10000.000", obligations: "7500.000000", unassignedApprovedFunding: "2500.000000" }, assignments: [], targets: [{ targetBudgetId: 27, targetCostDetailId: 272, maximumAdditionalAmount: "1500.000001", canAssign: true }], eligibility: { mayManageAssignments: true, canCreateAssignment: true, targetBudgetId: 27 }, issues: [] });
const row = () => ({ id: 7, revision: 2, allocationId: 310, originBudgetId: 26, targetBudgetId: 27, targetCostDetailId: 272, amount: "1500.000000", state: "ASSIGNED", minimumAmount: "900.000001", maximumAdditionalAmount: null, executionDecisionId: 51, eligibility: { canIncrease: false, canReduce: true, canRelease: false } });
const writes = () => fetch.mock.calls.filter(([, opts]) => ["POST", "PUT"].includes(opts?.method));
function mount(data = envelope(), save) {
  global.fetch = jest.fn(async (url, opts) => ["POST", "PUT"].includes(opts?.method) ? save?.(url, opts) || reply(data) : reply(data));
  return render(<BrowserRouter><AssignmentPanel transactionId={101} originBudgetId={26} /></BrowserRouter>);
}
function fill(amount) {
  fireEvent.change(screen.getByLabelText("Assignment amount"), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText("Assignment reason"), { target: { value: "Use available award" } });
  fireEvent.click(screen.getByRole("checkbox"));
}
test("creates one assignment with an exact string and observed revisions", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Assign unused funding to revised costs" }));
  fireEvent.change(screen.getByLabelText("Revised cost row"), { target: { value: "272" } });
  fill("1500.000001");
  fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ targetCostDetailId: 272, amount: "1500.000001", expectedFamilyRevision: 8, expectedExecutionRevision: 14, reason: "Use available award" });
  await waitFor(() => expect(screen.queryByLabelText("Assignment amount")).not.toBeInTheDocument());
});
test("a superseded target still permits reduction but not increased assignment", async () => {
  const data = { ...envelope(), assignments: [row()], eligibility: { canCreateAssignment: false, targetBudgetId: 28 } };
  mount(data);
  fireEvent.click(await screen.findByRole("button", { name: "Change amount #7" }));
  expect(screen.queryByLabelText("Revised cost row")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Release assignment #7" })).not.toBeInTheDocument();
  fill("1600"); fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await screen.findByText(/This amount change is not currently permitted/);
  expect(writes()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Assignment amount"), { target: { value: "900.000001" } });
  fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toContain("/revision-funding-assignments/7/amount");
  expect(JSON.parse(writes()[0][1].body)).toEqual({ amount: "900.000001", expectedAssignmentRevision: 2, expectedFamilyRevision: 8, expectedExecutionRevision: 14, reason: "Use available award" });
});
test("zero uses the amount update, preserving assignment identity", async () => {
  const existing = { ...row(), minimumAmount: "0", eligibility: { canReduce: true, canRelease: true } };
  mount({ ...envelope(), assignments: [existing] });
  fireEvent.click(await screen.findByRole("button", { name: "Release assignment #7" }));
  fill("0"); fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][1].method).toBe("PUT");
  expect(JSON.parse(writes()[0][1].body).amount).toBe("0");
});
test("conflict retains draft and refreshes without automatically adopting new revisions", async () => {
  const data = envelope();
  mount(data, () => { data.executionRevision = 15; return reply({ message: "Capacity changed", fieldErrors: { amount: "Insufficient unused funding" } }, 409); });
  fireEvent.click(await screen.findByRole("button", { name: "Assign unused funding to revised costs" }));
  fireEvent.change(screen.getByLabelText("Revised cost row"), { target: { value: "272" } });
  fill("1500.000001"); fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await screen.findByText(/Insufficient unused funding/);
  expect(screen.getByLabelText("Assignment amount")).toHaveValue("1500.000001");
  expect(screen.getByLabelText("Assignment reason")).toHaveValue("Use available award");
  expect(screen.getByRole("button", { name: "Save assignment" })).toBeDisabled();
  expect(writes()).toHaveLength(1);
  const review = screen.getByRole("button", { name: /I reviewed state and history/ });
  await waitFor(() => expect(review).toBeEnabled()); fireEvent.click(review);
  fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await waitFor(() => expect(writes()).toHaveLength(2));
  expect(JSON.parse(writes()[1][1].body).expectedExecutionRevision).toBe(15);
});
test("unavailable summaries stay unavailable and expose no mutation controls", async () => {
  mount({ ...envelope(), funding: { approved: "1000.000", obligations: null, unassignedApprovedFunding: null, currency: null }, eligibility: { mayManageAssignments: false, canCreateAssignment: false }, targets: [], issues: [{ message: "Funding comparison unavailable" }] });
  await screen.findByText("Funding comparison unavailable");
  expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Assign unused funding to revised costs" })).not.toBeInTheDocument();
});
