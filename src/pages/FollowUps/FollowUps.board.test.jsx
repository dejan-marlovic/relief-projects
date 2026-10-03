import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import FollowUps from "./FollowUps";
import { boardColumns, workflowLabel } from "./workflow";

const task = { id: 9, projectId: 2, projectName: "Demo", title: "Prepare report", dueDate: "2026-10-02", dueBucket: "OVERDUE", revision: 4, status: "OPEN", workflowState: "TODO", assignee: { employeeId: 3, displayName: "Alex", isDeleted: false }, permissions: { canEdit: true, canStartWork: true, canComplete: true } };
const response = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });
let current, supported, total, write;
const listing = content => ({ content, workflowSupported: supported, canCreate: true, today: "2026-10-03", upcomingThrough: "2026-10-10", businessTimezone: "Europe/Stockholm", totalElements: total ?? content.length, totalPages: total ? 2 : content.length ? 1 : 0 });
const mount = () => render(<MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: 2 }}><FollowUps /></ProjectContext.Provider></MemoryRouter>);
const writes = () => fetch.mock.calls.filter(([, o]) => o?.method);
beforeEach(() => {
  localStorage.clear(); localStorage.setItem("authToken", "test"); current = { ...task }; supported = true; total = null;
  write = async () => response(current);
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method) return write(url, options);
    if (url.includes("employees/active")) return response([{ id: 3, firstName: "Alex" }]);
    if (url.endsWith("/follow-ups/9")) return response(current);
    const q = new URL(url, "http://localhost").searchParams;
    return response(listing(!q.get("workflowState") || q.get("workflowState") === current.workflowState ? [current] : []));
  });
});
afterEach(() => { localStorage.clear(); });
async function board() { fireEvent.click(await screen.findByRole("button", { name: "Board", exact: true })); await waitFor(() => expect(screen.getByRole("button", { name: "Refresh follow-ups" })).toBeEnabled()); }
test("capability detection precedes board queries; old servers remain in List", async () => {
  supported = false; localStorage.setItem("follow-up-view", "board"); mount(); await screen.findByText("Prepare report");
  expect(screen.queryByRole("button", { name: "Board", exact: true })).not.toBeInTheDocument();
  expect(fetch.mock.calls.every(([url]) => !url.includes("workflowState"))).toBe(true);
  expect(screen.queryByText("Start work")).not.toBeInTheDocument();
});
test("three bounded compatible queries keep deadline and progress separate", async () => {
  mount(); await board();
  expect(fetch.mock.calls[0][0]).not.toContain("workflowState");
  for (const state of ["TODO", "IN_PROGRESS", "DONE"]) expect(fetch.mock.calls.some(([url]) => url.includes("status=ALL") && url.includes(`workflowState=${state}`) && url.includes("size=20"))).toBe(true);
  const column = screen.getByRole("region", { name: "To do column" });
  expect(within(column).getByText("Overdue")).toBeInTheDocument();
  expect(screen.getByLabelText("Status")).toBeDisabled(); expect(screen.getByLabelText("Deadline group")).toBeDisabled();
});
test("start work uses only the captured revision and target; refresh moves the card", async () => {
  write = async () => { current = { ...current, workflowState: "IN_PROGRESS", revision: 5, permissions: { canReturnToTodo: true } }; return response(current); };
  mount(); await board(); fireEvent.click(screen.getByText("Start work"));
  await waitFor(() => expect(within(screen.getByRole("region", { name: "In progress column" })).getByText("Prepare report")).toBeInTheDocument());
  expect(writes()).toHaveLength(1); expect(writes()[0][0]).toMatch(/projects\/2\/follow-ups\/9\/progress$/);
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 4, target: "IN_PROGRESS" });
});
test("independent column paging uses observed total, not loaded card count", async () => {
  total = 25; mount(); await board(); fireEvent.click(screen.getByText("Next To do"));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("workflowState=TODO") && url.includes("page=1"))).toBe(true));
  expect(within(screen.getByRole("region", { name: "Done column" })).getByText("Page 1 of 2")).toBeInTheDocument();
});
test("failed edit keeps text, explicitly refreshes detail and requires review before save", async () => {
  write = async () => { current = { ...current, revision: 5, title: "Other user's title" }; return response({ message: "Task changed." }, 409); };
  mount(); await board(); fireEvent.click(screen.getByText("Edit follow-up"));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Keep this draft" } }); fireEvent.click(screen.getByText("Save follow-up"));
  await screen.findByText(/Task changed/); expect(screen.getByLabelText("Title")).toHaveValue("Keep this draft"); expect(screen.getByText("Save follow-up")).toBeDisabled();
  const enable = screen.getByText("I reviewed the refreshed state; enable save"); await waitFor(() => expect(enable).toBeEnabled());
  write = async () => response(current); fireEvent.click(enable); fireEvent.click(screen.getByText("Save follow-up"));
  await waitFor(() => expect(writes()).toHaveLength(2)); expect(JSON.parse(writes()[1][1].body)).toMatchObject({ title: "Keep this draft", expectedRevision: 5 });
});
test("personal board never adds selected project or assignee overrides", async () => {
  mount(); await board(); fireEvent.click(screen.getByText("My follow-ups"));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("/follow-ups/mine?") && url.includes("workflowState=DONE"))).toBe(true));
  expect(fetch.mock.calls.filter(([url]) => url.includes("/follow-ups/mine?")).every(([url]) => !url.includes("projectId") && !url.includes("assigneeEmployeeId"))).toBe(true);
});
test("a duplicate across observations uses newest revision without changing historical OPEN meaning", () => {
  const cols = boardColumns({ TODO: { content: [task] }, IN_PROGRESS: { content: [{ ...task, revision: 5, workflowState: "IN_PROGRESS" }] }, DONE: { content: [] } });
  expect(cols.TODO).toHaveLength(0); expect(cols.IN_PROGRESS).toHaveLength(1);
  expect(workflowLabel({ status: "OPEN" })).toContain("progress not recorded");
});
test("reassignment revokes retry capability without losing the intended action", async () => {
  write = async () => { current = { ...current, revision: 5, assignee: { employeeId: 4, displayName: "New owner", isDeleted: false }, permissions: {} }; return response({ message: "Assignment changed." }, 409); };
  mount(); await board(); fireEvent.click(screen.getByText("Start work"));
  await screen.findByText(/Assignment changed/);
  await waitFor(() => expect(screen.getByRole("region", { name: "Review failed follow-up action" })).toHaveTextContent("New owner"));
  expect(screen.getByText("I reviewed the refreshed state; retry action")).toBeDisabled(); expect(writes()).toHaveLength(1);
});
test("deleted filter falls back to List and never queries workflow columns for deleted tasks", async () => {
  mount(); await board(); fetch.mockClear(); fireEvent.click(screen.getByLabelText("Deleted follow-ups only"));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("deleted=true"))).toBe(true));
  expect(fetch.mock.calls.every(([url]) => !url.includes("workflowState"))).toBe(true);
  expect(screen.getByRole("button", { name: "Board", exact: true })).toBeDisabled();
});

