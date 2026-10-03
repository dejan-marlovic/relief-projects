jest.mock("./TravelReport", () => () => <div>Post-trip reporting integration</div>);
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TravelRegister } from "./Travel";
import TravelSteps from "./TravelSteps";
import { travelPayload } from "./travelApi";
import { mutationNotice } from "../../utils/appFetch";

const page = content => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 });
const response = (value, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(value) });
let record, fetcher, writeHandler, actionLinks, evidenceLinks;
const writes = () => fetcher.mock.calls.filter(([, options]) => ["POST", "PUT"].includes(options?.method));
beforeEach(() => {
  record = { id: 31, projectId: 7, travellerEmployeeId: 18, traveller: { employeeId: 18, displayName: "Alex Example", isDeleted: false }, purpose: "Monitor distributions", destination: "Amman", departureDate: "2026-11-10", returnDate: "2026-11-13", notes: "", today: "2026-10-02", state: "DRAFT", revision: 2, currentSubmission: null, currentApproval: null, permissions: { canEdit: true, canSubmit: true, canCancel: true, canDelete: true, canAddEvidence: true, canLinkAction: true }, issues: [] };
  actionLinks = []; evidenceLinks = []; writeHandler = () => response(record);
  fetcher = jest.fn(async (url, options) => {
    if (["POST", "PUT"].includes(options?.method)) return writeHandler(url, options);
    if (url.includes("employees/active")) return response([{ id: 18, firstName: "Alex", lastName: "Example" }]);
    if (url.includes("follow-ups?")) return response({ ...page([{ id: 84, projectId: 7, title: "Visit report", revision: 5, status: "OPEN", isDeleted: false, assignee: { displayName: "Alex", isDeleted: false } }]), totalPages: 2 });
    if (url.includes("documents/project")) return response([{ id: 109, projectId: 7, documentName: "ToR", versionNumber: 1, status: "FINAL", isDeleted: false }]);
    if (url.includes("/history?")) return response(page([{ id: 70, revision: 0, action: "CREATE", after: { purpose: "Original purpose" } }]));
    if (url.includes("/actions?")) return response(page(actionLinks));
    if (url.includes("/evidence?")) return response(page(evidenceLinks));
    if (/\/31$/.test(url)) return response(record);
    return response({ ...page([record]), canCreate: true, today: record.today });
  });
});
const mount = () => render(<MemoryRouter><TravelRegister projectId={7} authFetch={fetcher} /></MemoryRouter>);
async function open() { mount(); fireEvent.click(await screen.findByText("Open request #31")); await screen.findByRole("region", { name: "Travel request details" }); await waitFor(() => expect(screen.getAllByText("Monitor distributions · Travel request #31")).toHaveLength(1)); for (const name of [/Plan the trip/, /Travel approval/]) { const step = screen.getByRole("button", { name }); if (step.getAttribute("aria-expanded") === "false") fireEvent.click(step); } }
async function save(title) { const button = screen.getByText(`Save ${title.toLowerCase()}`); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); }
function submitted() {
  record.state = "SUBMITTED"; record.currentSubmission = { id: 71, actor: { username: "manager" }, basis: { fields: { destination: "Original Amman" } } };
  record.permissions = { canApprove: true, canReturn: true };
}

