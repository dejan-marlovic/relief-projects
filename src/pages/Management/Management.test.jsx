import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ManagementRegister } from "./Management";
import { DecisionSummary } from "./ManagementViews";
import { observationPayload } from "./managementApi";

const page = content => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 });
const response = (value, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(value) });
let record, task, fetcher, writeHandler, actionLinks, evidenceLinks;
const writes = () => fetcher.mock.calls.filter(([, o]) => ["POST", "PUT"].includes(o?.method));
beforeEach(() => {
  record = { id: 51, projectId: 7, type: "FINDING", title: "Missing distribution checks", observation: "Three unsigned lists", sourceType: "REVIEW", sourceReference: null, observedDate: "2026-09-01", today: "2026-09-30", businessTimezone: "Europe/Stockholm", state: "OPEN", revision: 2, response: null, resolution: null, isDeleted: false, permissions: { canEdit: true, canRespond: true, canReview: true, canLinkAction: true, canLinkEvidence: true, canDelete: true, canResolve: false }, linkedActionSummary: { total: 0, completed: 0, open: 0, unavailable: 0 }, expectedFollowUpRevisions: {}, issues: [] };
  task = { id: 301, projectId: 7, title: "Sample distribution lists", status: "OPEN", revision: 2, isDeleted: false, dueDate: "2026-10-15", assignee: { employeeId: 1, displayName: "Alex", isDeleted: false }, permissions: { canComplete: true } };
  actionLinks = [{ id: 11, followUpId: 301, capturedTitle: "Original sampling title", associationActive: true, availability: "ACTIVE", current: task, permissions: { canRemove: true } }];
  evidenceLinks = [{ id: 18, documentId: 92, capturedName: "Original evaluation.pdf", currentName: "Evaluation.pdf", versionNumber: 2, associationActive: true, availability: "DOCUMENT_DELETED", downloadEligible: false, permissions: { canRemove: true } }];
  writeHandler = () => response(record);
  fetcher = jest.fn(async (url, options) => {
    if (["POST", "PUT"].includes(options?.method)) return writeHandler(url, options);
    if (url.includes("/documents/project/")) return response([{ id: 92, projectId: 7, isDeleted: false, documentName: "Evaluation.pdf", versionNumber: 2, status: "DRAFT" }, { id: 93, projectId: 8, isDeleted: false, documentName: "Foreign" }]);
    if (url.includes("/follow-ups?")) return response({ ...page([task]), totalPages: 2, totalElements: 21 });
    if (url.includes("/actions?")) return response({ ...page(actionLinks), recordRevision: record.revision });
    if (url.includes("/evidence?")) return response({ ...page(evidenceLinks), recordRevision: record.revision });
    if (url.includes("/history?")) return response({ ...page([{ id: 1, action: "CREATE", revision: 0, actor: { username: "manager" }, after: { title: record.title } }]), recordRevision: record.revision });
    if (/\/51$/.test(url)) return response(record);
    return response({ ...page([record]), canCreate: true, today: record.today, businessTimezone: record.businessTimezone });
  });
});
const mount = () => render(<MemoryRouter><ManagementRegister projectId={7} authFetch={fetcher} /></MemoryRouter>);
async function open() { mount(); fireEvent.click(await screen.findByText("Open record #51")); await screen.findByText("Edit observation"); }
async function save(label) { const button = screen.getByText(`Save ${label.toLowerCase()}`); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); }
test("keeps resolution, outstanding acceptance and live review flags distinct", () => {
  render(<DecisionSummary record={{ ...record, state: "RESOLVED", resolvedWithOutstandingActions: true, resolutionReviewRequired: true, linkedActionSummary: { total: 3, completed: 1, open: 1, unavailable: 1 } }} />);
  expect(screen.getByText("Management resolution: Recorded")).toBeInTheDocument(); expect(screen.getByText("Resolved with outstanding actions.")).toBeInTheDocument(); expect(screen.getByText(/Review required after linked task changes/)).toBeInTheDocument(); expect(screen.getByText(/1 completed · 1 open · 1 unavailable/)).toBeInTheDocument();
});
test("metadata updates allowlist fields and cannot change immutable type", () => {
  expect(observationPayload({ ...record, sourceReference: "" }, false)).toEqual({ title: record.title, observation: record.observation, sourceType: "REVIEW", sourceReference: null, observedDate: "2026-09-01" });
});
test("creates a lesson without inventing a response or task", async () => {
  mount(); fireEvent.click(await screen.findByText("Create finding or lesson")); fireEvent.change(screen.getByLabelText("Record type"), { target: { value: "LESSON" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Translation helped" } }); fireEvent.change(screen.getByLabelText("Observation"), { target: { value: "Use local languages" } }); fireEvent.change(screen.getByLabelText("Source type"), { target: { value: "OPERATIONAL_EXPERIENCE" } });
  await save("Create finding or lesson"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ type: "LESSON", title: "Translation helped", observation: "Use local languages", sourceType: "OPERATIONAL_EXPERIENCE", sourceReference: null, observedDate: "2026-09-30" });
});
test("lesson resolution uses an empty manifest and no fabricated response", async () => {
  record.type = "LESSON"; record.permissions.canResolve = true; await open(); expect(screen.getByText("Response not recorded (optional for lesson).")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Record management resolution")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Learning documented" } }); await save("Record management resolution"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, expectedFollowUpRevisions: {}, resolvedDate: "2026-09-30", reason: "Learning documented", outstandingActionExplanation: null });
});
test("first response uses full response fields without a replacement reason", async () => {
  await open(); fireEvent.click(screen.getByText("Record management response")); fireEvent.change(screen.getByLabelText("Management response"), { target: { value: "Introduce checks" } });
  await save("Record management response"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][1].method).toBe("PUT"); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, disposition: "ACTIONS_REQUIRED", text: "Introduce checks", responseDate: "2026-09-30" });
});
test("replacement response requires a reason and retains its response date", async () => {
  record.response = { disposition: "ACTIONS_REQUIRED", text: "Introduce checks", responseDate: "2026-09-10" }; await open(); fireEvent.click(screen.getByText("Record management response"));
  expect(screen.getByLabelText("Reason")).toBeRequired(); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Revised procedure" } }); await save("Record management response"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toMatchObject({ reason: "Revised procedure", responseDate: "2026-09-10", text: "Introduce checks" });
});
test("linking an existing task sends its reviewed revision without task mutations", async () => {
  await open(); fireEvent.click(screen.getByText("Link existing follow-up")); fireEvent.click(await screen.findByText("Select follow-up #301")); await save("Link existing follow-up"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(/management-records\/51\/actions$/); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, followUpId: 301, expectedFollowUpRevision: 2 });
});
test("task picker pagination does not submit its surrounding form", async () => {
  await open(); fireEvent.click(screen.getByText("Link existing follow-up")); await screen.findByText("Select follow-up #301"); fireEvent.click(screen.getByText("Next available follow-ups")); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes("follow-ups?") && url.includes("page=1"))).toBe(true)); expect(writes()).toHaveLength(0);
});
test("resolve requires acknowledgement and sends the whole manifest, not just visible links", async () => {
  record.permissions.canResolve = true; record.requiresOutstandingActionExplanation = true; record.expectedFollowUpRevisions = { "301": 2, "399": 8 }; record.linkedActionSummary = { total: 2, completed: 0, open: 1, unavailable: 1 };
  await open(); fireEvent.click(screen.getByText("Record management resolution")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Procedure accepted" } });
  fireEvent.submit(screen.getByRole("form", { name: "Record management resolution" })); expect(writes()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Outstanding-action explanation (required)"), { target: { value: "Sampling continues" } }); await save("Record management resolution"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toMatchObject({ expectedFollowUpRevisions: { "301": 2, "399": 8 }, outstandingActionExplanation: "Sampling continues", expectedRevision: 2 });
});
test("task conflict retains decision draft and requires explicit fresh-manifest review", async () => {
  record.permissions.canResolve = true; record.expectedFollowUpRevisions = { "301": 2 };
  writeHandler = () => { record = { ...record, expectedFollowUpRevisions: { "301": 3 } }; return response({ message: "Linked tasks changed", code: "MANAGEMENT_ACTIONS_CHANGED" }, 409); };
  await open(); fireEvent.click(screen.getByText("Record management resolution")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Reviewed sampling" } }); await save("Record management resolution");
  await screen.findByText("Linked tasks changed"); expect(screen.getByLabelText("Reason")).toHaveValue("Reviewed sampling"); expect(screen.getByText("Save record management resolution")).toBeDisabled(); expect(writes()).toHaveLength(1);
  expect(screen.getByText(/Task revisions reviewed for this decision/)).toHaveTextContent("#301 (revision 2)");
  const review = screen.getByText("I reviewed the refreshed state; enable retry"); await waitFor(() => expect(review).toBeEnabled()); fireEvent.click(review);
  expect(screen.getByText(/Task revisions reviewed for this decision/)).toHaveTextContent("#301 (revision 3)"); writeHandler = () => response(record); await save("Record management resolution"); await waitFor(() => expect(writes()).toHaveLength(2)); expect(JSON.parse(writes()[1][1].body).expectedFollowUpRevisions).toEqual({ "301": 3 });
});
test("exact evidence picker excludes foreign documents and posts only the selected ID", async () => {
  await open(); fireEvent.click(screen.getByText("Link supporting document")); await screen.findByRole("option", { name: /Evaluation.pdf/ }); expect(screen.queryByRole("option", { name: /Foreign/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Supporting document"), { target: { value: "92" } }); await save("Link supporting document"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, documentId: 92 });
});
test("unavailable evidence retains captured/current names and can be removed with a reason", async () => {
  await open(); expect(await screen.findByText(/Original evaluation.pdf/)).toBeInTheDocument(); expect(screen.getByText(/Current name: Evaluation.pdf/)).toBeInTheDocument(); expect(screen.getByText("Download document #92 version 2")).toBeDisabled();
  fireEvent.click(screen.getByText("Remove evidence association #18")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong reference" } }); await save("Remove evidence association"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toMatch(/evidence\/18\/remove$/); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, reason: "Wrong reference" });
});
test("resolved records expose reopen rather than editing; task changes do not reopen them", async () => {
  record.state = "RESOLVED"; record.resolutionReviewRequired = true; record.permissions = { canReopen: true, canDelete: true }; actionLinks[0].permissions = {}; evidenceLinks[0].permissions = {};
  mount(); fireEvent.click(await screen.findByText("Open record #51")); await screen.findByText("Reopen record");
  expect(screen.queryByText("Edit observation")).not.toBeInTheDocument(); expect(screen.queryByText("Link existing follow-up")).not.toBeInTheDocument(); expect(screen.getAllByText("Management resolution: Recorded")).toHaveLength(2); expect(screen.getAllByText(/Review required after linked task changes/)).toHaveLength(2);
});
test("reader permissions do not inherit task-assignee management rights", async () => {
  record.permissions = {}; actionLinks[0].permissions = {}; evidenceLinks[0].permissions = {};
  mount(); fireEvent.click(await screen.findByText("Open record #51")); await screen.findByText("Recorded management response");
  expect(screen.queryByText("Record management response")).not.toBeInTheDocument(); expect(screen.queryByText("Edit observation")).not.toBeInTheDocument(); expect(await screen.findByText(/Current title: Sample distribution lists/)).toBeInTheDocument(); expect(writes()).toHaveLength(0);
});
test.each([["delete", "Delete record"], ["restore", "Restore record"], ["reopen", "Reopen record"]])("%s is explicit and revision-protected", async (action, title) => {
  record.permissions = { canEdit: true, [action === "delete" ? "canDelete" : action === "restore" ? "canRestore" : "canReopen"]: true }; await open(); fireEvent.click(screen.getByText(title)); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Reviewed" } }); await save(title); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toMatch(new RegExp(`/${action}$`)); expect(JSON.parse(writes()[0][1].body)).toEqual({ reason: "Reviewed", expectedRevision: 2 });
});
test("uncertain creation preserves draft and blocks automatic replay", async () => {
  writeHandler = () => { throw new Error("Connection lost"); }; mount(); fireEvent.click(await screen.findByText("Create finding or lesson")); fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Possibly created" } }); fireEvent.change(screen.getByLabelText("Observation"), { target: { value: "Finding" } }); fireEvent.change(screen.getByLabelText("Source type"), { target: { value: "REVIEW" } }); await save("Create finding or lesson"); await screen.findByText("Connection lost");
  expect(screen.getByLabelText("Title")).toHaveValue("Possibly created"); expect(screen.getByText("Save create finding or lesson")).toBeDisabled(); expect(screen.getByText(/avoid duplicates/)).toBeInTheDocument(); expect(writes()).toHaveLength(1);
});
test("association pagination and removed episodes remain accessible", async () => {
  const normal = fetcher.getMockImplementation(); fetcher.mockImplementation((url, options) => url.includes("/evidence?") ? Promise.resolve(response({ ...page([{ ...evidenceLinks[0], id: url.includes("page=1") ? 30 : 18, capturedName: url.includes("page=1") ? "Retained old version" : "First version", associationActive: false, permissions: {} }]), totalPages: 2, totalElements: 21 })) : normal(url, options));
  await open(); const evidence = within(screen.getByRole("region", { name: "Supporting documents" })); fireEvent.click(evidence.getByLabelText("Include removed associations")); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes("evidence?includeRemoved=true"))).toBe(true)); await waitFor(() => expect(evidence.getByText("Next evidence")).toBeEnabled()); fireEvent.click(evidence.getByText("Next evidence")); await screen.findByText(/Retained old version/); expect(evidence.getByText(/Removed association/)).toBeInTheDocument();
});
