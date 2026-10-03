import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterProject from "./RegisterProject";
import { ProjectContext } from "../../context/ProjectContext";
import { appFetch } from "../../utils/appFetch";

jest.mock("../../utils/appFetch", () => ({ appFetch: jest.fn() }));
test.each([false, true])("registration preserves unassessed approval and capability-gated metadata (support %s)", async supported => {
  localStorage.setItem("authToken", "test-token");
  const response = data => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) });
  appFetch.mockImplementation(async (url, options) => {
    if (options?.method === "POST") return response({ id: 99, projectName: "New project", approved: "No" });
    if (url.includes("project-statuses")) return response([{ id: 1, statusName: "In Progress" }]);
    if (url.includes("project-types")) return response([{ id: 1, typeName: "Humanitarian", projectTypeName: "Humanitarian" }]);
    if (url.endsWith("geography/countries")) return response({ catalogueVersion: "test", maxSelections: 20, countries: [{ code: "LB", label: "Lebanon", selectable: true }] });
    if (url.endsWith("ids-names")) return response([{ id: 1, projectName: "Existing" }]);
    if (url.endsWith("projects/1")) return response(supported ? { id: 1, projectNameSv: null, projectNameEn: null, targetGroupDescription: null } : { id: 1 });
    return response([]);
  });
  const view = render(<MemoryRouter><ProjectContext.Provider value={{ setProjects: jest.fn(), setSelectedProjectId: jest.fn() }}><RegisterProject /></ProjectContext.Provider></MemoryRouter>);
  await screen.findByRole("option", { name: "In Progress" });
  const entries = { projectName: "New project", projectCode: "P99", projectStatusId: "1", projectTypeId: "1", projectDate: "2026-10-03T10:00", projectStart: "2026-10-03T10:00", projectEnd: "2026-12-31T10:00" };
  // The existing registration form identifies these controls by name, without associated labels.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  for (const [name, value] of Object.entries(entries)) fireEvent.change(view.container.querySelector(`[name="${name}"]`), { target: { value } });
  if (supported) {
    fireEvent.change(await screen.findByLabelText(/Swedish title/), { target: { value: "Svensk titel" } });
    fireEvent.change(screen.getByLabelText(/Target group description/), { target: { value: "Households" } });
  }
  fireEvent.click(await screen.findByLabelText("Lebanon (LB)"));
  fireEvent.click(screen.getByRole("button", { name: "Register", exact: true }));
  await waitFor(() => expect(appFetch.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const [, options] = appFetch.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(options.body).approved).toBe("No");
  const body = JSON.parse(options.body);
  expect(body.operatingCountryCodes).toEqual(["LB"]);
  if (supported) {
    expect(body.projectNameSv).toBe("Svensk titel");
    expect(body.targetGroupDescription).toBe("Households");
  } else expect(body).not.toHaveProperty("projectNameSv");
  appFetch.mockClear();
  localStorage.removeItem("authToken");
});
