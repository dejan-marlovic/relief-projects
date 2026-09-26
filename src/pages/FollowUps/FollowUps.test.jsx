import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import FollowUps from "./FollowUps";
let data;
const task = { id: 9, projectId: 2, projectName: "Demo", title: "Prepare report", dueDate: "2026-09-22", dueBucket: "UPCOMING", revision: 4, status: "OPEN", assignee: { employeeId: 3, displayName: "Alex", isDeleted: false }, permissions: { canEdit: true, canComplete: true, canDelete: true } };
const response = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });
const mount = () => render(<MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: 2 }}><FollowUps /></ProjectContext.Provider></MemoryRouter>);
const writes = () => fetch.mock.calls.filter(([, options]) => ["POST", "PUT", "DELETE"].includes(options?.method));
beforeEach(() => {
  localStorage.setItem("authToken", "test");
  data = { content: [task], canCreate: true, today: "2026-09-20", upcomingThrough: "2026-09-27", businessTimezone: "Europe/Stockholm", totalElements: 1, totalPages: 1 };
  global.fetch = jest.fn(async (url, options) => {
    if (url.includes("employees/active")) return response([{ id: 3, firstName: "Alex" }]);
    if (["POST", "PUT", "DELETE"].includes(options?.method)) return response(task);
    return response(data);
  });
});
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });
test("uses server buckets, date boundaries and permissions", async () => {
  data.content = [{ ...task, dueBucket: "COMPLETED", permissions: { canReopen: true } }]; data.canCreate = false;
  mount(); await screen.findByText("Prepare report");
  expect(screen.getByText(/Business date/)).toHaveTextContent("Europe/Stockholm");
  expect(screen.queryByText("Mark completed")).not.toBeInTheDocument();
  expect(screen.queryByText("Edit follow-up")).not.toBeInTheDocument();
  expect(screen.getByText("Reopen")).toBeEnabled();
});
test("assignee completes using anchored project and expected revision only", async () => {
  data.content = [{ ...task, permissions: { canComplete: true } }]; data.canCreate = false;
  mount(); fireEvent.click(await screen.findByText("Mark completed"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(/projects\/2\/follow-ups\/9\/complete$/);
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 4 });
});
test.each(["NO_EMPLOYEE", "EMPLOYEE_INACTIVE"])("explains %s instead of presenting an ordinary empty queue", async (mappingStatus) => {
  mount(); await screen.findByText("Prepare report");
  data = { ...data, content: [], canCreate: false, mappingStatus };
  fireEvent.click(screen.getByText("My follow-ups"));
  await screen.findByText(mappingStatus === "NO_EMPLOYEE" ? /no employee mapping/ : /linked employee is inactive/);
  expect(screen.queryByText("No follow-ups match these filters.")).not.toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.includes("/follow-ups/mine?") && !url.includes("assignee"))).toBe(true);
});
test("creates plain date and employee ID without server fields", async () => {
  mount(); fireEvent.click(await screen.findByText("New follow-up"));
  await screen.findByRole("option", { name: "Alex" });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: " New task " } });
  fireEvent.change(screen.getByLabelText("Deadline"), { target: { value: "2026-09-27" } });
  fireEvent.change(screen.getByLabelText("Responsible employee"), { target: { value: "3" } });
  fireEvent.click(screen.getByText("Save follow-up"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ title: "New task", description: null, dueDate: "2026-09-27", assigneeEmployeeId: 3 });
});
test("stale action reloads without retry", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "POST" ? Promise.resolve(response({ message: "Follow-up changed." }, 409)) : normal(url, options));
  mount(); fireEvent.click(await screen.findByText("Mark completed"));
  await screen.findByText(/no change was automatically retried/);
  expect(writes()).toHaveLength(1);
});
test("clears incompatible deadline filter when selecting completed or deleted", async () => {
  mount(); await screen.findByText("Prepare report");
  fireEvent.change(screen.getByLabelText("Deadline group"), { target: { value: "OVERDUE" } });
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("due=OVERDUE"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "COMPLETED" } });
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("status=COMPLETED") && !url.includes("due=OVERDUE"))).toBe(true));
  expect(screen.getByLabelText("Deadline group")).toBeDisabled();
});
test("delete uses revision and restore is a separate action", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  mount(); fireEvent.click(await screen.findByText("Delete follow-up"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(/9\?expectedRevision=4$/);
  expect(writes()[0][1].method).toBe("DELETE");
});
test("editing retains an inactive assignee and carries its loaded revision", async () => {
  data.content = [{ ...task, assignee: { employeeId: 8, displayName: "Former colleague", isDeleted: true } }];
  mount(); fireEvent.click(await screen.findByText("Edit follow-up"));
  await screen.findByRole("option", { name: /Former colleague/ });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated task" } });
  fireEvent.click(screen.getByText("Save follow-up"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toMatchObject({ expectedRevision: 4, assigneeEmployeeId: 8, title: "Updated task" });
});
test("restore sends only expected revision with PUT", async () => {
  data.content = [{ ...task, isDeleted: true, dueBucket: "INACTIVE", permissions: { canRestore: true } }];
  mount(); fireEvent.click(await screen.findByText("Restore follow-up"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(/\/9\/restore$/);
  expect(writes()[0][1].method).toBe("PUT");
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 4 });
});
test("reopen explains attribution clearing before sending action", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  data.content = [{ ...task, status: "COMPLETED", permissions: { canReopen: true } }];
  mount(); fireEvent.click(await screen.findByText("Reopen"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("completion attribution will be cleared"));
  expect(writes()[0][0]).toMatch(/\/9\/reopen$/);
});
