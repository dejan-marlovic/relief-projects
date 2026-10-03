import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { UnsavedChangesContext } from "../../context/UnsavedChangesContext";
import { Schedule, scheduleQuery, windowError } from "./TravelSchedule";

const response = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
const row = { id: 41, project: { id: 7, name: "Water access" }, traveller: { employeeId: 18, displayName: "Alex Example", active: false }, purpose: "Partner monitoring", destination: "Amman", departureDate: "2026-09-01", returnDate: "2026-11-13", state: "APPROVED", hasCurrentAuthorization: true, overlapCount: 2, reportSummary: { state: "ACCEPTED", outcome: "COMPLETED", isDeleted: true }, issues: [{ code: "OVERLAPPING_TRIPS", message: "Other plans overlap outside the current filters." }] };
const envelope = content => ({ content, page: 0, size: 50, totalElements: content.length, totalPages: content.length ? 1 : 0, hasNext: false, allMatchesIncluded: true, from: "2026-09-03", to: "2027-01-01", rangeDefaulted: true, businessTimezone: "Europe/Stockholm", observedAt: "2026-10-03T09:20:00Z" });
let fetcher, setProject, confirm, reply;
beforeEach(() => {
  reply = () => response(envelope([row]));
  setProject = jest.fn(); confirm = jest.fn(() => true);
  fetcher = jest.fn(async url => {
    if (url.includes("ids-names")) return response([{ id: 7, projectName: "Water access" }]);
    if (url.includes("/travellers?")) return response(envelope([{ employeeId: 18, displayName: "Alex Example", active: false }]));
    return reply(url);
  });
});
function Destination() {
  const location = useLocation(), navigate = useNavigate();
  return <><p>Destination {location.search}</p><button onClick={() => navigate(-1)}>Go back</button></>;
}
function mount(url = "/travel-schedule") {
  return render(<ProjectContext.Provider value={{ selectedProjectId: "99", setSelectedProjectId: setProject }}><UnsavedChangesContext.Provider value={{ confirmDiscardUnsavedChanges: confirm }}><MemoryRouter initialEntries={[url]}><Routes><Route path="/travel-schedule" element={<Schedule authFetch={fetcher} />} /><Route path="/travel" element={<Destination />} /></Routes></MemoryRouter></UnsavedChangesContext.Provider></ProjectContext.Provider>);
}
const calls = () => fetcher.mock.calls.filter(([url]) => /travel-schedule\?/.test(url));
test("defaults are independent of selected project, retain full dates and distinguish deleted reports", async () => {
  mount(); await screen.findByText("Partner monitoring");
  expect(calls()[0][0]).toContain("state=PLANNED&page=0&size=50");
  expect(calls()[0][0]).not.toContain("projectId");
  expect(calls()[0][1].cache).toBe("no-store");
  expect(screen.getByText("Planned: 2026-09-01 through 2026-11-13")).toBeInTheDocument();
  expect(screen.getByText(/Report deleted/)).toBeInTheDocument();
  expect(screen.queryByText("accepted")).not.toBeInTheDocument();
  expect(screen.getByText(/Inactive traveller/)).toBeInTheDocument();
  expect(screen.getByText(/Other plans overlap outside/)).toBeInTheDocument();
  expect(setProject).not.toHaveBeenCalled();
});
test("custom filters require both dates and never issue partial-date queries", async () => {
  mount(); await screen.findByText("Partner monitoring");
  fireEvent.change(screen.getByLabelText("Window from"), { target: { value: "2026-10-01" } });
  fireEvent.click(screen.getByText("Apply schedule filters"));
  expect(screen.getByRole("alert")).toHaveTextContent("Choose both"); expect(calls()).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Window through"), { target: { value: "2026-10-31" } });
  fireEvent.change(screen.getByLabelText("Schedule project"), { target: { value: "7" } });
  fireEvent.click(screen.getByText("Apply schedule filters"));
  await waitFor(() => expect(calls()).toHaveLength(2));
  expect(calls()[1][0]).toContain("from=2026-10-01&to=2026-10-31&projectId=7");
});
test("lookup omits traveller filter, retains selected ID, and makes no mutations", async () => {
  mount("/travel-schedule?travellerEmployeeId=99&state=ALL"); await screen.findByText("Partner monitoring");
  fireEvent.click(screen.getByText("Find a traveller by name")); await screen.findByText("Select employee #18");
  const lookup = fetcher.mock.calls.find(([url]) => url.includes("/travellers?"))[0];
  expect(lookup).not.toContain("travellerEmployeeId"); expect(lookup).toContain("state=ALL");
  expect(screen.getByLabelText("Traveller employee ID")).toHaveValue(99);
  fireEvent.click(screen.getByText("Select employee #18")); expect(screen.getByLabelText("Traveller employee ID")).toHaveValue(18);
  expect(fetcher.mock.calls.every(([, options]) => !options.method)).toBe(true);
});
test("opening honours cancelled navigation and switches project only when confirmed; back retains filters", async () => {
  mount("/travel-schedule?projectId=7&state=ALL"); await screen.findByText("Partner monitoring");
  confirm.mockReturnValue(false); fireEvent.click(screen.getByText("Open travel request #41")); expect(setProject).not.toHaveBeenCalled();
  confirm.mockReturnValue(true); fireEvent.click(screen.getByText("Open travel request #41"));
  expect(setProject).toHaveBeenCalledWith("7"); expect(screen.getByText("Destination ?projectId=7&requestId=41")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Go back")); await screen.findByText("Partner monitoring"); expect(screen.getByLabelText("Plan state")).toHaveValue("ALL"); expect(screen.getByLabelText("Schedule project")).toHaveValue("7");
});
test("errors are not rendered as empty results and refresh recovers", async () => {
  reply = () => response({ message: "Schedule temporarily unavailable" }, 503); mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Schedule temporarily unavailable");
  expect(screen.queryByText("No matching planned travel in this window")).not.toBeInTheDocument();
  reply = () => response(envelope([])); fireEvent.click(screen.getByText("Refresh schedule"));
  await screen.findByText("No matching planned travel in this window");
});
test("out-of-range pages retain totals and offer return to first page", async () => {
  reply = () => response({ ...envelope([]), page: 2, totalElements: 51, totalPages: 2, allMatchesIncluded: false });
  mount("/travel-schedule?page=2"); await screen.findByText(/No plans on this page/);
  expect(screen.getByText(/51 matching plans/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Return to first plans page"));
  await waitFor(() => expect(calls().at(-1)[0]).toContain("page=0"));
});
test("focus refreshes the schedule without changing filters", async () => {
  mount("/travel-schedule?state=CANCELLED"); await screen.findByText("Partner monitoring");
  fireEvent.focus(window); await waitFor(() => expect(calls()).toHaveLength(2)); expect(calls()[1][0]).toContain("state=CANCELLED");
});
test("date bounds handle leap years, reversed and impossible dates", () => {
  expect(windowError({ from: "2024-01-01", to: "2024-12-31" })).toBe("");
  expect(windowError({ from: "2024-01-01", to: "2025-01-01" })).toContain("366");
  expect(windowError({ from: "2026-02-30", to: "2026-03-31" })).toContain("valid dates");
  expect(windowError({ from: "2026-10-03", to: "2026-10-02" })).toContain("on or after");
  expect(scheduleQuery({ state: "ALL", travellerEmployeeId: "18", from: "", projectId: "" }, 0, true)).toBe("state=ALL&page=0&size=50");
});