test("create sends only trip inputs and date-only values without automatic task writes", async () => {
  mount(); fireEvent.click(await screen.findByText("Create travel request")); await screen.findByRole("option", { name: "Alex Example" });
  fireEvent.change(screen.getByLabelText("Traveller"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Purpose"), { target: { value: " Visit partner " } }); fireEvent.change(screen.getByLabelText("Destination"), { target: { value: " Amman " } });
  await save("Create travel request"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ travellerEmployeeId: 18, purpose: "Visit partner", destination: "Amman", departureDate: "2026-10-02", returnDate: "2026-10-02", notes: null });
});
test("submitted request uses permissions, displays frozen basis and sends exact submission ID", async () => {
  submitted(); await open(); expect(screen.queryByText("Edit trip details")).not.toBeInTheDocument(); expect(screen.getByText("Original Amman")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Approve travel")); fireEvent.change(screen.getByLabelText("Approval note"), { target: { value: "Approved stated trip" } }); await save("Approve travel"); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, expectedSubmissionId: 71, note: "Approved stated trip" });
});
test("self approval issue is visible and server denies approval capability", async () => {
  submitted(); record.permissions.canApprove = false; record.issues = [{ message: "Another independent approver must decide." }]; await open();
  expect(screen.queryByRole("button", { name: "Approve travel" })).not.toBeInTheDocument(); expect(screen.getAllByText("Another independent approver must decide.").length).toBeGreaterThan(0);
});
test("return requires a reason and uses submission identity", async () => {
  submitted(); await open(); fireEvent.click(screen.getByText("Return for changes")); fireEvent.submit(screen.getByRole("form", { name: "Return for changes" })); expect(writes()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Clarify sites" } }); await save("Return for changes"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, expectedSubmissionId: 71, reason: "Clarify sites" });
});
test("withdrawal uses approval ID and cannot edit approved fields", async () => {
  submitted(); record.state = "APPROVED"; record.currentApproval = { id: 72, basis: record.currentSubmission.basis }; record.permissions = { canWithdrawApproval: true };
  await open(); expect(screen.queryByText("Edit trip details")).not.toBeInTheDocument(); fireEvent.click(screen.getByText("Withdraw approval")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Dates changed" } }); await save("Withdraw approval"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, expectedApprovalId: 72, reason: "Dates changed" });
});
test("returned edits require reason and preserve date-only fields", async () => {
  record.state = "RETURNED"; record.currentSubmission = { id: 71 }; await open(); fireEvent.click(screen.getByText("Edit trip details")); fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "Irbid" } }); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Clarified sites" } }); await save("Edit trip details"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][1].method).toBe("PUT"); expect(JSON.parse(writes()[0][1].body)).toMatchObject({ expectedRevision: 2, departureDate: "2026-11-10", destination: "Irbid", reason: "Clarified sites" });
});
test("stale approval retains note and requires explicit fresh-basis review without replay", async () => {
  submitted(); writeHandler = () => { record = { ...record, revision: 4, currentSubmission: { ...record.currentSubmission, id: 73 } }; return response({ code: "TRAVEL_STALE", message: "Travel request changed" }, 409); };
  await open(); fireEvent.click(screen.getByText("Approve travel")); fireEvent.change(screen.getByLabelText("Approval note"), { target: { value: "Reviewed trip" } }); await save("Approve travel"); await screen.findByText("Travel request changed");
  expect(screen.getByLabelText("Approval note")).toHaveValue("Reviewed trip"); expect(screen.getByText("Save approve travel")).toBeDisabled(); expect(writes()).toHaveLength(1);
  const retry = screen.getByText("I reviewed the refreshed state; enable retry"); await waitFor(() => expect(retry).toBeEnabled()); fireEvent.click(retry); writeHandler = () => response(record); await save("Approve travel"); await waitFor(() => expect(writes()).toHaveLength(2)); expect(JSON.parse(writes()[1][1].body)).toMatchObject({ expectedRevision: 4, expectedSubmissionId: 73, note: "Reviewed trip" });
});
test("uncertain create retains draft and never automatically creates twice", async () => {
  writeHandler = () => { throw new Error("Connection lost"); }; mount(); fireEvent.click(await screen.findByText("Create travel request")); await screen.findByRole("option", { name: "Alex Example" });
  fireEvent.change(screen.getByLabelText("Traveller"), { target: { value: "18" } }); fireEvent.change(screen.getByLabelText("Purpose"), { target: { value: "Visit" } }); fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "Amman" } }); await save("Create travel request"); await screen.findByText("Connection lost"); expect(screen.getByLabelText("Purpose")).toHaveValue("Visit"); expect(writes()).toHaveLength(1); expect(screen.getByText("Save create travel request")).toBeDisabled();
});
test("task link captures selected task revision and purpose; pagination does not submit", async () => {
  await open(); fireEvent.click(screen.getByText("Link existing follow-up")); const next = await screen.findByText("Next available follow-ups"); await waitFor(() => expect(next).toBeEnabled()); fireEvent.click(next); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes("follow-ups?") && url.includes("page=1"))).toBe(true)); expect(writes()).toHaveLength(0);
  fireEvent.click(await screen.findByText("Select follow-up #84")); fireEvent.change(screen.getByLabelText("Follow-up purpose"), { target: { value: "REPORTING" } }); await save("Link existing follow-up"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, followUpId: 84, expectedFollowUpRevision: 5, purpose: "REPORTING" }); expect(writes()[0][0]).toMatch(/travel-requests\/31\/actions$/);
});
test("evidence sends exact version ID", async () => {
  await open(); fireEvent.click(screen.getByText("Link supporting document")); await screen.findByRole("option", { name: /ToR · Version 1/ }); fireEvent.change(screen.getByLabelText("Supporting document"), { target: { value: "109" } }); await save("Link supporting document"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toEqual({ documentId: 109, expectedRevision: 2 });
});
test("approved links distinguish basis from late evidence and disable unavailable downloads", async () => {
  submitted(); record.state = "APPROVED"; record.permissions = {};
  evidenceLinks = [{ id: 1, documentId: 109, capturedName: "ToR", versionNumber: 1, includedInCurrentApproval: true, associationActive: true, downloadEligible: false, permissions: { canRemove: false } }, { id: 2, documentId: 110, capturedName: "Report", versionNumber: 2, includedInCurrentApproval: false, associationActive: true, permissions: { canRemove: true } }];
  await open(); expect(await screen.findByText("Included in approved submission")).toBeInTheDocument(); expect(screen.getByText("Added after approval — outside the approved submission")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Download document #109 version 1" })).toBeDisabled(); expect(screen.queryByText("Remove evidence association #1")).not.toBeInTheDocument();
});
test("removal addresses association episode and includes reason", async () => {
  evidenceLinks = [{ id: 6, documentId: 109, capturedName: "ToR", permissions: { canRemove: true } }]; await open(); fireEvent.click(await screen.findByText("Remove evidence association #6")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong attachment" } }); await save("Remove evidence association"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toMatch(/evidence\/6\/remove$/); expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 2, reason: "Wrong attachment" });
});
test("deleted cancelled request only offers server-authorized restoration", async () => {
  record.state = "CANCELLED"; record.isDeleted = true; record.permissions = { canRestore: true }; await open(); const detail = screen.getByRole("region", { name: "Travel request details" }); expect(within(detail).queryByText("Approve travel")).not.toBeInTheDocument(); fireEvent.click(screen.getByText("Restore travel request")); expect(screen.getByText(/Restoration never reinstates approval/)).toBeInTheDocument(); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Restore retained record" } }); await save("Restore travel request"); await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toMatch(/\/restore$/);
});
test("filters omit empty optional values and refresh upon returning from other work", async () => {
  mount(); await screen.findByText("Open request #31"); expect(fetcher.mock.calls[0][0]).not.toMatch(/departureFrom|travellerEmployeeId/); fireEvent.change(screen.getByLabelText("Travel state"), { target: { value: "APPROVED" } }); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes("state=APPROVED"))).toBe(true)); const before = fetcher.mock.calls.length; fireEvent.focus(window); await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(before));
});
test("past drafts are preserved and payload rejects invalid ranges and oversized fields", () => {
  const form = { action: "create", draft: { ...record, notes: "", departureDate: "2020-01-01", returnDate: "2020-01-02" } }; expect(travelPayload(form).departureDate).toBe("2020-01-01"); expect(() => travelPayload({ ...form, draft: { ...form.draft, returnDate: "2019-12-31" } })).toThrow(/valid date range/); expect(() => travelPayload({ ...form, draft: { ...form.draft, purpose: "x".repeat(2001) } })).toThrow(/purpose/);
});
test("successful travel decisions use specific transient notices", () => {
  expect(mutationNotice("/api/projects/7/travel-requests/31/withdraw-approval", { method: "POST" }, { ok: true })).toBe("Travel approval withdrawn.");
});

test("stepper opens the relevant stage and disclosure never writes a decision", async () => {
  submitted(); mount(); fireEvent.click(await screen.findByText("Open request #31"));
  const plan = await screen.findByRole("button", { name: /Plan the trip/ });
  expect(plan).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: /Travel approval/ })).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(plan); expect(plan).toHaveAttribute("aria-expanded", "true"); expect(writes()).toHaveLength(0);
});

test("an open editor stays visible across external state changes", () => {
  const view = render(<TravelSteps record={record} editingStep="plan" plan={<p>Unsaved trip form</p>} approval={<p>Decision panel</p>} />);
  view.rerender(<TravelSteps record={{ ...record, state: "SUBMITTED" }} editingStep="plan" plan={<p>Unsaved trip form</p>} approval={<p>Decision panel</p>} />);
  expect(screen.getByText("Unsaved trip form")).toBeVisible();
  expect(screen.getByRole("button", { name: /Plan the trip/ })).toBeDisabled();
});
