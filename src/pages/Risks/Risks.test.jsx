import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import Risks from "./Risks";
let data;
const risk = { id: 9, projectId: 2, title: "Delivery delay", ownerEmployeeId: 3, ownerName: "Alex", reviewDate: "2026-09-20", reviewBucket: "OVERDUE", revision: 4, status: "OPEN", likelihood: null, impact: "HIGH", permissions: { canEdit: true, canClose: true, canDelete: true } };
const response = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });
const tree = projectId => <MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: projectId }}><Risks /></ProjectContext.Provider></MemoryRouter>;
const mount = (projectId = 2) => render(tree(projectId));
const writes = () => fetch.mock.calls.filter(([, options]) => ["POST", "PUT", "DELETE"].includes(options?.method));
beforeEach(() => {
  localStorage.setItem("authToken", "test");
  data = { content: [risk], canCreate: true, today: "2026-09-21", businessTimezone: "Europe/Stockholm", totalElements: 1, totalPages: 1 };
  global.fetch = jest.fn(async (url, options) => {
    if (url.includes("employees/active")) return response([{ id: 3, firstName: "Alex" }]);
    if (["POST", "PUT", "DELETE"].includes(options?.method)) return response(risk);
    if (/risks\/9$/.test(url)) return response({ ...risk, revision: 5, title: "Server title" });
    if (url.includes("/history?")) return response({ content: [{ id: 1, action: "CREATE", revision: 0, actor: { username: "Taylor" }, after: risk }], totalPages: 1, totalElements: 1 });
    return response(data);
  });
});
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });
test("requires a selected project and does not load another register", () => {
  mount(""); expect(screen.getByText(/Select a project/)).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
});
test("renders server capabilities and separate unassessed ratings for readers", async () => {
  data = { ...data, canCreate: false, projectDeleted: true, content: [{ ...risk, permissions: {}, ownerInactive: true }] };
  mount(); await screen.findByText("Delivery delay");
  expect(screen.getByText(/Likelihood: Not assessed/)).toHaveTextContent("Impact: High");
  expect(screen.getByText(/inactive employee/)).toBeInTheDocument();
  expect(screen.queryByText("New risk")).not.toBeInTheDocument(); expect(screen.queryByText("Edit risk")).not.toBeInTheDocument();
  expect(screen.getByText("View history")).toBeEnabled(); expect(screen.getByText(/read-only/)).toBeInTheDocument();
});
test("creates only editable fields and sends dates without timezone conversion", async () => {
  mount(); fireEvent.click(await screen.findByText("New risk"));
  const form = within(screen.getByRole("form", { name: "Risk editor" }));
  await form.findByRole("option", { name: "Alex" });
  fireEvent.change(form.getByLabelText("Title"), { target: { value: " New risk " } });
  fireEvent.change(form.getByLabelText("Responsible employee"), { target: { value: "3" } });
  fireEvent.change(form.getByLabelText("Next review date"), { target: { value: "2026-10-01" } });
  fireEvent.click(form.getByText("Save risk"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(/projects\/2\/risks$/);
  expect(JSON.parse(writes()[0][1].body)).toEqual({ title: "New risk", description: null, ownerEmployeeId: 3, reviewDate: "2026-10-01", likelihood: null, impact: null, mitigationPlan: null });
});
test("conflict keeps the draft and revision through list refresh and explicit comparison", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "PUT" ? Promise.resolve(response({ message: "Risk changed." }, 409)) : normal(url, options));
  mount(); fireEvent.click(await screen.findByText("Edit risk"));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My unsaved title" } });
  fireEvent.click(screen.getByText("Save risk"));
  await screen.findByText(/original revision are retained/);
  expect(screen.getByLabelText("Title")).toHaveValue("My unsaved title");
  expect(screen.getByText("Save risk")).toBeDisabled();
  data = { ...data, content: [{ ...risk, revision: 5, title: "Server title" }] };
  fireEvent.click(screen.getByText("Refresh register"));
  await screen.findByText("Server title");
  expect(screen.getByLabelText("Title")).toHaveValue("My unsaved title"); expect(screen.getByText("Editing revision 4.")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Load latest risk for comparison"));
  await screen.findByRole("region", { name: "Latest risk" });
  expect(screen.getByLabelText("Title")).toHaveValue("My unsaved title"); expect(writes()).toHaveLength(1);
  fireEvent.click(screen.getByText("Replace draft with latest record"));
  expect(screen.getByLabelText("Title")).toHaveValue("Server title"); expect(screen.getByText("Editing revision 5.")).toBeInTheDocument();
  fetch.mockImplementation(normal);
  fireEvent.click(screen.getByText("Save risk")); await waitFor(() => expect(writes()).toHaveLength(2));
  expect(JSON.parse(writes()[1][1].body).expectedRevision).toBe(5);
});
test.each(["Close risk", "Reopen risk"])("%s requires reason and original revision", async label => {
  if (label === "Reopen risk") data.content = [{ ...risk, status: "CLOSED", permissions: { canReopen: true } }];
  mount(); fireEvent.click(await screen.findByText(label));
  const form = screen.getByRole("form", { name: "Risk editor" });
  fireEvent.submit(form); expect(writes()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: " Evidence reviewed " } });
  fireEvent.submit(form); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ reason: "Evidence reviewed", expectedRevision: 4 });
  expect(writes()[0][0]).toMatch(label === "Close risk" ? /\/9\/close$/ : /\/9\/reopen$/);
});
test("soft deletion asks for confirmation and includes revision in the URL", async () => {
  mount(); fireEvent.click(await screen.findByText("Delete risk")); expect(writes()).toHaveLength(0);
  fireEvent.click(screen.getByText("Confirm delete")); await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toMatch(/\/9\?expectedRevision=4$/); expect(writes()[0][1].method).toBe("DELETE"); expect(writes()[0][1].body).toBeUndefined();
});
test("uncertain create keeps draft, blocks repeat submission and warns about duplicates", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "POST" ? Promise.reject(new Error("Connection lost")) : normal(url, options));
  mount(); fireEvent.click(await screen.findByText("New risk"));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Maybe saved" } });
  fireEvent.change(screen.getByLabelText("Next review date"), { target: { value: "2026-10-01" } });
  await within(screen.getByRole("form", { name: "Risk editor" })).findByRole("option", { name: "Alex" });
  fireEvent.change(screen.getByLabelText("Responsible employee"), { target: { value: "3" } });
  fireEvent.click(screen.getByText("Save risk")); await screen.findByText(/avoid a duplicate/);
  expect(screen.getByLabelText("Title")).toHaveValue("Maybe saved"); expect(screen.getByText("Save risk")).toBeDisabled(); expect(writes()).toHaveLength(1);
});
test("validation errors allow correction without dropping the draft", async () => {
  const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "PUT" ? Promise.resolve(response({ message: "Validation failed.", fieldErrors: { title: "Invalid title." } }, 400)) : normal(url, options));
  mount(); fireEvent.click(await screen.findByText("Edit risk")); fireEvent.click(screen.getByText("Save risk"));
  await screen.findByText(/Invalid title/); expect(screen.getByLabelText("Title")).toHaveValue("Delivery delay"); expect(screen.getByText("Save risk")).toBeEnabled();
});
test("history displays immutable before/after snapshots and attribution", async () => {
  mount(); fireEvent.click(await screen.findByText("View history"));
  await screen.findByText("CREATE · Revision 0");
  const history = within(screen.getByRole("region", { name: "Risk history" }));
  expect(history.getByText(/Taylor/)).toBeInTheDocument(); expect(history.getByText("No earlier record.")).toBeInTheDocument();
  expect(history.getByText("Delivery delay")).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.includes("/projects/2/risks/9/history?page=0&size=20"))).toBe(true);
});
test("filters are project scoped and incompatible overdue filtering is cleared", async () => {
  mount(); await screen.findByText("Delivery delay");
  fireEvent.click(screen.getByLabelText("Overdue reviews only"));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("overdue=true"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CLOSED" } });
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("status=CLOSED") && url.includes("overdue=false"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Likelihood filter"), { target: { value: "UNASSESSED" } });
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes("likelihood=UNASSESSED"))).toBe(true));
});
test("project switch discards anchored editor and ignores late write results", async () => {
  let finish; const normal = fetch.getMockImplementation();
  fetch.mockImplementation((url, options) => options?.method === "PUT" ? new Promise(resolve => { finish = resolve; }) : normal(url, options));
  const view = mount(); fireEvent.click(await screen.findByText("Edit risk")); fireEvent.click(screen.getByText("Save risk"));
  await waitFor(() => expect(writes()).toHaveLength(1));
  data = { ...data, content: [], canCreate: false }; view.rerender(tree(7));
  await screen.findByText("No risks match these filters.");
  finish(response(risk));
  await waitFor(() => expect(screen.queryByRole("form", { name: "Risk editor" })).not.toBeInTheDocument());
  expect(screen.queryByText(/Risk saved/)).not.toBeInTheDocument(); expect(writes()[0][0]).toMatch(/projects\/2\/risks\/9$/);
});
