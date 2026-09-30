import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ResultsRegister } from "./Results";
import { indicatorPayload, blankIndicator, measurementError } from "./indicatorApi";
import { ResultSummary } from "./ResultViews";

const page = content => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 });
const response = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
let indicator, reports, fetcher, rejectWrite;
const writes = () => fetcher.mock.calls.filter(([, o]) => ["POST", "PUT"].includes(o?.method));
beforeEach(() => {
  indicator = { ...blankIndicator(), id: 41, projectId: 2, name: "Households assisted", definition: "Unique households since January", measurementType: "COUNT", unit: "households", periodStart: "2026-01-01", periodEnd: "2026-12-31", targetValue: "500", revision: 3, measurementBasisFrozen: true, today: "2026-09-30", businessTimezone: "Europe/Stockholm", permissions: { canEdit: true, canRecordResult: true, canDelete: true }, summary: { latestResult: null } };
  const basis = { ...indicator, version: 1, targetRevision: 0, indicatorRevision: 0 };
  reports = [{ id: 91, state: "EFFECTIVE", asOfDate: "2026-09-20", value: "320", basis, notes: "Original notes", permissions: { canCorrect: true, canVoid: true, canAddEvidence: true }, evidence: page([]) }];
  rejectWrite = false;
  fetcher = jest.fn(async (url, options) => {
    if (["POST", "PUT"].includes(options?.method)) {
      if (rejectWrite) { indicator = { ...indicator, revision: 4 }; return response({ code: "INDICATOR_STALE", message: "Changed by another user" }, 409); }
      return response(indicator);
    }
    if (url.includes("/documents/project/")) return response([{ id: 42, projectId: 2, isDeleted: false, documentName: "Register.pdf", versionNumber: 1, status: "DRAFT" }]);
    if (url.includes("/evidence?")) return response({ ...page([]), indicatorRevision: indicator.revision });
    if (url.includes("/history?")) return response({ ...page([]), indicatorRevision: indicator.revision });
    if (/\/results\/91$/.test(url)) return response({ result: reports[0], indicatorRevision: indicator.revision });
    if (url.includes("/results?")) return response({ ...page(reports), indicatorRevision: indicator.revision });
    if (/\/41$/.test(url)) return response(indicator);
    return response({ ...page([indicator]), canCreate: true });
  });
});
const mount = () => render(<ResultsRegister projectId={2} authFetch={fetcher} />);
async function open() { mount(); fireEvent.click(await screen.findByText("Open indicator #41")); await screen.findByText("Record result"); }
test.each([
  ["999999999999999999.999999", "QUANTITY", true], ["0", "COUNT", true], ["1.5", "COUNT", false],
  ["100", "PERCENTAGE", true], ["100.000001", "PERCENTAGE", false], ["1.0000001", "QUANTITY", false],
  ["1000000000000000000", "QUANTITY", false], ["-1", "QUANTITY", false], ["1e2", "QUANTITY", false],
])("validates %s as %s without rounding", (value, type, valid) => expect(!measurementError(value, type)).toBe(valid));
test("frozen payload excludes definition and unknown baseline remains null", () => {
  expect(indicatorPayload({ ...indicator, name: " Updated " }, true)).toEqual({ name: "Updated", notes: null, targetValue: "500" });
  const body = indicatorPayload({ ...indicator, baselineKnown: false });
  expect(body.baselineValue).toBeNull(); expect(body.baselineDate).toBeNull(); expect(body.id).toBeUndefined(); expect(body.permissions).toBeUndefined();
});
test("latest snapshot uses captured target and never sums snapshots", () => {
  render(<ResultSummary unit="households" summary={{ latestResult: { value: "450", asOfDate: "2026-09-25", basis: { targetValue: "500", unit: "households" } }, recordedTargetValue: "500", currentTargetValue: "600", comparisonStatus: "TARGET_CHANGED", recordedBasisTargetMet: false }} />);
  expect(screen.getByText("450 households")).toBeInTheDocument(); expect(screen.getByText(/Current target: 600/)).toBeInTheDocument(); expect(screen.queryByText(/770/)).not.toBeInTheDocument(); expect(screen.getByText(/Reports are not added/)).toBeInTheDocument();
});
test("records exact quantities and date strings with explicit evidence", async () => {
  indicator.measurementType = "QUANTITY"; await open(); fireEvent.click(screen.getByText("Record result"));
  fireEvent.change(screen.getByLabelText(/Measured through/), { target: { value: "2026-09-25" } });
  fireEvent.change(screen.getByLabelText(/Reported value/), { target: { value: "9007199254740993.123456" } });
  fireEvent.click(await screen.findByLabelText(/Register.pdf/));
  await waitFor(() => expect(screen.getByText("Save record result")).toBeEnabled()); fireEvent.click(screen.getByText("Save record result"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 3, value: "9007199254740993.123456", asOfDate: "2026-09-25", notes: null, documentIds: [42] });
});
test("correction uses captured basis, retains date and explicitly replaces evidence", async () => {
  await open(); fireEvent.click(screen.getByText("Correct report #91"));
  expect(screen.queryByLabelText(/Measured through/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Reported value/), { target: { value: "300" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Deduplicated" } });
  await waitFor(() => expect(screen.getByText("Save correct report")).toBeEnabled()); fireEvent.click(screen.getByText("Save correct report"));
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toMatch(/91\/correct$/);
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 3, value: "300", notes: "Original notes", documentIds: [], reason: "Deduplicated" });
});
test("stale response preserves draft and requires explicit review before using fresh revision", async () => {
  rejectWrite = true; await open(); fireEvent.click(screen.getByText("Edit indicator"));
  expect(screen.getByLabelText("Definition and population")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Target value"), { target: { value: "600" } }); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "New target" } });
  await waitFor(() => expect(screen.getByText("Save edit indicator")).toBeEnabled()); fireEvent.click(screen.getByText("Save edit indicator"));
  await screen.findByText("Changed by another user"); expect(screen.getByLabelText("Target value")).toHaveValue("600"); expect(screen.getByText("Save edit indicator")).toBeDisabled(); expect(writes()).toHaveLength(1);
  const review = screen.getByText("I reviewed the refreshed records; enable retry"); await waitFor(() => expect(review).toBeEnabled()); fireEvent.click(review); rejectWrite = false;
  fireEvent.click(screen.getByText("Save edit indicator")); await waitFor(() => expect(writes()).toHaveLength(2)); expect(JSON.parse(writes()[1][1].body).expectedRevision).toBe(4);
});
test("voided date reuse sends explicit predecessor and new reporting date", async () => {
  reports[0] = { ...reports[0], state: "VOIDED", permissions: {} }; await open(); fireEvent.click(screen.getByText("Report again for this date"));
  expect(screen.getByLabelText(/Measured through/)).toHaveValue("2026-09-20");
  fireEvent.change(screen.getByLabelText(/Reported value/), { target: { value: "310" } }); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Fresh assessment" } });
  await waitFor(() => expect(screen.getByText("Save report again for voided date")).toBeEnabled()); fireEvent.click(screen.getByText("Save report again for voided date"));
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(JSON.parse(writes()[0][1].body)).toMatchObject({ replacesVoidedResultId: 91, asOfDate: "2026-09-20", value: "310", reason: "Fresh assessment" });
});
test("reader sees retained reports but no mutation controls", async () => {
  indicator.permissions = {}; reports[0].permissions = {}; mount(); fireEvent.click(await screen.findByText("Open indicator #41"));
  await screen.findByText(/Report #91 · effective/); expect(screen.queryByText("Record result")).not.toBeInTheDocument(); expect(screen.queryByText("Edit indicator")).not.toBeInTheDocument(); expect(screen.queryByText("Correct report #91")).not.toBeInTheDocument();
});
test("evidence pages expose retained associations beyond first page", async () => {
  const normal = fetcher.getMockImplementation(); fetcher.mockImplementation((url, options) => url.includes("/evidence?") ? Promise.resolve(response({ ...page([{ id: url.includes("page=1") ? 22 : 1, documentId: 42, capturedName: url.includes("page=1") ? "Older evidence" : "First evidence", versionNumber: 1, associationActive: false, availability: "DOCUMENT_DELETED", permissions: {} }]), totalElements: 21, totalPages: 2 })) : normal(url, options));
  await open(); fireEvent.click(screen.getByText(/Show evidence/)); await screen.findByText(/First evidence/); fireEvent.click(screen.getByText("Next evidence")); await screen.findByText(/Older evidence/);
  expect(within(screen.getByRole("region", { name: "Evidence for report 91" })).getByText(/Download version/)).toBeDisabled();
});
test("new indicator keeps unknown baseline and exact target without server-owned fields", async () => {
  mount(); fireEvent.click(await screen.findByText("Create indicator"));
  fireEvent.change(screen.getByLabelText("Indicator name"), { target: { value: "New measure" } });
  fireEvent.change(screen.getByLabelText("Definition and population"), { target: { value: "Distinct people" } });
  fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "people" } });
  fireEvent.change(screen.getByLabelText("Reporting starts"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText("Reporting ends (inclusive)"), { target: { value: "2026-12-31" } });
  fireEvent.change(screen.getByLabelText("Target value"), { target: { value: "9007199254740993" } });
  fireEvent.click(screen.getByText("Save create indicator")); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ name: "New measure", definition: "Distinct people", measurementType: "COUNT", unit: "people", direction: "HIGHER_IS_BETTER", periodStart: "2026-01-01", periodEnd: "2026-12-31", baselineKnown: false, baselineValue: null, baselineDate: null, targetValue: "9007199254740993", notes: null });
});
test("occupied date exposes existing entry without automatically correcting it", async () => {
  const normal = fetcher.getMockImplementation(); fetcher.mockImplementation((url, options) => options?.method === "POST" ? Promise.resolve(response({ code: "RESULT_DATE_OCCUPIED", message: "Date occupied", existingResultId: 91 }, 409)) : normal(url, options));
  await open(); fireEvent.click(screen.getByText("Record result")); fireEvent.change(screen.getByLabelText(/Reported value/), { target: { value: "330" } }); fireEvent.change(screen.getByLabelText(/Measured through/), { target: { value: "2026-09-20" } });
  await waitFor(() => expect(screen.getByText("Save record result")).toBeEnabled()); fireEvent.click(screen.getByText("Save record result"));
  await screen.findByText("Existing report for this date"); await screen.findByText(/Cancel the retained new-report draft/); expect(writes()).toHaveLength(1); expect(screen.getByLabelText(/Reported value/)).toHaveValue("330"); expect(screen.getByText("Save record result")).toBeDisabled();
});
test("permission loss after conflict blocks explicit retry", async () => {
  const normal = fetcher.getMockImplementation(); fetcher.mockImplementation((url, options) => { if (options?.method === "PUT") { indicator.permissions = {}; return Promise.resolve(response({ message: "Access changed" }, 403)); } return normal(url, options); });
  await open(); fireEvent.click(screen.getByText("Edit indicator")); fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Reviewed" } });
  await waitFor(() => expect(screen.getByText("Save edit indicator")).toBeEnabled()); fireEvent.click(screen.getByText("Save edit indicator")); await screen.findByText("Access changed");
  expect(screen.getByText("I reviewed the refreshed records; enable retry")).toBeDisabled(); expect(screen.getByText("Save edit indicator")).toBeDisabled(); expect(screen.getByText("Cancel")).toBeEnabled();
});
