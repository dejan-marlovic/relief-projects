import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrganisationAssessmentPanel } from "./OrganisationAssessment";
import OrganisationReviews from "./OrganisationReviews";
import { mutationNotice } from "../../utils/appFetch";

const response = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
let envelope, fetcher, links, writes, writer;
const page = content => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, assessmentRevision: envelope.assessment?.revision });
beforeEach(() => {
  envelope = { scope: { relationshipId: 11, projectId: 7, projectName: "Water project", organizationName: "Relief partner", organizationStatusLabel: "Implementing partner" }, scopeAvailable: true, assessment: null, permissions: { canCreate: true }, issues: [] };
  links = []; writes = []; writer = () => response(envelope);
  fetcher = jest.fn(async (url, options = {}) => {
    if (options.method) { writes.push({ url, method: options.method, body: JSON.parse(options.body) }); return writer(); }
    if (url.includes("/history?")) return response(page([{ id: 1, revision: 0, action: "CREATE", after: { capacitySummary: "Original capacity" } }]));
    if (url.includes("/evidence?")) return response(page(links));
    if (url.includes("documents/project")) return response([{ id: 42, projectId: 7, isDeleted: false, documentName: "Assessment.pdf", versionNumber: 2, status: "FINAL" }]);
    return response(envelope);
  });
});
function existing(state = "DRAFT", permissions = { canEdit: true, canSubmit: true, canLinkEvidence: true, canDelete: true }) {
  envelope.assessment = { id: 8, revision: 3, state, deleted: false, capacitySummary: "Experienced team", suitabilitySummary: "Local presence", materialConcerns: "Access restrictions", requiresEvidenceGapExplanation: true, reviewIssues: [], evidenceSummary: { activeLinks: 0, includedInDecision: 0, lateLinks: 0, unavailableLinks: 0 } };
  envelope.permissions = permissions;
}
const mount = () => render(<MemoryRouter><OrganisationAssessmentPanel relationshipId={11} authFetch={fetcher} /></MemoryRouter>);
async function start(name) { fireEvent.click(await screen.findByRole("button", { name, exact: true })); }
async function save(name) { const button = screen.getByRole("button", { name: `Save ${name.toLowerCase()}` }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); }
test("create is relationship-owned and sends only narratives plus expectedAbsent", async () => {
  mount(); await start("Create assessment"); fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: " Experienced team " } }); await save("Create assessment");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].url).toMatch(/project-organizations\/11\/assessment$/);
  expect(writes[0].body).toEqual({ expectedAbsent: true, capacitySummary: "Experienced team", suitabilitySummary: null, materialConcerns: null, notes: null });
  expect(screen.getByText(/Project: Water project/)).toBeInTheDocument();
});
test.each(["SUITABLE_FOR_STATED_ROLE", "NOT_RECOMMENDED_FOR_STATED_ROLE"])("independent %s review sends outcome, explanation and evidence gap", async decision => {
  existing("SUBMITTED", { canReview: true }); mount(); await start("Record independent review");
  fireEvent.change(screen.getByLabelText("Review outcome"), { target: { value: decision } });
  fireEvent.change(screen.getByLabelText("Decision explanation"), { target: { value: "Capacity reviewed" } });
  fireEvent.change(screen.getByLabelText("Missing evidence explanation (required)"), { target: { value: "Evidence to follow" } }); await save("Record independent review");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].body).toEqual({ expectedRevision: 3, decision, decisionExplanation: "Capacity reviewed", evidenceGapExplanation: "Evidence to follow" });
});
test("capability denial prevents self-review and unavailable evidence submission", async () => {
  existing("SUBMITTED", { canReturn: true }); envelope.issues = [{ message: "Use an independent reviewer." }]; mount(); await screen.findByText("Use an independent reviewer.");
  expect(screen.queryByRole("button", { name: "Record independent review" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
});
test("same-project exact-version evidence uses its selected ID", async () => {
  existing(); mount(); await start("Link supporting document"); await screen.findByRole("option", { name: /Assessment.pdf/ });
  expect(fetcher.mock.calls.some(([url]) => url.includes("documents/project/7"))).toBe(true);
  fireEvent.change(screen.getByLabelText("Supporting document"), { target: { value: "42" } }); await save("Link supporting document");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].body).toEqual({ expectedRevision: 3, documentId: 42, purpose: "ASSESSMENT" });
});
test("review basis evidence is protected while late evidence can be removed", async () => {
  existing("REVIEWED", { canWithdrawReview: true, canLinkEvidence: true }); envelope.assessment.currentDecision = { historyId: 20, decision: "NOT_RECOMMENDED_FOR_STATED_ROLE", decisionExplanation: "Insufficient capacity", basis: { context: { organizationName: "Historic partner" } } };
  links = [{ id: 1, capturedName: "Basis", associationActive: true, includedInCurrentDecision: true, permissions: {} }, { id: 2, capturedName: "Late", associationActive: true, includedInCurrentDecision: false, permissions: { canRemove: true } }];
  mount(); await screen.findByText("Late · Version unknown"); expect(screen.queryByText("Remove evidence #1")).not.toBeInTheDocument(); expect(screen.getByText("Remove evidence #2")).toBeEnabled();
  expect(screen.getByText("Historic partner")).toBeInTheDocument(); expect(screen.getByText("Insufficient capacity")).toBeInTheDocument();
  await start("Withdraw review"); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Revise capacity" } }); await save("Withdraw review");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].url).toMatch(/withdraw-review$/); expect(writes[0].body).toEqual({ expectedRevision: 3, reason: "Revise capacity" });
});
test("stale writes retain draft and require deliberate review before using a new revision", async () => {
  existing(); writer = () => { envelope.assessment.revision = 4; return response({ message: "Assessment changed." }, 409); };
  mount(); await start("Edit assessment"); fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "Keep my draft" } }); await save("Edit assessment");
  await screen.findByText("Assessment changed."); expect(screen.getByLabelText("Capacity")).toHaveValue("Keep my draft"); expect(screen.getByRole("button", { name: "Save edit assessment" })).toBeDisabled();
  const review = screen.getByText("I reviewed the refreshed state; enable retry"); await waitFor(() => expect(review).toBeEnabled()); writer = () => response(envelope); fireEvent.click(review); await save("Edit assessment");
  await waitFor(() => expect(writes).toHaveLength(2)); expect(writes[1].body.expectedRevision).toBe(4);
});
test("lost create response with a recorded assessment cannot be retried as duplicate", async () => {
  writer = () => { existing(); throw new Error("Connection lost"); }; mount(); await start("Create assessment"); await save("Create assessment"); await screen.findByText("Connection lost");
  await waitFor(() => expect(screen.getByText("I reviewed the refreshed state; enable retry")).toBeDisabled()); expect(writes).toHaveLength(1);
});
test("unavailable scope retains decision and history without controls", async () => {
  existing("REVIEWED", {}); envelope.scopeAvailable = false; envelope.assessment.reviewRequired = true;
  envelope.assessment.currentDecision = { historyId: 20, decision: "SUITABLE_FOR_STATED_ROLE" };
  mount(); await screen.findByText(/Retained assessment information is read-only/); await screen.findByText("create · Revision 0");
  expect(screen.queryByText("Edit assessment")).not.toBeInTheDocument(); expect(screen.getByText(/Review required. The retained outcome/)).toBeInTheDocument();
});
test("organisation summary is bounded, names each relationship and includes deleted on request", async () => {
  fetcher = jest.fn(async () => response(page([{ scope: envelope.scope, scopeAvailable: true, state: "REVIEWED", currentDecision: { decision: "SUITABLE_FOR_STATED_ROLE" }, reviewRequired: true }])));
  render(<MemoryRouter><OrganisationReviews organizationId={3} authFetch={fetcher} /></MemoryRouter>);
  expect(await screen.findByRole("link", { name: "Open relationship assessment #11" })).toHaveAttribute("href", "/organisation-assessments/11");
  fireEvent.click(screen.getByLabelText("Include deleted assessments")); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.endsWith("page=0&size=20&includeDeleted=true"))).toBe(true));
});
test("success messages distinguish informational review from project approval", () => {
  expect(mutationNotice("/api/project-organizations/11/assessment/review", { method: "POST" }, { ok: true })).toBe("Organisation role review recorded.");
  expect(mutationNotice("/api/project-organizations/11/assessment/submit", { method: "POST" }, { ok: true })).toBe("Organisation assessment submitted for review.");
  expect(mutationNotice("/api/projects/7/follow-ups/9/progress", { method: "POST" }, { ok: true })).toBe("Follow-up progress updated.");
});
