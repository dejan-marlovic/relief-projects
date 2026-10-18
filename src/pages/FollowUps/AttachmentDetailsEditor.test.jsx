import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AttachmentDetailsEditor from "./AttachmentDetailsEditor";
import { notifySuccess } from "../../utils/successNotifications";
jest.mock("../../utils/successNotifications", () => ({ notifySuccess: jest.fn() }));
const initial = { id: 71, projectId: 2, employeeId: 4, documentName: "Report.pdf", isCurrent: true, status: "DRAFT", category: "UNCATEGORIZED", documentDate: "2026-10-18" };
let stored, authFetch, onSaved;
beforeEach(() => {
  jest.clearAllMocks(); stored = { ...initial }; onSaved = jest.fn();
  authFetch = jest.fn(async (url, options = {}) => {
    if (options.method === "PUT") { stored = { ...stored, ...JSON.parse(options.body) }; return { ok: true }; }
    return { ok: true, json: async () => [stored] };
  });
});
const mount = () => render(<AttachmentDetailsEditor item={{documentId:71,documentName:"Report.pdf"}} projectId={2} authFetch={authFetch} categories={[{id:"UNCATEGORIZED",label:"Uncategorized"},{id:"FINANCE",label:"Finance"}]} onOperation={operation => operation()} onSaved={onSaved} onClose={jest.fn()} />);
test("autosaves metadata only, verifies it and acknowledges an unchanged manual save", async () => {
  mount(); await screen.findByLabelText("Category");
  fireEvent.change(screen.getByLabelText("Category"), {target:{value:"FINANCE"}});
  fireEvent.change(screen.getByLabelText("Status"), {target:{value:"FINAL"}});
  fireEvent.change(screen.getByLabelText("Document date"), {target:{value:""}});
  await waitFor(() => expect(onSaved).toHaveBeenCalled(), {timeout:3000});
  const writes = authFetch.mock.calls.filter(([,o]) => o?.method === "PUT");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][1].body)).toEqual({id:71,projectId:2,employeeId:4,documentName:"Report.pdf",category:"FINANCE",status:"FINAL",documentDate:null});
  expect(notifySuccess).toHaveBeenCalledWith("Document details saved.");
  fireEvent.click(screen.getByText("Save details"));
  expect(notifySuccess).toHaveBeenCalledWith("All document details are already saved.");
  expect(authFetch.mock.calls.filter(([,o]) => o?.method === "PUT")).toHaveLength(1);
});
test("manual save flushes immediately and preserves edits when a replacement appears", async () => {
  mount(); await screen.findByLabelText("Category");
  fireEvent.change(screen.getByLabelText("Category"), {target:{value:"FINANCE"}});
  stored = {...stored,isCurrent:false};
  fireEvent.click(screen.getByText("Save details"));
  expect(await screen.findByRole("alert")).toHaveTextContent("no longer an active current version");
  expect(screen.getByLabelText("Category")).toHaveValue("FINANCE");
  expect(authFetch.mock.calls.filter(([,o]) => o?.method === "PUT")).toHaveLength(0);
});
test("concurrent changes require explicit conflict review", async () => {
  mount(); await screen.findByLabelText("Status");
  fireEvent.change(screen.getByLabelText("Document date"), {target:{value:"2026-10-19"}});
  stored = {...stored,documentDate:"2026-10-20"};
  fireEvent.click(screen.getByText("Save details"));
  expect(await screen.findByRole("alert")).toHaveTextContent("changed elsewhere");
  expect(authFetch.mock.calls.filter(([,o]) => o?.method === "PUT")).toHaveLength(0);
  fireEvent.click(screen.getByText("Keep my edits and retry"));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(stored.documentDate).toBe("2026-10-19");
});
