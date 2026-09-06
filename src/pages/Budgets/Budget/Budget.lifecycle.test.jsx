import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Budget from "./Budget";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

jest.mock("../../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./CostDetails/CostDetails", () => () => <div>Cost details</div>);
jest.mock("exceljs", () => ({}));

const budget = {
  id: 7,
  projectId: 2,
  lifecycleStatus: "DRAFT",
  totalAmount: 100,
};

const jsonResponse = (body, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body == null ? "" : JSON.stringify(body)),
  });

const renderBudget = async (roles, overrides = {}, onUpdate = jest.fn()) => {
  useAuth.mockReturnValue({
    hasRole: (role) => roles.includes(role),
    hasAnyRole: (...allowed) => allowed.some((role) => roles.includes(role)),
  });
  render(
    <MemoryRouter><Budget budget={{ ...budget, ...overrides }} onUpdate={onUpdate} /></MemoryRouter>,
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  return onUpdate;
};

beforeEach(() => {
  localStorage.setItem("authToken", "test-token");
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse([]))
    .mockResolvedValueOnce(jsonResponse([]));
});

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

test.each([
  ["DRAFT", "Draft"],
  ["SUBMITTED", "Submitted"],
  ["APPROVED", "Approved"],
  ["RETURNED", "Returned"],
])("shows the %s lifecycle badge", async (status, label) => {
  await renderBudget(["VIEWER"], { lifecycleStatus: status });
  expect(screen.getByLabelText(`Budget status: ${label}`)).toBeInTheDocument();
});

test.each(["ADMIN", "FINANCE"])(
  "%s can submit a draft and receives the updated budget",
  async (role) => {
    const updated = { ...budget, lifecycleStatus: "SUBMITTED" };
    const onUpdate = jest.fn();
    await renderBudget([role], {}, onUpdate);
    fetch.mockResolvedValueOnce(jsonResponse(updated));

    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Budget status: Submitted")).toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/budgets/7/submit"),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      }),
    );
    expect(onUpdate).toHaveBeenCalledWith(updated);
    expect(screen.queryByRole("button", { name: "Submit for approval" })).not.toBeInTheDocument();
  },
);

test.each(["PROJECT_MANAGER", "APPROVER", "VIEWER"])(
  "%s cannot see Submit",
  async (role) => {
    await renderBudget([role]);
    expect(screen.queryByRole("button", { name: "Submit for approval" })).not.toBeInTheDocument();
  },
);

test("does not show Submit for a submitted budget", async () => {
  await renderBudget(["FINANCE"], { lifecycleStatus: "SUBMITTED" });
  expect(screen.queryByRole("button", { name: "Submit for approval" })).not.toBeInTheDocument();
});

test("requires header changes to be saved before submission", async () => {
  await renderBudget(["FINANCE"]);

  fireEvent.change(
    screen.getByPlaceholderText("Write a short note about this budget..."),
    {
    target: { name: "budgetDescription", value: "Unsaved revision" },
    },
  );

  const submit = screen.getByRole("button", { name: "Submit for approval" });
  expect(submit).toBeDisabled();
  expect(submit).toHaveAttribute(
    "title",
    "Save budget changes before submitting",
  );
});

test("shows a structured backend conflict inline", async () => {
  await renderBudget(["FINANCE"]);
  fetch.mockResolvedValueOnce(
    jsonResponse(
      {
        message: "Budget cannot be submitted because required information is incomplete.",
        dependencies: { costDetails: 0 },
      },
      409,
    ),
  );

  fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));

  expect(
    await screen.findByText(
      "Budget cannot be submitted because required information is incomplete.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Budget status: Draft")).toBeInTheDocument();
});

test.each([
  ["approve", "Approve budget", "APPROVED", "Approved"],
  ["return", "Return budget", "RETURNED", "Returned"],
])(
  "APPROVER can %s a submitted budget",
  async (action, buttonName, nextStatus, nextLabel) => {
    const updated = { ...budget, lifecycleStatus: nextStatus };
    const onUpdate = jest.fn();
    await renderBudget(
      ["APPROVER"],
      { lifecycleStatus: "SUBMITTED" },
      onUpdate,
    );
    fetch.mockResolvedValueOnce(jsonResponse(updated));

    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    if (action === "return") {
      expect(fetch).toHaveBeenCalledTimes(2);
      fireEvent.change(screen.getByLabelText("Return reason (required)"), { target: { value: "Correct the amounts." } });
      fireEvent.click(screen.getByRole("button", { name: "Confirm return" }));
    }

    await waitFor(() =>
      expect(
        screen.getByLabelText(`Budget status: ${nextLabel}`),
      ).toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining(`/api/budgets/7/${action}`),
      expect.objectContaining({ method: "POST" }),
    );
    expect(onUpdate).toHaveBeenCalledWith(updated);
  },
);

test("review controls are restricted to submitted budgets and reviewer roles", async () => {
  await renderBudget(["FINANCE"], { lifecycleStatus: "SUBMITTED" });
  expect(screen.queryByRole("button", { name: "Approve budget" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Return budget" })).not.toBeInTheDocument();
});

test.each(["SUBMITTED", "APPROVED"])(
  "%s budgets are read-only and cannot be deleted",
  async (status) => {
    await renderBudget(["ADMIN"], { lifecycleStatus: status });
    expect(
      screen.getByPlaceholderText("Write a short note about this budget..."),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete budget" })).not.toBeInTheDocument();
  },
);
