import { act, render, screen, waitFor } from "@testing-library/react";
import CostDetails from "./CostDetails";
jest.mock("../../../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true }) }));
jest.mock("./CostDetail/CostDetail", () => (props) => <div>{props.cost.costDescription}</div>);

test("recalculation waits for every request and reloads persisted rows after partial failure", async () => {
  const onMutationSuccess = jest.fn();
  const row = { costDetailId: 81, budgetId: 12, costTypeId: 2, costId: 7, costDescription: "Original", noOfUnits: 2, unitPrice: 100 };
  let finishFirst, finishSecond;
  let reads = 0;
  global.fetch = jest.fn((url, options) => {
    if (options?.method === "PUT") return new Promise((resolve) => {
      if (url.endsWith("/81")) finishFirst = resolve; else finishSecond = resolve;
    });
    let body = [];
    if (url.includes("/by-budget/")) {
      reads += 1;
      body = reads === 1 ? [row, { ...row, costDetailId: 82 }] : [{ ...row, costDescription: "Persisted result" }];
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => body });
  });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  render(<CostDetails budgetId={12} refreshTrigger={1} budget={{ id: 12, lifecycleStatus: "DRAFT" }} exchangeRates={[]} onMutationSuccess={onMutationSuccess} />);
  await waitFor(() => expect(finishSecond).toBeDefined());
  await act(async () => { finishFirst({ ok: true }); });
  expect(onMutationSuccess).not.toHaveBeenCalled();
  await act(async () => { finishSecond({ ok: false, status: 409, text: async () => JSON.stringify({ message: "Conflict" }) }); });
  await waitFor(() => expect(onMutationSuccess).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Persisted result")).toBeInTheDocument();
  expect(screen.getByText(/Some cost details could not be recalculated/)).toBeInTheDocument();
  expect(reads).toBe(2);
  log.mockRestore();
});
