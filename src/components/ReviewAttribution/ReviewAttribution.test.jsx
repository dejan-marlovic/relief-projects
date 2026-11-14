import { render, screen } from "@testing-library/react";
import ReviewAttribution, { currentReview } from "./ReviewAttribution";

const submit = { action: "SUBMIT", previousState: "DRAFT", newState: "SUBMITTED", performedByDisplay: "Mira" };
const approve = { action: "APPROVE", previousState: "SUBMITTED", newState: "APPROVED", performedByDisplay: "Dejan" };
test("shows recorded submitter and independent approver", () => {
  render(<ReviewAttribution {...currentReview([approve, submit], "APPROVED")} />);
  expect(screen.getByText("Mira")).toBeInTheDocument();
  expect(screen.getByText("Dejan")).toBeInTheDocument();
});
test("does not reuse an earlier approval after return and resubmission", () => {
  expect(currentReview([submit, { action: "RETURN", previousState: "APPROVED", newState: "RETURNED" }, approve], "SUBMITTED")).toEqual({ submission: { actor: { displayName: "Mira" } } });
  expect(currentReview([approve, submit], "SUBMITTED")).toEqual({});
});
test("retained decisions are not presented as current on returned records", () => {
  render(<ReviewAttribution status="RETURNED" submission={{ actor: { username: "old" } }} />);
  expect(screen.queryByLabelText("Review attribution")).not.toBeInTheDocument();
});
test("acceptance is labelled accurately and missing actors are not invented", () => {
  render(<ReviewAttribution status="ACCEPTED" approval={{}} approvalLabel="Accepted by" />);
  expect(screen.getByText("Accepted by")).toBeInTheDocument();
  expect(screen.getByText("Not recorded")).toBeInTheDocument();
});

test("loads financial attribution from the record's audit history", async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ content: [approve, submit].map(e => ({ ...e, entityType: "BUDGET", entityId: 7 })), totalPages: 1 }) });
  try {
    const { MemoryRouter } = require("react-router-dom");
    const { FinancialReviewAttribution } = require("./ReviewAttribution");
    render(<MemoryRouter><FinancialReviewAttribution entityType="BUDGET" entityId={7} status="APPROVED" /></MemoryRouter>);
    expect(await screen.findByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("Dejan")).toBeInTheDocument();
    expect(global.fetch.mock.calls[0][0]).toContain("includeChildren=false");
  } finally { global.fetch = previousFetch; }
});
