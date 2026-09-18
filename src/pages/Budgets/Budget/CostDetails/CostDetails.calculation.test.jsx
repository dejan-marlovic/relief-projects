import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CostDetails from "./CostDetails";
jest.mock("../../../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true }) }));
test("create uses defaults, sends inputs only, preserves failed drafts and displays authoritative success", async () => {
  let reject = true, saved = false;
  const onMutationSuccess = jest.fn();
  const row = { costDetailId: 42, costTypeId: 1, costId: 2, costDescription: "Materials", noOfUnits: 1, frequencyMonths: 1, unitPrice: "0.00", percentageCharging: "100.000", amountLocalCurrency: "0.000", amountReportingCurrency: "0.000", amountGBP: "0.000", amountEuro: "0.000" };
  global.fetch = jest.fn(async (url, options) => {
    const create = options?.method === "POST";
    if (create && !reject) saved = true;
    const body = create ? reject ? { message: "Invalid configuration", fieldErrors: { reportingExchangeRateSekId: "Choose a valid reporting rate" } } : row
      : url.includes("/cost-types/") ? [{ id: 1, costTypeName: "Direct" }]
      : url.includes("/costs/") ? [{ id: 2, costTypeId: 1, costName: "Materials" }] : saved ? [row] : [];
    return { ok: !(create && reject), status: create && reject ? 400 : 200, json: async () => body, text: async () => JSON.stringify(body) };
  });
  render(<CostDetails budgetId={7} budget={{ id: 7, lifecycleStatus: "DRAFT" }} exchangeRates={[]} onMutationSuccess={onMutationSuccess} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  fireEvent.click(screen.getByRole("button", { name: /New Cost Detail/ }));
  expect(screen.getByPlaceholderText("Periods")).toHaveValue(1);
  expect(screen.getByPlaceholderText("Allocated %")).toHaveValue(100);
  fireEvent.change(screen.getByPlaceholderText("Description"), { target: { value: "Materials" } });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "1" } });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "2" } });
  fireEvent.click(screen.getByTitle("Save"));
  await screen.findByText(/Choose a valid reporting rate/);
  expect(screen.getByPlaceholderText("Description")).toHaveValue("Materials");
  expect(onMutationSuccess).not.toHaveBeenCalled();
  const request = JSON.parse(fetch.mock.calls.find(([, options]) => options?.method === "POST")[1].body);
  expect(request).toEqual({ budgetId: 7, costTypeId: 1, costId: 2, costDescription: "Materials", noOfUnits: 1, frequencyMonths: 1, unitPrice: "0.00", percentageCharging: "100" });
  reject = false;
  fireEvent.click(screen.getByTitle("Save"));
  await waitFor(() => expect(onMutationSuccess).toHaveBeenCalledTimes(1));
  expect(screen.queryByTitle("Save")).not.toBeInTheDocument();
  expect(screen.getByText(/Total \(Category\)/)).toHaveTextContent("Local: 0.000");
});
