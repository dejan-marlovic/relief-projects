import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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


test("background refresh keeps cards mounted and does not show loading", async () => {
  mount(); const title = await screen.findByText("Prepare report");
  const normal = fetch.getMockImplementation();
  let resolveRead;
  fetch.mockImplementation(() => new Promise(resolve => { resolveRead = resolve; }));
  fireEvent.focus(window);
  expect(screen.getByText("Prepare report")).toBe(title);
  expect(screen.queryByText("Loading follow-ups…")).not.toBeInTheDocument();
  expect(screen.queryByText("Refresh follow-ups")).not.toBeInTheDocument();
  await act(async () => resolveRead(response(data)));
  expect(screen.getByText("Prepare report")).toBe(title);
  fetch.mockImplementation(normal);
});

test("new draft survives closing and reopening without creating a task", async () => {
  localStorage.setItem("authToken", `x.${btoa(JSON.stringify({sub:"draft-user"}))}.x`);
  sessionStorage.clear();
  mount(); fireEvent.click(await screen.findByText("New follow-up"));
  fireEvent.change(screen.getByLabelText("Title"), {target:{value:"Keep this unfinished task"}});
  expect(screen.getByLabelText("Due from")).toBeDisabled();
  const reads = fetch.mock.calls.length;
  fireEvent.focus(window);
  expect(fetch.mock.calls).toHaveLength(reads);
  fireEvent.click(screen.getByText("Close"));
  fireEvent.click(screen.getByText("New follow-up"));
  await screen.findByRole("option", { name: "Alex" });
  expect(screen.getByLabelText("Title")).toHaveValue("Keep this unfinished task");
  expect(screen.getByText("Save follow-up")).toBeDisabled();
  expect(writes()).toHaveLength(0);
  sessionStorage.clear();
});


test("automatically saves valid edits and shows the project saving indicator", async () => {
  mount(); fireEvent.click(await screen.findByText("Edit follow-up"));
  fireEvent.change(screen.getByLabelText("Title"), {target:{value:"Automatically saved title"}});
  await waitFor(() => expect(writes()).toHaveLength(1), {timeout:2500});
  expect(JSON.parse(writes()[0][1].body)).toMatchObject({title:"Automatically saved title",expectedRevision:4});
  await waitFor(() => expect(screen.getByText("Close")).toBeEnabled());
  expect(screen.queryByText("Saved", {exact:true})).not.toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Automatically saved title");
});

test("creates once and queues edits made during the save using the returned revision", async () => {
  let finish;
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "POST" ? new Promise(resolve => { finish = resolve; }) : normal(url, options));
  mount(); fireEvent.click(await screen.findByText("New follow-up"));
  await screen.findByRole("option", {name:"Alex"});
  fireEvent.change(screen.getByLabelText("Title"), {target:{value:"Created automatically"}});
  fireEvent.change(screen.getByLabelText("Deadline"), {target:{value:"2026-10-28"}});
  expect(writes()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Responsible employee"), {target:{value:"3"}});
  await waitFor(() => expect(writes()).toHaveLength(1), {timeout:2500});
  expect(screen.getByText("Saving…")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Description (optional)"), {target:{value:"Typed while saving"}});
  await act(async () => finish(response({...task, revision:5, title:"Created automatically"})));
  await waitFor(() => expect(writes()).toHaveLength(2), {timeout:2500});
  expect(writes().map(([,o])=>o.method)).toEqual(["POST","PUT"]);
  expect(writes()[1][0]).toMatch(/follow-ups\/9$/);
  expect(JSON.parse(writes()[1][1].body)).toMatchObject({expectedRevision:5,description:"Typed while saving"});
  await waitFor(() => expect(screen.getByText("Close")).toBeEnabled());
  expect(screen.queryByText("Saved", {exact:true})).not.toBeInTheDocument();
});

test("uncertain creation pauses autosave and keeps the entered text", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "POST" ? Promise.reject(new Error("Connection lost")) : normal(url,options));
  mount(); fireEvent.click(await screen.findByText("New follow-up"));
  await screen.findByRole("option", {name:"Alex"});
  fireEvent.change(screen.getByLabelText("Title"), {target:{value:"Do not duplicate"}});
  fireEvent.change(screen.getByLabelText("Deadline"), {target:{value:"2026-10-28"}});
  fireEvent.change(screen.getByLabelText("Responsible employee"), {target:{value:"3"}});
  await screen.findByText(/Connection lost/, {}, {timeout:2500});
  fireEvent.change(screen.getByLabelText("Description (optional)"), {target:{value:"Retain this too"}});
  await act(async () => { await new Promise(resolve => setTimeout(resolve,1200)); });
  expect(writes()).toHaveLength(1);
  expect(screen.getByLabelText("Title")).toHaveValue("Do not duplicate");
  expect(screen.getByText("Save follow-up")).toBeDisabled();
});


test("leaving a field saves immediately without waiting for the typing pause", async () => {
  mount(); fireEvent.click(await screen.findByText("Edit follow-up"));
  fireEvent.change(screen.getByLabelText("Description (optional)"), {target:{value:"Save on leaving"}});
  expect(writes()).toHaveLength(0);
  fireEvent.blur(screen.getByLabelText("Description (optional)"), {relatedTarget:screen.getByLabelText("Deadline")});
  expect(writes()).toHaveLength(1);
  await waitFor(() => expect(screen.getByText("Close")).toBeEnabled());
  expect(screen.queryByText("Saved", {exact:true})).not.toBeInTheDocument();
});


test("an earlier save cannot erase recovery of newer incomplete edits", async () => {
  localStorage.setItem("authToken", `x.${btoa(JSON.stringify({sub:"queued-draft-user"}))}.x`);
  sessionStorage.clear();
  let finish;
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url,options) => options?.method === "PUT" ? new Promise(resolve => {finish=resolve;}) : normal(url,options));
  mount(); fireEvent.click(await screen.findByText("Edit follow-up"));
  fireEvent.change(screen.getByLabelText("Title"), {target:{value:"Sent title"}});
  fireEvent.click(screen.getByText("Save follow-up"));
  fireEvent.change(screen.getByLabelText("Title"), {target:{value:""}});
  fireEvent.change(screen.getByLabelText("Description (optional)"), {target:{value:"Keep later text"}});
  await act(async () => finish(response({...task,title:"Sent title",revision:5})));
  fireEvent.click(screen.getByText("Close"));
  fireEvent.click(screen.getByText("Edit follow-up"));
  await screen.findByRole("option", {name:"Alex"});
  expect(screen.getByLabelText("Title")).toHaveValue("");
  expect(screen.getByLabelText("Description (optional)")).toHaveValue("Keep later text");
  expect(writes()).toHaveLength(1);
  sessionStorage.clear();
});


test("opening an editor focuses its title and scrolls the form into view only once", async () => {
  const previous = HTMLElement.prototype.scrollIntoView;
  const scroll = jest.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    mount(); fireEvent.click(await screen.findByText("Edit follow-up"));
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.instances[0].tagName).toBe("FORM");
    expect(scroll).toHaveBeenCalledWith({behavior:"smooth", block:"start"});
    fireEvent.change(screen.getByLabelText("Description (optional)"), {target:{value:"Keep editing here"}});
    fireEvent.click(screen.getByText("Save follow-up"));
    await waitFor(() => expect(screen.getByText("Close")).toBeEnabled());
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    if (previous) HTMLElement.prototype.scrollIntoView = previous;
    else delete HTMLElement.prototype.scrollIntoView;
  }
});
