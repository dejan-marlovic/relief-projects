import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ApprovalDialog from "./ApprovalDialog";

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
const record = { id: 7, lifecycleStatus: "SUBMITTED", approvedAmount: "100" };
const eligibility = { entityId: 7, submissionId: 301, canAttemptApproval: true, issues: [] };
const setup = (resource = "transactions") => {
  const callbacks = { onRefresh: jest.fn(), onSuccess: jest.fn(), onCancel: jest.fn() };
  render(<MemoryRouter><ApprovalDialog endpoint={`/api/${resource}/7`} recordLabel="test record" {...callbacks} /></MemoryRouter>);
  return callbacks;
};
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { localStorage.clear(); });

test.each(["budgets", "transactions", "payment-orders"])("%s approval sends only the reviewed submission identity", async resource => {
  fetch.mockResolvedValueOnce(response(record)).mockResolvedValueOnce(response(eligibility)).mockResolvedValueOnce(response({ ...record, lifecycleStatus: "APPROVED" }));
  const callbacks = setup(resource);
  expect(screen.queryByRole("button", { name: "Confirm approval" })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(callbacks.onSuccess).toHaveBeenCalled());
  expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining(`/api/${resource}/7/approve`), expect.objectContaining({ method: "POST", body: '{"expectedSubmissionId":301}' }));
});

test.each(["SELF_APPROVAL_NOT_ALLOWED", "APPROVAL_PROVENANCE_UNAVAILABLE", "APPROVAL_ROLE_REQUIRED"])("server %s reason blocks approval without a POST", async code => {
  fetch.mockResolvedValueOnce(response(record)).mockResolvedValueOnce(response({ ...eligibility, canAttemptApproval: false, issues: [{ code, message: "Server restriction: no approval." }] }));
  setup();
  await screen.findByText("Server restriction: no approval.");
  expect(screen.queryByRole("button", { name: "Confirm approval" })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("stale submission never retries automatically and fresh review uses a new token", async () => {
  fetch.mockResolvedValueOnce(response(record)).mockResolvedValueOnce(response(eligibility))
    .mockResolvedValueOnce(response({ code: "APPROVAL_SUBMISSION_CHANGED", message: "Submission changed." }, 409));
  setup();
  fireEvent.click(await screen.findByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await screen.findByText(/Submission changed/);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole("button", { name: "Confirm approval" })).not.toBeInTheDocument();
  fetch.mockResolvedValueOnce(response(record)).mockResolvedValueOnce(response({ ...eligibility, submissionId: 302 }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh for review" }));
  const review = await screen.findByRole("checkbox");
  expect(review).not.toBeChecked();
  fetch.mockResolvedValueOnce(response({ ...record, lifecycleStatus: "APPROVED" }));
  fireEvent.click(review);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
  expect(fetch.mock.calls[5][1].body).toBe('{"expectedSubmissionId":302}');
});

test("unavailable eligibility and missing tokens fail closed", async () => {
  fetch.mockResolvedValueOnce(response(record)).mockResolvedValueOnce(response({ message: "Unavailable" }, 503));
  setup();
  await screen.findByText("Unavailable");
  expect(screen.queryByRole("button", { name: "Confirm approval" })).not.toBeInTheDocument();
  fetch.mockResolvedValueOnce(response(record)).mockResolvedValueOnce(response({ ...eligibility, submissionId: null }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh for review" }));
  await screen.findByText("Approval is unavailable for this submission.");
  expect(screen.queryByRole("button", { name: "Confirm approval" })).not.toBeInTheDocument();
});
