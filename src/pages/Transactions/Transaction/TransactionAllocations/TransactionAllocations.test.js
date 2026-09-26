import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TransactionAllocations, { getCostDetailPlannedAmount } from "./TransactionAllocations";

describe("transaction allocation defaults", () => {
  test("uses the cost detail local amount as the planned amount", () => {
    expect(
      getCostDetailPlannedAmount({ amountLocalCurrency: "1250.75" })
    ).toBe("1250.75");
  });

  test("keeps the field empty when the cost detail has no valid amount", () => {
    expect(getCostDetailPlannedAmount({ amountLocalCurrency: null })).toBe("");
    expect(getCostDetailPlannedAmount({ amountLocalCurrency: "invalid" })).toBe("");
  });
});


test("editing preserves allocation identity and refreshes only after success", async () => {
  const onMutationSuccess = jest.fn();
  let rejectSave = false;
  const row = { id: 81, costDetailId: 15, plannedAmount: 100, note: "Old note" };
  global.fetch = jest.fn(async (url, options) => {
    const saving = options?.method === "PUT";
    const body = saving ? (rejectSave ? { message: "Ownership changed" } : row)
      : url.includes("/cost-allocations/transaction/") ? [row]
      : url.includes("/transactions/") ? { approvedAmount: 1000 } : [];
    return { ok: !(saving && rejectSave), status: saving && rejectSave ? 409 : 200,
      json: async () => body, text: async () => JSON.stringify(body) };
  });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  render(<TransactionAllocations txId={42} canManage onMutationSuccess={onMutationSuccess} />);
  fireEvent.change(await screen.findByDisplayValue("Old note"), { target: { value: "Changed note" } });
  fireEvent.click(screen.getByRole("button", { name: "Save allocation" }));
  await waitFor(() => expect(onMutationSuccess).toHaveBeenCalledTimes(1));
  const save = fetch.mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(save[1].body)).toEqual({ id: 81, transactionId: 42, costDetailId: 15, plannedAmount: "100", note: "Changed note" });
  rejectSave = true;
  fireEvent.click(screen.getByRole("button", { name: "Save allocation" }));
  await screen.findByText("Ownership changed");
  expect(onMutationSuccess).toHaveBeenCalledTimes(1);
  log.mockRestore();
});
test("capacity retains a six-decimal shortfall and refreshes when header funding changes", async () => {
  let approvedAmount = "90.000";
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes("cost-allocations") ? [{ id: 1, plannedAmount: "90.000001" }] : { approvedAmount, fundingCurrency: { source: "CURRENT_BUDGET_CONFIGURATION", availability: "AVAILABLE", currency: { id: 3, name: "SEK" } } } }));
  const { rerender } = render(<TransactionAllocations txId={42} refreshKey={0} />);
  expect(await screen.findByText(/Remaining for allocation: -0.000001 SEK/)).toBeInTheDocument();
  approvedAmount = "90.001";
  rerender(<TransactionAllocations txId={42} refreshKey={1} />);
  expect(await screen.findByText(/Remaining for allocation: 0.000999 SEK/)).toBeInTheDocument();
});
