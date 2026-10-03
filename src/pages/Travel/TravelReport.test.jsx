import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TravelReport from "./TravelReport";
import { TravelRegister } from "./Travel";
import { reportDraft, reportPayload } from "./travelReportApi";
import { mutationNotice } from "../../utils/appFetch";
import { BASE_URL } from "../../config/api";
import { downloadDocument } from "../../utils/documentDownload";
jest.mock("../../utils/documentDownload", () => ({ downloadDocument: jest.fn() }));

const endpoint = `${BASE_URL}/api/projects/7/travel-requests/31`;
const response = (value, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(value) });
const page = (content, extras = {}) => ({ page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, content, ...extras });
let data, travel, fetcher, writer, evidence, actions, failRead;
const writes = () => fetcher.mock.calls.filter(([, options]) => ["PUT", "POST"].includes(options?.method));
const makeReport = () => ({ id: 9, revision: 2, state: "DRAFT", isDeleted: false, outcome: "COMPLETED", actualDepartureDate: "2026-09-10", actualReturnDate: "2026-09-13", outcomeSummary: "Visited two partner sites", materialDifferences: false, explanation: null, planBasis: { kind: "RECORDED_APPROVAL", approvalId: 72, traveller: { employeeId: 18, displayName: "Alex Traveller" }, purpose: "Partner monitoring", destination: "Amman", departureDate: "2026-09-10", returnDate: "2026-09-13" }, currentSubmission: null, currentAcceptance: null, permissions: { canEdit: true, canChangeBasis: true, canSubmit: true, canAddEvidence: true, canLinkAction: true, canDelete: true }, linkedActionSummary: { total: 1, completed: 0, open: 1, unavailable: 0 } });
beforeEach(() => {
  travel = { id: 31, revision: 6 };
  data = { travelRequestId: 31, projectId: 7, travelRevision: 6, today: "2026-10-02", canCreate: false, report: makeReport(), issues: [] };
  evidence = []; actions = []; failRead = false;
  writer = () => { data = { ...data, report: { ...(data.report || makeReport()), revision: (data.report?.revision ?? -1) + 1 } }; return response(data); };
  fetcher = jest.fn(async (url, options) => {
    if (["PUT", "POST"].includes(options?.method)) return writer(url, options);
    if (url === `${endpoint}/report`) return failRead ? response({ message: "Report temporarily unavailable" }, 503) : response(data);
    if (url.includes("/report/history?")) return response(page([{ id: 190, action: "CREATE", revision: 0, after: { outcomeSummary: "Original retained report" } }]));
    if (url.includes("/report/evidence?")) return response(page(evidence));
    if (url.includes("/report/actions?")) return response(page(actions));
    if (url.includes(`${endpoint}/history?`)) return response(url.includes("page=1") ? page([{ id: 72, action: "APPROVE", after: { basis: { destination: "Original Amman" } }, actor: { username: "approver" } }], { page: 1, totalPages: 2, totalElements: 21 }) : page([{ id: 90, action: "WITHDRAW_APPROVAL" }], { totalPages: 2, totalElements: 21 }));
    if (url.includes("/documents/project/")) return response([{ id: 109, projectId: 7, documentName: "Trip account.pdf", versionNumber: 2, status: "FINAL", isDeleted: false }]);
    if (url.includes("/follow-ups?")) return response(page([{ id: 84, projectId: 7, revision: 3, title: "Review visit findings", status: "OPEN", isDeleted: false, assignee: { displayName: "Manager", isDeleted: false } }]));
    throw new Error(`Unexpected read ${url}`);
  });
  downloadDocument.mockResolvedValue();
});
function Harness() {
  const [refresh, setRefresh] = useState(0);
  return <MemoryRouter><TravelReport endpoint={endpoint} projectId={7} travel={travel} authFetch={fetcher} refresh={refresh} reload={() => setRefresh(n => n + 1)} /></MemoryRouter>;
}
async function mount() { render(<Harness />); await screen.findByRole("button", { name: data.report ? "Refresh report, travel and history" : "Create post-trip report" }); if (data.report) await screen.findByText("Visited two partner sites"); }
async function save(title) { const button = screen.getByRole("button", { name: `Save ${title.toLowerCase()}` }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); }
const change = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
function submitted() { data.report = { ...makeReport(), state: "SUBMITTED", currentSubmission: { id: 180, basis: { fields: { outcomeSummary: "Frozen submitted account" } }, actor: { username: "manager" } }, permissions: { canAccept: true, canReturn: true } }; }

