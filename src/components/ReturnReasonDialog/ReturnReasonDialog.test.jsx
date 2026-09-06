import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReturnReasonDialog, { normalizeReturnReason } from "./ReturnReasonDialog";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
const response = (body, status = 200) => ({ ok: status === 200, status, text: async () => JSON.stringify(body) });
const show = (endpoint = "/api/budgets/7/return") => {
  const onSuccess = jest.fn(); const onCancel = jest.fn();
  render(<ReturnReasonDialog endpoint={endpoint} recordLabel="record #7" onSuccess={onSuccess} onCancel={onCancel} />);
  return { onSuccess, onCancel };
};
const type = (value) => fireEvent.change(screen.getByLabelText("Return reason (required)"), { target: { value } });
const confirm = () => fireEvent.click(screen.getByText("Confirm return"));
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue(response({ id: 7, lifecycleStatus: "RETURNED" })); localStorage.setItem("authToken", "token"); mockNavigate.mockClear(); });
afterEach(() => localStorage.clear());

test.each(["budgets", "transactions", "payment-orders"])("sends normalized reason to %s and updates only on success", async (resource) => {
  const { onSuccess } = show(`/api/${resource}/7/return`);
  expect(fetch).not.toHaveBeenCalled();
  type("\u2007  Correct amounts.\nKeep receipts. \u001c"); confirm();
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 7, lifecycleStatus: "RETURNED" }));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/${resource}/7/return`), expect.objectContaining({
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify({ reason: "Correct amounts.\nKeep receipts." }),
  }));
});

test("rejects blank and oversized reasons, counts emoji as code points", async () => {
  show(); type("\u3000 \n\u00a0"); confirm();
  expect(screen.getByText("A return reason is required.")).toBeInTheDocument();
  type("😀".repeat(2001)); confirm();
  expect(screen.getByText("Return reason must be at most 2000 characters.")).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  type(" 😀" + "😀".repeat(1999) + " "); confirm();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(normalizeReturnReason("\u2007a\nb\u202f")).toBe("a\nb");
});

test("keeps text and displays backend field errors, then permits retry", async () => {
  fetch.mockResolvedValueOnce(response({ message: "Validation failed.", fieldErrors: { reason: "Reason rejected." } }, 400));
  const { onSuccess } = show(); type("Please fix it."); confirm();
  expect(await screen.findByText("Reason rejected.")).toBeInTheDocument();
  expect(screen.getByLabelText("Return reason (required)")).toHaveValue("Please fix it.");
  expect(onSuccess).not.toHaveBeenCalled();
  type("Correct the allocation."); confirm();
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
});

test.each([403, 404, 409, 500])("handles %s with text retained and no success callback", async (status) => {
  fetch.mockResolvedValue(response(null, status));
  const { onSuccess } = show(); type("Fix allocation."); confirm();
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Return reason (required)")).toHaveValue("Fix allocation.");
  expect(onSuccess).not.toHaveBeenCalled();
});

test("uses authentication flow on 401", async () => {
  fetch.mockResolvedValue(response(null, 401)); show(); type("Fix allocation."); confirm();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true }));
  expect(localStorage.getItem("authToken")).toBeNull();
});

test("cancel sends nothing and pending submissions cannot be repeated", async () => {
  let finish;
  fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { onCancel } = show();
  fireEvent.click(screen.getByText("Cancel")); expect(onCancel).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
  type("Fix allocation."); confirm();
  fireEvent.submit(screen.getByText("Returning…").closest("form"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Cancel")).toBeDisabled();
  await act(async () => finish(response({ id: 7 })));
});