const transfer = () => ({ setData: jest.fn(), effectAllowed: "", dropEffect: "" });
async function dragTo(target) {
  const dataTransfer = transfer();
  fireEvent.dragStart(screen.getByText(/Drag to move/), { dataTransfer });
  const column = screen.getByRole("region", { name: `${target} column` });
  fireEvent.dragOver(column, { dataTransfer });
  fireEvent.drop(column, { dataTransfer });
}
test("Board is the default after capability detection", async () => {
  mount(); await screen.findByRole("region", { name: "Done column" });
  expect(screen.getByRole("button", { name: "Board", exact: true })).toHaveAttribute("aria-pressed", "true");
});
test.each([
  ["TODO", "In progress", "progress", { target: "IN_PROGRESS" }],
  ["IN_PROGRESS", "To do", "progress", { target: "TODO" }],
  ["TODO", "Done", "complete", {}],
  ["IN_PROGRESS", "Done", "complete", {}],
])("drag %s to %s sends a single revision-checked command", async (from, to, action, values) => {
  current = { ...current, workflowState: from, permissions: { canStartWork: true, canReturnToTodo: true, canComplete: true } };
  mount(); await board(); await dragTo(to);
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(new RegExp(`/${action}$`));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ expectedRevision: 4, ...values });
});
test("Done drag requires confirmation and cannot skip straight to In progress", async () => {
  current = { ...current, workflowState: "DONE", status: "COMPLETED", permissions: { canReopen: true } };
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  mount(); await board(); await dragTo("In progress"); expect(writes()).toHaveLength(0);
  await dragTo("To do"); expect(confirm).toHaveBeenCalled(); expect(writes()).toHaveLength(0);
  confirm.mockReturnValue(true); await dragTo("To do");
  await waitFor(() => expect(writes()).toHaveLength(1)); expect(writes()[0][0]).toMatch(/reopen$/); confirm.mockRestore();
});
test("read-only cards and external drops cannot issue commands", async () => {
  current = { ...current, permissions: {} }; mount(); await board();
  expect(screen.queryByText(/Drag to move/)).not.toBeInTheDocument();
  fireEvent.drop(screen.getByRole("region", { name: "Done column" }), { dataTransfer: transfer() }); expect(writes()).toHaveLength(0);
});
test("failed drag retains action and does not move optimistically or retry", async () => {
  write = async () => response({ message: "Task changed." }, 409);
  mount(); await board(); await dragTo("In progress"); await screen.findByText(/Task changed/);
  expect(within(screen.getByRole("region", { name: "To do column" })).getByText("Prepare report")).toBeInTheDocument();
  expect(writes()).toHaveLength(1);
});
test("refresh cancels an in-flight drag instead of writing its stale snapshot", async () => {
  mount(); await board();
  const dataTransfer = transfer();
  fireEvent.dragStart(screen.getByText(/Drag to move/), { dataTransfer });
  fireEvent.click(screen.getByText("Refresh follow-ups"));
  await waitFor(() => expect(screen.getByText("Refresh follow-ups")).toBeEnabled());
  fireEvent.drop(screen.getByRole("region", { name: "Done column" }), { dataTransfer });
  expect(writes()).toHaveLength(0);
});
test("an explicit List preference is retained", async () => {
  localStorage.setItem("follow-up-view", "list"); mount(); await screen.findByText("Prepare report");
  expect(screen.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(fetch.mock.calls.every(([url]) => !url.includes("workflowState"))).toBe(true);
});
