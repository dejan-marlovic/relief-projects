import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { downloadFollowUpCalendar } from "../../utils/followUpCalendar";
import FollowUps from "./FollowUps";

jest.mock("../../utils/followUpCalendar", () => ({
  ...jest.requireActual("../../utils/followUpCalendar"), downloadFollowUpCalendar: jest.fn(),
}));
const task = { id: 9, projectId: 2, projectName: "Demo", projectDeleted: false, isDeleted: false, title: "Prepare report", status: "OPEN", dueDate: "2026-09-30", dueBucket: "UPCOMING", assignee: { displayName: "Alex", isDeleted: false }, permissions: {} };
const listing = (content) => ({ content, canCreate: false, today: "2026-09-26", upcomingThrough: "2026-10-03", businessTimezone: "Europe/Stockholm", totalElements: content.length, totalPages: 1 });
const response = (content) => ({ ok: true, status: 200, json: async () => listing(content) });
const mount = () => render(<MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: 2 }}><FollowUps /></ProjectContext.Provider></MemoryRouter>);
beforeEach(() => { localStorage.setItem("authToken", "test"); downloadFollowUpCalendar.mockReset(); global.fetch = jest.fn().mockResolvedValue(response([task])); });
afterEach(() => { localStorage.clear(); });

test("read-only readers can download one loaded open task without any API write", async () => {
  mount(); fireEvent.click(await screen.findByRole("button", { name: "Download calendar entry (.ics)" }));
  expect(downloadFollowUpCalendar).toHaveBeenCalledWith(task);
  expect(screen.getByText(/Calendar file downloaded/)).toBeInTheDocument();
  expect(screen.getByText(/Reimporting may create duplicates/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Edit follow-up")).not.toBeInTheDocument();
});

test.each([{ status: "COMPLETED" }, { isDeleted: true }, { projectDeleted: true }, { projectDeleted: null }])("does not offer export for %j", async (changes) => {
  fetch.mockResolvedValue(response([{ ...task, ...changes }]));
  mount(); await screen.findByText("Prepare report");
  expect(screen.queryByRole("button", { name: /Download calendar/ })).not.toBeInTheDocument();
});

test("personal queue exports the loaded task's project, not the project selected above", async () => {
  mount(); await screen.findByText("Prepare report");
  const other = { ...task, id: 20, projectId: 8, title: "Other project deadline" };
  fetch.mockResolvedValue(response([other]));
  fireEvent.click(screen.getByText("My follow-ups"));
  await screen.findByText("Other project deadline");
  fireEvent.click(screen.getByRole("button", { name: /Download calendar/ }));
  expect(downloadFollowUpCalendar).toHaveBeenCalledWith(other);
});

test("disables old data while refresh is pending and excludes completed data after refresh", async () => {
  mount(); await screen.findByText("Prepare report");
  let finish;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByText("Refresh follow-ups"));
  expect(screen.getByRole("button", { name: /Download calendar/ })).toBeDisabled();
  finish(response([{ ...task, status: "COMPLETED" }]));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Download calendar/ })).not.toBeInTheDocument());
});

test("reports local download failure without mutation or retry", async () => {
  downloadFollowUpCalendar.mockImplementation(() => { throw new Error("Calendar file unavailable."); });
  mount(); fireEvent.click(await screen.findByRole("button", { name: /Download calendar/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("Calendar file unavailable.");
  expect(screen.getByText("Prepare report")).toBeInTheDocument();
  expect(downloadFollowUpCalendar).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  downloadFollowUpCalendar.mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: /Download calendar/ }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByText(/Calendar file downloaded/)).toBeInTheDocument();
});
