import { documentFilename, downloadDocument } from "./documentDownload";
import { createAuthFetch } from "./http";

describe("protected document downloads", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => "blob:download");
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); localStorage.clear(); });

  test.each([
    ["attachment; filename=backup.pdf; filename*=UTF-8''Rapport%20%C3%A5.pdf", "Rapport å.pdf"],
    ['attachment; filename="report; final.pdf"', "report; final.pdf"],
    ["attachment; filename=backup.pdf; filename*=UTF-8''%ZZ", "backup.pdf"],
    ['attachment; filename="../../report.pdf"', "report.pdf"],
    ['attachment; filename="CON.txt"', "Document-7"],
    [null, "Document-7"],
  ])("safe filename from %s", (header, expected) => expect(documentFilename(header, 7)).toBe(expected));

  test("sends fresh authentication only to API, downloads bytes and revokes URL", async () => {
    localStorage.setItem("authToken", "current-token");
    const blob = new Blob(["pdf"]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob,
      headers: new Headers({ "Content-Disposition": "attachment; filename=report.pdf" }) });
    let filename;
    HTMLAnchorElement.prototype.click.mockImplementation(function () { filename = this.download; });
    await downloadDocument(7, createAuthFetch(jest.fn()));
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/documents\/7\/download$/), expect.objectContaining({
      cache: "no-store", redirect: "error", headers: { Authorization: "Bearer current-token" },
    }));
    expect(filename).toBe("report.pdf");
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(document.querySelector('a[download]')).toBeNull();
    jest.runOnlyPendingTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:download");
  });

  test.each([403, 404, 503, 500])("never saves a %s error body", async (status) => {
    const blob = jest.fn();
    await expect(downloadDocument(7, jest.fn().mockResolvedValue({ ok: false, status, blob }))).rejects.toThrow();
    expect(blob).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  test("401 uses existing login redirect", async () => {
    const navigate = jest.fn();
    localStorage.setItem("authToken", "expired");
    global.fetch = jest.fn().mockResolvedValue({ status: 401 });
    await expect(downloadDocument(7, createAuthFetch(navigate))).rejects.toThrow();
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
