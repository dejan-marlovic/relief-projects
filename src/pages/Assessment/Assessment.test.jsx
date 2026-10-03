import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AssessmentPanel } from "./Assessment";
import { assessmentPayload, draftFrom } from "./assessmentApi";
import { projectApprovalLabel, projectMetadataPayload } from "../../utils/projectApproval";
import { mutationNotice } from "../../utils/appFetch";

const response = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
const page = content => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, assessmentRevision: envelope.assessment?.revision });
let envelope, fetcher, links, writes, writer;
beforeEach(() => {
  envelope = { projectId: 7, projectActive: true, approval: { value: "Yes", source: "LEGACY_FLAG", currentDecisionId: null }, assessment: null, permissions: { canCreate: true }, issues: [] };
  links = []; writes = [];
  writer = () => response(envelope);
  fetcher = jest.fn(async (url, options = {}) => {
    if (options.method) { writes.push({ url, method: options.method, body: JSON.parse(options.body) }); return writer(); }
    if (/\/history\?/.test(url)) return response(page([{ id: 1, revision: 0, action: "CREATE", actor: { username: "manager" }, after: { rationale: "Original" } }]));
    if (/\/evidence\?/.test(url)) return response(page(links));
    if (url.includes("documents/project")) return response([{ id: 42, projectId: 7, isDeleted: false, documentName: "Assessment.pdf", versionNumber: 2, status: "DRAFT" }]);
    if (url.endsWith("/assessment")) return response(envelope);
    return response({ id: 7, approved: envelope.approval.value, assessmentSummary: { source: envelope.approval.source } });
  });
});
function existing(state = "DRAFT", permissions = { canEdit: true, canSubmit: true, canLinkEvidence: true, canDelete: true }) {
  envelope.assessment = { id: 8, revision: 3, state, deleted: false, rationale: "Safe water", feasibilitySummary: "Partner capacity", riskConsiderations: "Access", recommendation: "PROCEED", requiresEvidenceGapExplanation: true, reviewIssues: [], evidenceSummary: { activeLinks: 0, includedInApproval: 0, lateLinks: 0, unavailableLinks: 0 } };
  envelope.permissions = permissions;
}
const mount = () => render(<MemoryRouter><AssessmentPanel projectId={7} authFetch={fetcher} /></MemoryRouter>);
async function start(button) { fireEvent.click(await screen.findByRole("button", { name: button, exact: true })); return screen.getByRole("form", { name: button }); }
async function save(title) { const button = screen.getByRole("button", { name: `Save ${title.toLowerCase()}` }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); }
test("legacy Yes is labelled without inventing an assessment or an approval", async () => {
  mount(); await screen.findByText("Legacy Yes — no recorded decision");
  expect(screen.queryByText("Current approval")).not.toBeInTheDocument();
  expect(fetcher.mock.calls.some(([url]) => url.includes("/history?"))).toBe(false);
});
test("create sends expectedAbsent with only draft fields, not legacy approval or identity", async () => {
  mount(); await start("Create assessment");
  fireEvent.change(screen.getByLabelText("Rationale and need"), { target: { value: " Water access " } });
  await save("Create assessment"); await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0].body).toEqual({ expectedAbsent: true, rationale: "Water access", feasibilitySummary: null, riskConsiderations: null, notes: null, recommendation: null });
});
test("editing after a submission requires a reason and uses the captured revision", async () => {
  existing("RETURNED"); envelope.assessment.currentSubmission = { historyId: 4, basis: { fields: { rationale: "Frozen rationale" } } };
  mount(); await start("Edit assessment"); fireEvent.change(screen.getByLabelText("Rationale and need"), { target: { value: "Changed" } });
  fireEvent.change(screen.getByLabelText("Reason for changes (required)"), { target: { value: "Reviewed access" } }); await save("Edit assessment");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].method).toBe("PUT"); expect(writes[0].body).toMatchObject({ expectedRevision: 3, reason: "Reviewed access", rationale: "Changed" });
});
test("submission is a command, not an optimistic approval toggle", async () => {
  existing(); mount(); await start("Submit for approval"); await save("Submit for approval");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].url).toMatch(/\/submit$/); expect(writes[0].body).toEqual({ expectedRevision: 3, note: null });
});
test("independent approval requires note and gap explanation and renders the frozen basis", async () => {
  existing("SUBMITTED", { canApprove: true, canReturn: true }); envelope.assessment.currentSubmission = { historyId: 30, actor: { username: "manager", employeeId: 1 }, basis: { fields: { rationale: "Frozen rationale" } } };
  mount(); await start("Approve assessment");
  fireEvent.change(screen.getByLabelText("Approval note"), { target: { value: "Reviewed" } });
  fireEvent.change(screen.getByLabelText("Missing evidence explanation (required)"), { target: { value: "Minutes to follow" } }); await save("Approve assessment");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].body).toEqual({ expectedRevision: 3, note: "Reviewed", evidenceGapExplanation: "Minutes to follow" }); expect(screen.getByText("Frozen rationale")).toBeInTheDocument();
});
test("self approval capability denial offers no bypass", async () => {
  existing("SUBMITTED", { canReturn: true }); envelope.issues = [{ message: "Contributors cannot approve." }]; mount(); await screen.findByText("Contributors cannot approve.");
  expect(screen.queryByRole("button", { name: "Approve assessment" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Return for changes" })).toBeEnabled();
});
test("evidence links preserve selected exact version and purpose", async () => {
  existing(); mount(); await start("Link supporting document"); await screen.findByRole("option", { name: /Assessment.pdf/ });
  fireEvent.change(screen.getByLabelText("Supporting document"), { target: { value: "42" } }); fireEvent.change(screen.getByLabelText("Evidence purpose"), { target: { value: "COMMITTEE_MINUTES" } });
  await save("Link supporting document"); await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].body).toEqual({ expectedRevision: 3, documentId: 42, purpose: "COMMITTEE_MINUTES" });
});
test("approved basis links cannot be removed but late links can", async () => {
  existing("APPROVED", { canWithdrawApproval: true, canLinkEvidence: true }); envelope.assessment.currentApproval = { historyId: 31, basis: {} };
  links = [ { id: 21, documentId: 42, purpose: "ASSESSMENT", capturedName: "Basis.pdf", associationActive: true, includedInCurrentApproval: true, permissions: { canRemove: false } }, { id: 22, documentId: 43, purpose: "SUPPORTING", capturedName: "Late.pdf", associationActive: true, includedInCurrentApproval: false, permissions: { canRemove: true } } ];
  mount(); await screen.findByText("Late.pdf · Version unknown"); expect(screen.getByText("Added after approval — outside the decision basis")).toBeInTheDocument(); expect(screen.queryByText("Remove evidence #21")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Remove evidence #22")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong attachment" } }); await save("Remove evidence association"); await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].url).toMatch(/\/evidence\/22\/remove$/);
});
test("withdrawal is an explicit reasoned command", async () => {
  existing("APPROVED", { canWithdrawApproval: true }); mount(); await start("Withdraw approval"); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Revise context" } }); await save("Withdraw approval"); await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].body).toEqual({ expectedRevision: 3, reason: "Revise context" });
});
test("restoration does not reinstate approval or invent a decision", async () => {
  existing("RETURNED", { canRestore: true }); envelope.assessment.deleted = true;
  envelope.approval = { value: "No", source: "RECORDED_ASSESSMENT", currentDecisionId: null };
  mount(); await start("Restore assessment"); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Continue assessment" } }); await save("Restore assessment");
  await waitFor(() => expect(writes).toHaveLength(1)); expect(writes[0].url).toMatch(/\/restore$/); expect(writes[0].body).toEqual({ expectedRevision: 3, reason: "Continue assessment" });
  expect(screen.getByText(/No current recorded approval/)).toBeInTheDocument();
});
test("review warnings retain approval while unavailable evidence disables submission", async () => {
  existing("APPROVED", {}); envelope.approval = { value: "Yes", source: "RECORDED_ASSESSMENT", currentDecisionId: 31 };
  envelope.assessment.reviewRequired = true; envelope.assessment.reviewIssues = [{ message: "Project context changed." }];
  mount(); await screen.findByText("Project context changed."); expect(screen.getByText(/Recorded assessment approval · Decision #31/)).toHaveTextContent("Review required");
  expect(screen.queryByRole("button", { name: "Submit for approval" })).not.toBeInTheDocument();
});
test("stale errors retain input, refresh history and require explicit review before retry", async () => {
  existing(); writer = () => { envelope.assessment.revision = 4; return response({ message: "Assessment changed." }, 409); };
  mount(); await start("Edit assessment"); fireEvent.change(screen.getByLabelText("Rationale and need"), { target: { value: "Keep my draft" } }); await save("Edit assessment");
  await screen.findByText("Assessment changed."); expect(screen.getByLabelText("Rationale and need")).toHaveValue("Keep my draft"); expect(screen.getByRole("button", { name: "Save edit assessment" })).toBeDisabled();
  const review = screen.getByRole("button", { name: "I reviewed the refreshed state; enable retry" }); await waitFor(() => expect(review).toBeEnabled());
  writer = () => response(envelope); fireEvent.click(review); await save("Edit assessment"); await waitFor(() => expect(writes).toHaveLength(2)); expect(writes[1].body.expectedRevision).toBe(4);
});
test("lost response after successful creation does not offer a duplicate retry", async () => {
  writer = () => { existing(); throw new Error("Connection lost"); }; mount(); await start("Create assessment"); await save("Create assessment"); await screen.findByText("Connection lost");
  await waitFor(() => expect(screen.getByRole("button", { name: "I reviewed the refreshed state; enable retry" })).toBeDisabled()); expect(writes).toHaveLength(1);
});
test("read-only inactive parent retains history without writes", async () => {
  existing("RETURNED", {}); envelope.projectActive = false; envelope.assessment.deleted = true; mount(); await screen.findByText(/project is inactive/i); await screen.findByText("create · Revision 0");
  expect(screen.queryByRole("button", { name: "Edit assessment" })).not.toBeInTheDocument(); expect(writes).toHaveLength(0);
});
test("draft stays visible after a failed refresh", async () => {
  existing(); mount(); await start("Edit assessment");
  fetcher.mockImplementation(async () => response({ message: "Unavailable" }, 503)); fireEvent.click(screen.getByText("Refresh assessment, evidence and history"));
  await waitFor(() => expect(screen.getAllByRole("alert").some(e => e.textContent.includes("Unavailable"))).toBe(true));
  expect(screen.getByLabelText("Rationale and need")).toHaveValue("Safe water"); expect(screen.getByRole("button", { name: "Save edit assessment" })).toBeDisabled();
});
test("provenance helper and metadata payload prevent manual/stale approval echoes", () => {
  expect(projectApprovalLabel({ approved: "Yes" })).toBe("Legacy Yes — no recorded decision");
  expect(projectApprovalLabel({ approved: "No", assessmentSummary: { source: "DEFAULT_UNASSESSED" } })).toContain("Unassessed");
  expect(projectApprovalLabel({ approved: "Yes", assessmentSummary: { source: "RECORDED_ASSESSMENT", currentApprovalId: 31, reviewRequired: true } })).toContain("Review required");
  expect(projectMetadataPayload({ id: 7, projectName: "Water", approved: "Yes", assessmentSummary: {}, approvalSource: "LEGACY_FLAG" })).toEqual({ id: 7, projectName: "Water" });
});
test("payload validation and notices keep assessment separate from ordinary project approval", () => {
  expect(() => assessmentPayload("approve", { note: "okay" }, { requiresEvidenceGapExplanation: true })).toThrow("evidenceGapExplanation");
  expect(() => assessmentPayload("edit", { ...draftFrom(), rationale: "a".repeat(4001) }, null)).toThrow("4000");
  expect(mutationNotice("/api/projects/7/assessment/approve", { method: "POST" }, { ok: true })).toBe("Assessment approval recorded.");
});
