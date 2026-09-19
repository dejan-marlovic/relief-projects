import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Documents from "./Documents";
import { ProjectContext } from "../../context/ProjectContext";
import { jsonResponse, makeUser } from "../../testUtils/authTestUtils";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
const { useAuth } = require("../../context/AuthContext");

const documentFixture = { id: 7, documentName: "report.pdf", documentPath: "report.pdf", employeeId: 2, projectId: 1 };
const employees = [{ id: 2, firstName: "Dario", lastName: "Marlovic" }];

const renderDocuments = (roles, employeeRows = employees) => {
  useAuth.mockReturnValue({
    user: makeUser(roles),
    hasRole: (role) => roles.includes(role),
    hasAnyRole: (...required) => required.some((role) => roles.includes(role)),
  });
  fetch.mockImplementation((url) => {
    if (url.endsWith("/categories")) return Promise.resolve(jsonResponse([{ id: "UNCATEGORIZED", label: "Uncategorized" }]));
    if (url.includes("/api/employees/active")) {
      return Promise.resolve(jsonResponse(employeeRows));
    }
    if (url.includes("/api/documents/project/1")) {
      return Promise.resolve(jsonResponse([documentFixture]));
    }
    return Promise.resolve(jsonResponse([]));
  });
  return render(
    <MemoryRouter>
      <ProjectContext.Provider value={{ selectedProjectId: "1" }}><Documents /></ProjectContext.Provider>
    </MemoryRouter>,
  );
};

describe("Documents permissions", () => {
  beforeEach(() => { localStorage.setItem("authToken", "token"); global.fetch = jest.fn(); });
  afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

  test("ADMIN can upload, download, and delete", async () => {
    renderDocuments(["ADMIN"]);
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(
      await screen.findByText("Employee attribution: Dario Marlovic")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload document" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  test("PROJECT_MANAGER can upload and download but not delete", async () => {
    renderDocuments(["PROJECT_MANAGER"]);
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload document" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  test.each(["FINANCE", "APPROVER", "VIEWER"])("%s has read/download-only access", async (role) => {
    renderDocuments([role]);
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload document" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit details" })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  });

  test("falls back to the employee ID when the employee is unavailable", async () => {
    renderDocuments(["VIEWER"], []);
    expect(await screen.findByText("Employee attribution: Employee #2")).toBeInTheDocument();
    expect(screen.getByText("Uploaded by Unknown · Uploaded: Unknown")).toBeInTheDocument();
  });

  test("prevents duplicate requests and announces a failed download", async () => {
    renderDocuments(["VIEWER"]);
    const button = await screen.findByRole("button", { name: "Download" });
    let finish;
    fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const before = fetch.mock.calls.length;
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(fetch.mock.calls.length).toBe(before + 1);
    await act(async () => finish({ ok: false, status: 404 }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no longer available");
    expect(button).toBeEnabled();
    expect(screen.queryByRole("link", { name: /Download/ })).not.toBeInTheDocument();
  });

  test("cancels an in-flight download when leaving Documents", async () => {
    const view = renderDocuments(["VIEWER"]);
    const button = await screen.findByRole("button", { name: "Download" });
    fetch.mockImplementation(() => new Promise(() => {}));
    fireEvent.click(button);
    const options = fetch.mock.calls[fetch.mock.calls.length - 1][1];
    view.unmount();
    expect(options.signal.aborted).toBe(true);
  });
});