test("creation requires explicit basis, never prefills actual dates and can save an incomplete unapproved draft", async () => {
  data.report = null; data.canCreate = true; await mount(); fireEvent.click(screen.getByRole("button", { name: "Create post-trip report" }));
  expect(screen.getByLabelText("Actual departure")).toHaveValue(""); expect(screen.getByLabelText("Actual return")).toHaveValue("");
  await save("Create post-trip report"); expect(await screen.findByRole("alert")).toHaveTextContent("Explicitly choose"); expect(writes()).toHaveLength(0);
  fireEvent.click(screen.getByLabelText("Use current plan as an unapproved observation")); await save("Create post-trip report");
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ basisApprovalId: null, expectedTravelRevision: 6, outcome: null, actualDepartureDate: null, actualReturnDate: null, outcomeSummary: null, materialDifferences: null, explanation: null });
});
test("retained approval selection pages V41 history and sends the chosen approval ID", async () => {
  data.report = null; data.canCreate = true; await mount(); fireEvent.click(screen.getByText("Create post-trip report"));
  const next = await screen.findByRole("button", { name: "Next approval history" }); await waitFor(() => expect(next).toBeEnabled()); fireEvent.click(next);
  fireEvent.click(await screen.findByLabelText("Use retained approval #72")); await save("Create post-trip report");
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body).basisApprovalId).toBe(72);
});
test("edit sends both revisions, nullable boolean and explicit cleared actual dates", async () => {
  await mount(); fireEvent.click(screen.getByText("Edit report")); change("Reported outcome", "NOT_TAKEN"); change("Actual departure", ""); change("Actual return", ""); change("Material differences from purpose, destination or scope", "true"); change("Explanation of differences or exceptional authorization", "Visit cancelled"); change("Report change reason", "Corrected facts"); await save("Edit report");
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][1].method).toBe("PUT"); expect(JSON.parse(writes()[0][1].body)).toMatchObject({ expectedRevision: 2, expectedTravelRevision: 6, outcome: "NOT_TAKEN", actualDepartureDate: null, actualReturnDate: null, materialDifferences: true, reason: "Corrected facts" });
});
test.each([["submit", "Submit report for review", "Report submission note (optional)", { note: "Reviewed account" }], ["accept", "Accept report", "Report review note", { note: "Reviewed account", expectedSubmissionId: 180 }], ["return", "Return report for changes", "Report change reason", { reason: "Reviewed account", expectedSubmissionId: 180 }], ["reopen", "Reopen accepted report", "Report change reason", { reason: "Reviewed account", expectedAcceptanceId: 190 }]])("%s uses explicit decision identity and both revisions", async (action, title, field, expected) => {
  if (["accept", "return"].includes(action)) submitted();
  if (action === "reopen") data.report = { ...data.report, state: "ACCEPTED", currentAcceptance: { id: 190, basis: {} }, permissions: { canReopen: true } };
  await mount(); fireEvent.click(screen.getByRole("button", { name: title })); change(field, "Reviewed account"); await save(title);
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toBe(`${endpoint}/report/${action}`); expect(JSON.parse(writes()[0][1].body)).toEqual({ ...expected, expectedRevision: 2, expectedTravelRevision: 6 });
});
test("independence permissions hide self-acceptance and keep the frozen report visible", async () => {
  submitted(); data.report.permissions.canAccept = false; data.issues = [{ message: "The report creator cannot accept this account." }]; await mount();
  expect(screen.queryByRole("button", { name: "Accept report" })).not.toBeInTheDocument(); expect(screen.getByText("Frozen submitted account")).toBeVisible(); expect(screen.getByText(data.issues[0].message)).toBeVisible(); expect(screen.queryByText("Edit report")).not.toBeInTheDocument();
});
test("stale parent revision preserves draft and requires explicit review before retry", async () => {
  writer = () => { data = { ...data, travelRevision: 7 }; travel = { ...travel, revision: 7 }; return response({ message: "Travel changed", fieldErrors: { expectedTravelRevision: "Review current travel." } }, 409); };
  await mount(); fireEvent.click(screen.getByText("Edit report")); change("Outcome summary (required before submission)", "Retain my draft"); change("Report change reason", "Corrected"); await save("Edit report");
  const review = await screen.findByRole("button", { name: "I reviewed report and travel state; use current revisions" });
  await waitFor(() => expect(review).toBeEnabled()); expect(screen.getByLabelText("Outcome summary (required before submission)")).toHaveValue("Retain my draft"); expect(writes()).toHaveLength(1); expect(screen.getByRole("button", { name: "Save edit report" })).toBeDisabled();
  writer = () => response(data); fireEvent.click(review); await save("Edit report"); await waitFor(() => expect(writes()).toHaveLength(2)); expect(JSON.parse(writes()[1][1].body).expectedTravelRevision).toBe(7);
});
test("uncertain successful creation cannot be replayed when refresh discovers the retained report", async () => {
  data.report = null; data.canCreate = true;
  writer = () => { data = { ...data, canCreate: false, report: makeReport() }; throw new Error("Connection interrupted"); };
  await mount(); fireEvent.click(screen.getByText("Create post-trip report")); fireEvent.click(screen.getByLabelText("Use current plan as an unapproved observation")); await save("Create post-trip report");
  const review = await screen.findByRole("button", { name: "I reviewed report and travel state; use current revisions" });
  await screen.findByText("Visited two partner sites"); expect(review).toBeDisabled(); expect(writes()).toHaveLength(1); expect(screen.getByRole("button", { name: "Cancel report draft" })).toBeEnabled();
});
test("exact-version evidence and task links use distinct report endpoints and task revision", async () => {
  await mount(); fireEvent.click(screen.getByText("Link report document")); await screen.findByRole("option", { name: /Trip account.pdf/ }); change("Supporting document", "109"); await save("Link report document"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ documentId: 109, expectedRevision: 2, expectedTravelRevision: 6 });
  await waitFor(() => expect(screen.getByRole("button", { name: "Link report follow-up" })).toBeEnabled()); fireEvent.click(screen.getByText("Link report follow-up")); fireEvent.click(await screen.findByText("Select follow-up #84")); await save("Link report follow-up");
  await waitFor(() => expect(writes()).toHaveLength(2)); expect(JSON.parse(writes()[1][1].body)).toEqual({ followUpId: 84, expectedFollowUpRevision: 3, expectedRevision: 3, expectedTravelRevision: 6 });
});
test("accepted evidence distinguishes reviewed links from late additions and respects remove permission", async () => {
  data.report.state = "ACCEPTED"; data.report.permissions = { canAddEvidence: true }; data.report.currentAcceptance = { id: 190, basis: {} };
  evidence = [{ id: 51, documentId: 109, capturedName: "Reviewed.pdf", associationActive: true, includedInCurrentAcceptance: true, downloadEligible: true, versionNumber: 2, permissions: { canRemove: false } }, { id: 52, documentId: 110, capturedName: "Late.pdf", associationActive: true, includedInCurrentAcceptance: false, downloadEligible: false, permissions: { canRemove: true } }];
  await mount(); expect(await screen.findByText("Included in accepted report submission")).toBeVisible(); expect(screen.getByText("Late association — outside the accepted report")).toBeVisible(); expect(screen.queryByText("Remove evidence association #51")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Download document #109 version 2")); await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith(109, fetcher));
  fireEvent.click(screen.getByText("Remove evidence association #52")); change("Report change reason", "Duplicate supporting material"); await save("Remove report document link"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toBe(`${endpoint}/report/evidence/52/remove`);
});
test.each([["delete", "Delete report"], ["restore", "Restore report"]])("%s preserves report identity and requires reason", async (action, title) => {
  if (action === "restore") data.report = { ...data.report, isDeleted: true, permissions: { canRestore: true } };
  await mount(); fireEvent.click(screen.getByText(title)); change("Report change reason", "Reviewed record"); await save(title); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toBe(`${endpoint}/report/${action}`); expect(JSON.parse(writes()[0][1].body)).toEqual({ reason: "Reviewed record", expectedRevision: 2, expectedTravelRevision: 6 });
});
test("read failure preserves an open draft and disables saving", async () => {
  await mount(); fireEvent.click(screen.getByText("Edit report")); change("Outcome summary (required before submission)", "Still here"); failRead = true; fireEvent.click(screen.getByText("Refresh report, travel and history")); await screen.findByRole("alert"); expect(screen.getByLabelText("Outcome summary (required before submission)")).toHaveValue("Still here"); expect(screen.getByRole("button", { name: "Save edit report" })).toBeDisabled();
});
test("parent refresh failure retains the report editor and report editing locks trip commands", async () => {
  let parentFails = false;
  const parent = { ...travel, projectId: 7, purpose: "Partner visit", destination: "Amman", state: "APPROVED", traveller: { displayName: "Alex" }, permissions: { canCancel: true }, issues: [] };
  const normal = fetcher.getMockImplementation();
  fetcher.mockImplementation((url, options) => {
    if (url === endpoint) return Promise.resolve(parentFails ? response({ message: "Travel temporarily unavailable" }, 503) : response(parent));
    if (url.includes("/travel-requests?")) return Promise.resolve(response(page([parent])));
    if (url.includes(`${endpoint}/actions?`) || url.includes(`${endpoint}/evidence?`)) return Promise.resolve(response(page([])));
    return normal(url, options);
  });
  render(<MemoryRouter><TravelRegister projectId={7} authFetch={fetcher} /></MemoryRouter>);
  fireEvent.click(await screen.findByText("Open request #31")); fireEvent.click(await screen.findByText("Edit report"));
  change("Outcome summary (required before submission)", "Retained across parent failure");
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancel travel request" })).toBeDisabled());
  expect(screen.getByRole("button", { name: "Close request" })).toBeDisabled();
  parentFails = true; fireEvent.click(screen.getByText("Refresh request, links and history"));
  await screen.findByText(/Travel temporarily unavailable/);
  expect(screen.getByLabelText("Outcome summary (required before submission)")).toHaveValue("Retained across parent failure");
  expect(screen.getByRole("button", { name: "Save edit report" })).toBeDisabled();
});
test("changing the captured basis is explicit and reasoned", async () => {
  await mount(); fireEvent.click(screen.getByText("Change report plan basis"));
  expect(screen.getByText("Selected basis: None selected")).toBeVisible();
  fireEvent.click(screen.getByLabelText("Use current plan as an unapproved observation")); change("Report change reason", "Report concerns the revised unapproved plan"); await save("Change report plan basis");
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toBe(`${endpoint}/report/basis`); expect(JSON.parse(writes()[0][1].body)).toEqual({ basisApprovalId: null, reason: "Report concerns the revised unapproved plan", expectedRevision: 2, expectedTravelRevision: 6 });
});
test("400 validation retains the account without automatic retry", async () => {
  writer = () => response({ message: "Complete the report", fieldErrors: { explanation: "Explain actual/plan differences." } }, 400);
  await mount(); fireEvent.click(screen.getByText("Submit report for review")); change("Report submission note (optional)", "Please review the stated exception"); await save("Submit report for review");
  await screen.findByText(/Explain actual\/plan differences/);
  expect(screen.getByLabelText("Report submission note (optional)")).toHaveValue("Please review the stated exception");
  expect(screen.getByRole("button", { name: "Save submit report for review" })).toBeDisabled(); expect(writes()).toHaveLength(1);
});
test("report payload rejects actual dates for not-taken and preserves unassessed boolean", () => {
  const draft = { ...reportDraft(), basisApprovalId: "unapproved", outcome: "NOT_TAKEN", actualDepartureDate: "2026-09-10" };
  expect(() => reportPayload({ action: "create", draft })).toThrow("Clear both actual dates");
  draft.actualDepartureDate = ""; expect(reportPayload({ action: "create", draft }).materialDifferences).toBeNull();
});
test("report notices cannot imply travel approval", () => {
  expect(mutationNotice(`${endpoint}/report/accept`, { method: "POST" }, { ok: true })).toBe("Travel report accepted.");
  expect(mutationNotice(`${endpoint}/report`, { method: "POST" }, { ok: true })).toBe("Travel report saved.");
});
