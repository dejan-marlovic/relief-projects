import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import Organizations from "./Organizations";

jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true }) }));
jest.mock("../../hooks/useMediaQuery", () => () => true);

test("mobile relationship selection saves immediately and keeps the editor open", async () => {
  let row = { id: 11, projectId: 1, organizationId: 5, organizationStatusId: 2 };
  const response = body => ({ ok: true, json: async () => body, text: async () => JSON.stringify(body) });
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === "PUT") { row = { ...row, ...JSON.parse(options.body) }; return response(row); }
    if (url.endsWith("/assessment")) return response({ assessment: null });
    if (url.endsWith("/api/project-organizations/active")) return response([row]);
    if (url.endsWith("/api/organizations/active/options")) return response([{ id: 5, name: "Demo Partner" }]);
    if (url.endsWith("/api/projects/ids-names")) return response([{ id: 1, projectName: "Demo Project" }]);
    if (url.endsWith("/api/organization-statuses/active")) return response([{ id: 2, organizationStatusName: "Partner" }, { id: 3, organizationStatusName: "Financier" }]);
    throw new Error(`Unexpected request: ${url}`);
  });
  render(<MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: 1, projects: [{ id: 1, projectName: "Demo Project" }] }}><Organizations /></ProjectContext.Provider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const status = await screen.findByRole("combobox", { name: "Status" });
  fireEvent.change(status, { target: { value: "3" } });
  expect(await screen.findByText("Saved")).toBeInTheDocument();
  expect(row.organizationStatusId).toBe(3);
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("3");
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
});
