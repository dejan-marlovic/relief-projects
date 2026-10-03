import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterProject from "./RegisterProject";
import { ProjectContext } from "../../context/ProjectContext";
import { appFetch } from "../../utils/appFetch";

jest.mock("../../utils/appFetch", () => ({ appFetch: jest.fn() }));
test("new project registration sends No and never defaults to approved", async () => {
  localStorage.setItem("authToken", "test-token");
  const response = data => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) });
  appFetch.mockImplementation(async (url, options) => {
    if (options?.method === "POST") return response({ id: 99, projectName: "New project", approved: "No" });
    if (url.includes("project-statuses")) return response([{ id: 1, statusName: "In Progress" }]);
    if (url.includes("project-types")) return response([{ id: 1, typeName: "Humanitarian", projectTypeName: "Humanitarian" }]);
    return response([]);
  });
  const view = render(<MemoryRouter><ProjectContext.Provider value={{ setProjects: jest.fn(), setSelectedProjectId: jest.fn() }}><RegisterProject /></ProjectContext.Provider></MemoryRouter>);
  await screen.findByRole("option", { name: "In Progress" });
  const entries = { projectName: "New project", projectCode: "P99", projectStatusId: "1", projectTypeId: "1", projectDate: "2026-10-03T10:00", projectStart: "2026-10-03T10:00", projectEnd: "2026-12-31T10:00" };
  // The existing registration form identifies these controls by name, without associated labels.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  for (const [name, value] of Object.entries(entries)) fireEvent.change(view.container.querySelector(`[name="${name}"]`), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Register", exact: true }));
  await waitFor(() => expect(appFetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [, options] = appFetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(options.body).approved).toBe("No");
  localStorage.removeItem("authToken");
});
