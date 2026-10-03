import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Travel from "./Travel";
import { ProjectContext } from "../../context/ProjectContext";
import { UnsavedChangesContext } from "../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../utils/http";

jest.mock("./TravelReport", () => () => <p>Post-trip reporting</p>);
jest.mock("../../utils/http", () => ({ ...jest.requireActual("../../utils/http"), createAuthFetch: jest.fn() }));

const response = (value, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(value) });
let fetcher, projects, setProject, confirm, status;
beforeEach(() => {
  projects = [{ id: 7, projectName: "Water access" }]; status = 200;
  setProject = jest.fn(); confirm = jest.fn(() => true);
  fetcher = jest.fn(async url => {
    if (url.includes("ids-names")) return response(projects);
    if (/\/41$/.test(url)) return status === 200 ? response({ id: 41, purpose: "Off-page trip", traveller: { displayName: "Alex" }, state: "APPROVED", permissions: {}, issues: [] }) : response({ message: "Travel request unavailable" }, status);
    return response({ content: [], page: 0, size: 20, totalPages: 0, totalElements: 0 });
  });
  createAuthFetch.mockReturnValue(fetcher);
});
function mount(project = "7", url = "/travel?projectId=7&requestId=41") {
  return render(<MemoryRouter initialEntries={[url]}><ProjectContext.Provider value={{ selectedProjectId: project, setSelectedProjectId: setProject }}><UnsavedChangesContext.Provider value={{ confirmDiscardUnsavedChanges: confirm, setUnsavedChange: () => {} }}><Travel /></UnsavedChangesContext.Provider></ProjectContext.Provider></MemoryRouter>);
}
test("deep link opens exact detail even when first list page is empty", async () => {
  mount(); await screen.findByText("Off-page trip · Travel request #41");
  expect(fetcher.mock.calls.some(([url]) => url.endsWith("/projects/7/travel-requests/41"))).toBe(true);
  fireEvent.click(screen.getByText("Close request")); expect(screen.queryByText("Off-page trip · Travel request #41")).not.toBeInTheDocument();
});
test("different selected project requires explicit confirmed switching and never fetches wrong detail", async () => {
  mount("99"); await screen.findByText("Select request's project");
  expect(fetcher.mock.calls.some(([url]) => url.includes("travel-requests"))).toBe(false);
  confirm.mockReturnValue(false); fireEvent.click(screen.getByText("Select request's project")); expect(setProject).not.toHaveBeenCalled();
  confirm.mockReturnValue(true); fireEvent.click(screen.getByText("Select request's project")); expect(setProject).toHaveBeenCalledWith("7");
});
test("inactive project cannot open stale schedule detail", async () => {
  projects = []; mount(); expect(await screen.findByRole("alert")).toHaveTextContent("no longer available");
  expect(fetcher.mock.calls.some(([url]) => url.includes("travel-requests"))).toBe(false);
});
test("missing request displays server error with no stale actions", async () => {
  status = 404; mount(); await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Travel request unavailable"));
  expect(screen.queryByText("Approve travel")).not.toBeInTheDocument();
});
test("invalid deep link does not fetch detail", () => {
  mount("7", "/travel?projectId=7&requestId=bad"); expect(screen.getByRole("alert")).toHaveTextContent("valid project and request ID"); expect(fetcher).not.toHaveBeenCalled();
});
