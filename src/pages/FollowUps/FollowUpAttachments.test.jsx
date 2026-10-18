import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FollowUpAttachments from "./FollowUpAttachments";
import FollowUpDetails from "./FollowUpDetails";
import { downloadDocument } from "../../utils/documentDownload";

jest.mock("../../utils/documentDownload", () => ({ downloadDocument: jest.fn(async () => {}) }));
const task = { id: 9, projectId: 2, revision: 4, attachmentCount: 0 };
const permissions = { canLink: true, canUnlink: true, canUpload: true, issues: [] };
const envelope = { projectId: 2, followUpId: 9, followUpRevision: 4, page: 0, totalPages: 0, totalElements: 0, content: [], permissions };
const attachment = { documentId: 71, documentName: "Report.pdf", versionNumber: 1, isCurrent: false, hasNewerVersion: true, downloadEligible: true, canUnlink: true, uploadedBy: { username: "uploader" }, linkedBy: { employeeName: "Manager" } };
const response = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });
let current, fetch, command, uploaded, onOperation;
beforeEach(() => {
  sessionStorage.clear(); localStorage.setItem("authToken", `x.${btoa(JSON.stringify({sub:"manager"}))}.x`);
  current = { ...envelope }; uploaded = { id: 71, projectId: 2, documentName: "Report.pdf" };
  command = async () => response({ ...task, revision: 5, attachmentCount: 1 });
  fetch = jest.fn(async (url, options = {}) => {
    if (url.endsWith("/categories")) return response([{ id: "UNCATEGORIZED", label: "Uncategorized" }]);
    if (url.endsWith("/upload")) return response(uploaded);
    if (options.method) return command(url, options);
    if (url.includes("/documents/project/")) return response([{ ...uploaded, versionNumber: 1, isCurrent: false }]);
    return response(current);
  });
  onOperation = jest.fn(operation => operation());
});
afterEach(() => jest.restoreAllMocks());
const mount = props => render(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} {...props} />);
async function selectExisting() {
  fireEvent.click(await screen.findByText("Link existing project document"));
  await screen.findByRole("option", { name: /Report.pdf.*Historical/ });
  fireEvent.change(screen.getByLabelText("Exact document version"), { target: { value: "71" } });
  fireEvent.click(screen.getByText("Link selected version"));
}
test("attachments remain visible with details collapsed and older backends stay compatible", async () => {
  const view = render(<FollowUpDetails task={task} authFetch={fetch} />);
  expect(await screen.findByText("Upload and attach")).toBeVisible();
  expect(screen.getByRole("button", { name: "Details & activity" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText(/0 attachments/)).toBeVisible();
  view.rerender(<FollowUpDetails task={{ ...task, attachmentCount: undefined }} />);
  fireEvent.click(screen.getByText("Details & activity"));
  expect(screen.queryByRole("region", { name: "Follow-up attachments" })).not.toBeInTheDocument();
});
test("links a historical exact ID against the task project and observed revision", async () => {
  mount(); await selectExisting();
  await waitFor(() => expect(onOperation).toHaveBeenCalledTimes(1));
  expect(fetch.mock.calls.find(([,o]) => o?.method === "POST")).toEqual([expect.stringContaining("/projects/2/follow-ups/9/attachments"), expect.objectContaining({ body: JSON.stringify({documentId:71,expectedRevision:4}) })]);
});
test("first file selection survives a focus refresh and uploads once with unchanged defaults", async () => {
  const view = mount();
  await waitFor(() => expect(screen.getByRole("button", {name:/Choose a file, or drag/})).toBeEnabled());
  let finish;
  const original = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.includes("/attachments?") ? new Promise(resolve => { finish = resolve; }) : original(url, options));
  view.rerender(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} observation={1} disabled />);
  fireEvent.change(screen.getByLabelText("Upload follow-up attachment"), {target:{files:[new File(["data"], "First.pdf", {type:"application/pdf"})]}});
  expect(screen.getByText(/Selected: First.pdf/)).toBeVisible();
  expect(onOperation).not.toHaveBeenCalled();
  await act(async () => finish(response(envelope)));
  view.rerender(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} observation={1} />);
  await waitFor(() => expect(onOperation).toHaveBeenCalledTimes(1));
  const uploads = fetch.mock.calls.filter(([url]) => url.endsWith("/upload"));
  expect(uploads).toHaveLength(1);
  expect(uploads[0][1].body.get("category")).toBe("UNCATEGORIZED");
  expect(uploads[0][1].body.get("status")).toBe("DRAFT");
  expect(uploads[0][1].body.has("documentDate")).toBe(false);
  await waitFor(() => expect(fetch.mock.calls.filter(([,options]) => options?.method === "POST")).toHaveLength(2));
});
test("upload then conflict retains document ID and retries only linking with refreshed revision", async () => {
  command = async () => { current = {...envelope, followUpRevision: 6}; return response({message:"Task changed"},409); };
  mount(); await screen.findByText("Upload and attach");
  await waitFor(() => expect(screen.getByLabelText("Upload follow-up attachment")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Upload follow-up attachment"), { target: { files: [new File(["data"],"Report.pdf",{type:"application/pdf"})] } });
  await screen.findByText(/Uploaded to Project Documents:/);
  const review = await screen.findByText("I reviewed the refreshed attachments");
  await waitFor(() => expect(review).toBeEnabled());
  expect(screen.getByText("Link uploaded document")).toBeDisabled();
  fireEvent.click(review);
  command = async () => response({...task,revision:7,attachmentCount:1});
  fireEvent.click(screen.getByText("Link uploaded document"));
  await waitFor(() => expect(screen.queryByText(/Uploaded to Project Documents:/)).not.toBeInTheDocument());
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/upload"))).toHaveLength(1);
  expect(JSON.parse(fetch.mock.calls.filter(([,o]) => o?.method === "POST").at(-1)[1].body)).toEqual({documentId:71,expectedRevision:6});
});
test("uncertain upload blocks a second upload and survives remount in this account's tab", async () => {
  const original = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => url.endsWith("/upload") ? Promise.reject(new Error("Connection lost")) : original(url, options));
  const view = mount();
  await waitFor(() => expect(screen.getByLabelText("Upload follow-up attachment")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Upload follow-up attachment"), { target: { files: [new File(["data"],"Report.pdf",{type:"application/pdf"})] } });
  await screen.findByText(/The upload result is uncertain/);
  expect(screen.getByLabelText("Upload follow-up attachment")).toBeDisabled();
  view.unmount(); mount();
  expect(await screen.findByText(/The upload result is uncertain/)).toBeVisible();
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/upload"))).toHaveLength(1);
});
test("download pins original version; unlink only uses association endpoint", async () => {
  current={...envelope,content:[attachment],totalPages:1,totalElements:1};
  jest.spyOn(window,"confirm").mockReturnValue(true);
  mount(); fireEvent.click(await screen.findByText("Download linked version"));
  expect(downloadDocument).toHaveBeenCalledWith(71,fetch);
  fireEvent.click(screen.getByText("Remove link"));
  await waitFor(()=>expect(onOperation).toHaveBeenCalledTimes(1));
  expect(fetch.mock.calls.find(([,o])=>o?.method === "DELETE")[0]).toContain("/follow-ups/9/attachments/71?expectedRevision=4");
  expect(fetch.mock.calls.some(([url,o])=>o?.method === "DELETE" && url.includes("/api/documents/"))).toBe(false);
});
test("read-only permissions and unavailable documents are displayed without mutation controls", async () => {
  current={...envelope,permissions:{canLink:false,canUpload:false,canUnlink:false,issues:["REOPEN_FOLLOW_UP_REQUIRED"]},content:[{...attachment,downloadEligible:false,canUnlink:false}]};
  mount(); await screen.findByText("Report.pdf");
  expect(screen.getByText(/Reopen this follow-up/)).toBeVisible();
  expect(screen.getByText("Download linked version")).toBeDisabled();
  expect(screen.queryByText("Remove link")).not.toBeInTheDocument();
  expect(screen.queryByText("Upload and attach")).not.toBeInTheDocument();
  expect(screen.queryByText("Link existing project document")).not.toBeInTheDocument();
});
test("background refresh keeps rendered attachments and paging is bounded", async () => {
  current={...envelope,content:[attachment],totalPages:2,totalElements:21};
  const view=mount(); const name=await screen.findByText("Report.pdf");
  fireEvent.click(screen.getByText("Next attachments"));
  await waitFor(()=>expect(fetch.mock.calls.some(([url])=>url.includes("page=1&size=20"))).toBe(true));
  let finish; const original=fetch.getMockImplementation();
  fetch.mockImplementation((url,o)=>url.includes("/attachments?") ? new Promise(resolve=>{finish=resolve;}) : original(url,o));
  view.rerender(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} observation={1} />);
  expect(screen.getByText("Report.pdf")).toBe(name);
  expect(screen.queryByText("Loading attachments…")).not.toBeInTheDocument();
  await act(async()=>finish(response(current)));
});
test("upload respects shared busy lock and rejects unsupported files", async () => {
  const view=mount({disabled:true}); await screen.findByText("Upload and attach");
  expect(screen.getByRole("button", { name: /Choose a file, or drag/ })).toBeDisabled();
  view.rerender(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} />);
  await waitFor(()=>expect(screen.getByLabelText("Upload follow-up attachment")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Upload follow-up attachment"),{target:{files:[new File(["data"],"test.exe")]}});
  expect(await screen.findByText(/Unsupported file type/)).toBeVisible();
  expect(onOperation).not.toHaveBeenCalled();
});

 test("only available current attachments with change permission offer Edit details", async () => {
  current = {...envelope, content:[attachment]};
  const view = mount(); await screen.findByText("Report.pdf");
  expect(screen.queryByRole("button", {name:"Edit details"})).not.toBeInTheDocument();
  current = {...current,content:[{...attachment,isCurrent:true}]};
  view.rerender(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} observation={1} />);
  expect(await screen.findByRole("button", {name:"Edit details"})).toBeEnabled();
  current = {...current, permissions:{...permissions,canLink:false}};
  view.rerender(<FollowUpAttachments task={task} authFetch={fetch} onOperation={onOperation} observation={2} />);
  await waitFor(() => expect(screen.queryByRole("button", {name:"Edit details"})).not.toBeInTheDocument());
});
