import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateTransaction from "./CreateTransaction/CreateTransaction";
import UpdateTransaction from "./UpdateTransaction/UpdateTransaction";
const saved = { id: 1, projectId: 1, budgetId: 1, organizationId: 1, financierOrganizationId: 1, transactionStatusId: 1, appliedForAmount: "0.000", approvedAmount: "0.000", datePlanned: "2026-10-01T00:00:00", ownContribution: "No", okStatus: "No" };
const response = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
beforeEach(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {});
  global.fetch = jest.fn(async (url, options) => response(options?.method ? saved : url.includes("/transactions/") ? [saved] : [{ id: 1, projectId: 1, name: "Reference", projectName: "Project", budgetName: "Budget", organizationName: "Organization" }]));
});
afterEach(() => jest.restoreAllMocks());
test.each([[false, false], [true, false], [false, true], [true, true]])("Admin update=%s preserves decimal payloads and displays server field errors", async (update, obsolete) => {
  const view = render(<MemoryRouter>{update ? <UpdateTransaction /> : <CreateTransaction />}</MemoryRouter>);
  await screen.findByRole("button", { name: update ? "Update transaction" : "Create transaction" });
  if (update) {
    await screen.findByRole("option", { name: /^Project - Status #1/ });
    fireEvent.change(screen.getByDisplayValue("Select transaction"), { target: { value: "1" } });
  }
  // Existing reference/date controls do not all have associated labels.
  const change = (name, value) => {
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    fireEvent.change(view.container.querySelector(`[name="${name}"]`), { target: { name, value } });
  };
  for (const name of ["projectId", "organizationId", "budgetId", "financierOrganizationId", "transactionStatusId"]) change(name, "1");
  change("datePlanned", "2026-10-01T00:00");
  for (const [label, value] of [["Requested funding", "9999999999999999999.999"], ["Approved funding", "90.000"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fetch.mockImplementationOnce(async () => response(obsolete ? { message: "Transaction share fields have been removed. Omit firstShareAmount from the request.", fieldErrors: { firstShareAmount: "This field has been removed. Omit it from the request." } } : { message: "Funding floor", fieldErrors: { approvedAmount: "Must cover 90.000001" } }, 400));
  fireEvent.click(screen.getByRole("button", { name: update ? "Update transaction" : "Create transaction" }));
  if (obsolete) {
    expect(await screen.findByText(/Transaction share fields have been removed/)).toBeInTheDocument();
  } else {
    expect(await screen.findByText("Must cover 90.000001")).toBeInTheDocument();
    expect(screen.getByLabelText("Approved funding")).toHaveAttribute("aria-invalid", "true");
  }
  const [, options] = fetch.mock.calls.find(([, opts]) => opts?.method);
  expect(JSON.parse(options.body)).toMatchObject({ appliedForAmount: "9999999999999999999.999", approvedAmount: "90.000", });
  expect(JSON.parse(options.body)).not.toHaveProperty("firstShareAmount");
  expect(JSON.parse(options.body)).not.toHaveProperty("secondShareAmount");
  expect(screen.queryByLabelText(/share/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Requested funding")).toHaveDisplayValue("9999999999999999999.999");
  fireEvent.change(screen.getByLabelText("Approved funding"), { target: { value: "90.000001" } });
  fireEvent.click(screen.getByRole("button", { name: update ? "Update transaction" : "Create transaction" }));
  expect(await screen.findByText(/Use at most 19 integer digits/)).toBeInTheDocument();
  expect(fetch.mock.calls.filter(([, opts]) => opts?.method)).toHaveLength(1);
});
