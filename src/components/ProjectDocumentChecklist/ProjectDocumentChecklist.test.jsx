import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProjectDocumentChecklist from "./ProjectDocumentChecklist";
import { downloadDocument } from "../../utils/documentDownload";
jest.mock("../../utils/documentDownload", () => ({ downloadDocument: jest.fn() }));
jest.mock("../DocumentVersions/DocumentVersions", () => () => <div>Version viewer</div>);
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const baseItem = { itemKey: "ASSESSMENT", label: "Project assessment", guidance: "One file does not establish completeness.", order: 1, applicability: "APPLICABLE", applicabilitySource: "DEFAULT", state: "MISSING_EVIDENCE", revision: 3, evidence: [] };
const evidence = { documentId: 10, documentName: "Original.pdf", versionNumber: 1, status: "FINAL", downloadEligible: true, hasNewerVersion: true, currentDocumentId: 11 };
let envelope, api;
const writes = () => api.mock.calls.filter(([, options]) => ["POST", "PUT", "DELETE"].includes(options?.method));
const open = async () => {
  const view = render(<ProjectDocumentChecklist projectId={2} authFetch={api} categories={[]} refreshKey={0} />);
  const details = view.container.querySelector("details");
  details.open = true; fireEvent(details, new Event("toggle"));
  await screen.findByText("Project assessment");
  await waitFor(() => expect(screen.queryByText("Loading checklist…")).not.toBeInTheDocument());
  const item = view.container.querySelectorAll("details")[1]; item.open = true; fireEvent(item, new Event("toggle"));
  return view;
};
beforeEach(() => {
  envelope = { editable: true, definitionVersion: 1, summary: { totalItems: 1, missingEvidence: 1, needsAssessment: 0, evidenceRecorded: 0, evidenceUnavailable: 0, notApplicable: 0, evidenceLinks: 0, unavailableEvidenceLinks: 0 }, items: [{ ...baseItem }] };
  api = jest.fn(async (url, options) => {
    if (["PUT", "POST", "DELETE"].includes(options?.method)) return response({ ...envelope.items[0], revision: 4 });
    if (url.includes("/documents/project/")) return response([{ id: 11, projectId: 2, isDeleted: false, documentName: "New.pdf", versionNumber: 2, isCurrent: true }]);
    return response(envelope);
  });
  downloadDocument.mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());
test("uses server guidance and states, distinguishing default from explicit decisions", async () => {
  await open();
  expect(screen.getByText(baseItem.guidance)).toBeVisible();
  expect(screen.getByText(/Default applicability/)).toBeVisible();
  expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
});
test("sends current revision and trimmed reason; rejects a blank explanation", async () => {
  await open();
  fireEvent.change(screen.getByLabelText("Applicability"), { target: { value: "NOT_APPLICABLE" } });
  fireEvent.click(screen.getByText("Save applicability"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Explain why");
  expect(writes()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(/Explanation/), { target: { value: "  No visits planned.  " } });
  fireEvent.click(screen.getByText("Save applicability"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ applicability: "NOT_APPLICABLE", reason: "No visits planned.", expectedRevision: 3 });
});
test("retains unavailable evidence under Not applicable, allows unlink, and reverses without a reason", async () => {
  envelope.items = [{ ...baseItem, applicability: "NOT_APPLICABLE", state: "NOT_APPLICABLE", notApplicableReason: "Not needed", evidence: [{ ...evidence, downloadEligible: false }] }];
  await open();
  expect(screen.getByText("Original.pdf")).toBeVisible();
  expect(screen.getByText("Download linked version")).toBeDisabled();
  expect(screen.getByText("Remove evidence link")).toBeEnabled();
  expect(screen.queryByLabelText("Document evidence")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Applicability"), { target: { value: "NOT_ASSESSED" } });
  fireEvent.click(screen.getByText("Save applicability"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ applicability: "NOT_ASSESSED", expectedRevision: 3 });
});
test("read-only envelope blocks all mutation controls but permits exact linked downloads", async () => {
  envelope.editable = false; envelope.items = [{ ...baseItem, evidence: [evidence] }];
  await open();
  expect(screen.queryByText("Save applicability")).not.toBeInTheDocument();
  expect(screen.queryByText("Remove evidence link")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Download linked version"));
  await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith(10, api, expect.any(AbortSignal)));
});
test("links explicit exact version with revision, without changing applicability", async () => {
  await open(); await screen.findByRole("option", { name: /New.pdf/ });
  fireEvent.change(screen.getByLabelText("Document evidence"), { target: { value: "11" } });
  fireEvent.click(screen.getByText("Link evidence"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ documentId: 11, expectedRevision: 3 });
});
test("409 refreshes current state without retrying a decision", async () => {
  const normal = api.getMockImplementation();
  api.mockImplementation(async (url, options) => {
    if (options?.method === "PUT") { envelope.items = [{ ...baseItem, revision: 4, applicability: "NOT_ASSESSED", state: "NEEDS_ASSESSMENT" }]; return response({ message: "Checklist item changed." }, 409); }
    return normal(url, options);
  });
  await open(); fireEvent.click(screen.getByText("Save applicability"));
  await screen.findByText(/has not been retried/);
  await waitFor(() => expect(screen.getByLabelText("Applicability")).toHaveValue("NOT_ASSESSED"));
  expect(writes()).toHaveLength(1);
});
test("unlink sends revision and never deletes document itself", async () => {
  envelope.items = [{ ...baseItem, evidence: [evidence] }];
  jest.spyOn(window, "confirm").mockReturnValue(true);
  await open(); fireEvent.click(screen.getByText("Remove evidence link"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toContain("/document-checklist/ASSESSMENT/evidence/10?expectedRevision=3");
});
test("historical discovery removes currentOnly filter", async () => {
  await open(); fireEvent.click(screen.getByLabelText("Include active historical versions"));
  await waitFor(() => expect(api.mock.calls.some(([url]) => url.endsWith("/documents/project/2?"))).toBe(true));
});
test("unmounted loads cannot display a previous project", async () => {
  let resolve;
  api.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const view = render(<ProjectDocumentChecklist projectId={2} authFetch={api} categories={[]} refreshKey={0} />);
  const details = view.container.querySelector("details"); details.open = true; fireEvent(details, new Event("toggle"));
  view.unmount();
  await act(async () => resolve(response(envelope)));
  expect(screen.queryByText("Project assessment")).not.toBeInTheDocument();
});

test("attention filter hides recorded and not-applicable items without changing saved decisions", async () => {
  envelope.items = [
    {...baseItem},
    {...baseItem, itemKey: "RECORDED", label: "Recorded item", state: "EVIDENCE_RECORDED", order: 2, evidence: [evidence]},
    {...baseItem, itemKey: "EXEMPT", label: "Exempt item", state: "NOT_APPLICABLE", order: 3},
    {...baseItem, itemKey: "UNAVAILABLE", label: "Unavailable item", state: "EVIDENCE_UNAVAILABLE", order: 4},
  ];
  envelope.summary = {...envelope.summary, totalItems: 4, evidenceRecorded: 1, notApplicable: 1, evidenceUnavailable: 1};
  await open();
  expect(screen.getByRole("progressbar", {name: "Items with evidence recorded"})).toHaveAttribute("max", "3");
  fireEvent.click(screen.getByLabelText("Needs attention only"));
  expect(screen.queryByText("Recorded item")).not.toBeInTheDocument();
  expect(screen.queryByText("Exempt item")).not.toBeInTheDocument();
  expect(screen.getByText("Unavailable item")).toBeInTheDocument();
  expect(screen.getByText("Project assessment")).toBeInTheDocument();
  expect(writes()).toHaveLength(0);
  fireEvent.click(screen.getByLabelText("Needs attention only"));
  expect(screen.getByText("Recorded item")).toBeInTheDocument();
});
