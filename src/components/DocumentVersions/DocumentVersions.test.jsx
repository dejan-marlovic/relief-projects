import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DocumentVersions from "./DocumentVersions";

const older = { id: 1, documentName: "old.pdf", isCurrent: false, isDeleted: false, versionNumber: 1, status: "FINAL" };
const current = { id: 2, documentName: "new.pdf", isCurrent: true, isDeleted: false, versionNumber: 2, status: "FINAL", category: "FINANCE", documentDate: "2024-02-29" };
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
let api, changed, download;
const mount = (extra = {}) => render(<DocumentVersions document={older} authFetch={api} categories={[{ id: "FINANCE", label: "Finance" }]} canEdit canDelete onDownload={download} downloading={[]} revision={0} onChanged={changed} onClose={jest.fn()} validateFile={(file) => file ? "" : "Choose a file."} {...extra} />);
beforeEach(() => {
  changed = jest.fn(); download = jest.fn();
  api = jest.fn(() => Promise.resolve(response({ currentDocumentId: 2, currentDocumentDeleted: false, versions: [older, current] })));
});
afterEach(() => jest.restoreAllMocks());

test("reader sees history and downloads historical active files without write controls", async () => {
  mount({ canEdit: false, canDelete: false });
  await screen.findByText("Version 1 · old.pdf");
  expect(screen.queryByRole("button", { name: "Upload replacement" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Delete version/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Download version 1" }));
  expect(download).toHaveBeenCalledWith(1);
});

test("replacement starts Draft with an empty date and category inheritance, sending only permitted multipart fields", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Upload replacement" }));
  expect(screen.getByLabelText("Replacement status")).toHaveValue("DRAFT");
  expect(screen.getByLabelText("Replacement document date")).toHaveValue("");
  expect(screen.getByLabelText("Replacement category")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Replacement file"), { target: { files: [new File(["test"], "next.pdf", { type: "application/pdf" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Save replacement" }));
  await screen.findByText("Replacement uploaded. The previous version is retained.");
  const [url, options] = api.mock.calls.find(([, options]) => options?.method === "POST");
  expect(url).toMatch(/\/documents\/2\/replace$/);
  expect([...options.body.keys()]).toEqual(["file", "status"]);
  expect(options.body.get("status")).toBe("DRAFT");
  expect(options.headers).toBeUndefined();
  expect(changed).toHaveBeenCalledTimes(1);
});

test.each([409, 404, 500])("replacement failure %s refreshes history and closes obsolete form", async (status) => {
  const get = api.getMockImplementation();
  api.mockImplementation((url, options) => options?.method === "POST" ? Promise.resolve(response({ message: "Refresh history" }, status)) : get());
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Upload replacement" }));
  fireEvent.change(screen.getByLabelText("Replacement file"), { target: { files: [new File(["test"], "next.pdf")] } });
  fireEvent.click(screen.getByRole("button", { name: "Save replacement" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Refresh history");
  expect(screen.queryByRole("button", { name: "Save replacement" })).not.toBeInTheDocument();
  expect(api.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
  expect(changed).toHaveBeenCalled();
});

test("uncertain network failure refreshes history without retrying upload", async () => {
  const get = api.getMockImplementation();
  api.mockImplementation((url, options) => options?.method === "POST" ? Promise.reject(new Error("Network error")) : get());
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Upload replacement" }));
  fireEvent.change(screen.getByLabelText("Replacement file"), { target: { files: [new File(["test"], "next.pdf")] } });
  fireEvent.click(screen.getByRole("button", { name: "Save replacement" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("outcome could not be confirmed");
  expect(api.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Save replacement" })).not.toBeInTheDocument();
});

test("deleted head is not available; restoration refreshes the chain without promoting history", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  api.mockResolvedValue(response({ currentDocumentId: 2, currentDocumentDeleted: true, versions: [older, { ...current, isDeleted: true }] }));
  mount();
  expect(await screen.findByRole("status")).toHaveTextContent("no active current version");
  expect(screen.queryByRole("button", { name: "Download version 2" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Upload replacement" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Restore version 2" }));
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(api.mock.calls.some(([url, options]) => url.endsWith("/2/restore") && options.method === "PUT")).toBe(true);
});

test("unknown deletion state cannot download or replace", async () => {
  api.mockResolvedValue(response({ versions: [{ ...current, isDeleted: null }] }));
  mount();
  await screen.findByText(/Availability unknown/);
  expect(screen.queryByRole("button", { name: /Download version/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Upload replacement" })).not.toBeInTheDocument();
});
