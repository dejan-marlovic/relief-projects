import React, { useContext } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { ProjectContext, ProjectProvider } from "./ProjectContext";

function Selection() {
  const { projects, selectedProjectId } = useContext(ProjectContext);
  return <div data-testid="selection">{selectedProjectId}:{projects.find(p => String(p.id) === String(selectedProjectId))?.archived ? "archived" : "active"}</div>;
}
const response = list => ({ ok: true, json: async () => list });
beforeEach(() => { localStorage.clear(); localStorage.setItem("authToken", "token"); global.fetch = jest.fn(); });
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

test("initial selection skips archived projects and refresh retains the selected archive", async () => {
  global.fetch.mockResolvedValue(response([{ id: 1, archived: true }, { id: 2, archived: false }]));
  render(<ProjectProvider><Selection /></ProjectProvider>);
  await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent("2:active"));
  global.fetch.mockResolvedValue(response([{ id: 1, archived: true }, { id: 2, archived: true }]));
  act(() => window.dispatchEvent(new Event("project-archive-changed")));
  await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent("2:archived"));
});

test("failed focus refresh preserves known archive status and selection", async () => {
  localStorage.setItem("selectedProjectId", "1");
  global.fetch.mockResolvedValue(response([{ id: 1, archived: true }]));
  render(<ProjectProvider><Selection /></ProjectProvider>);
  await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent("1:archived"));
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch.mockRejectedValue(new Error("offline"));
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(screen.getByTestId("selection")).toHaveTextContent("1:archived");
});

test("an older response cannot overwrite a newly archived state", async () => {
  localStorage.setItem("selectedProjectId", "1");
  let finishOlderRequest;
  global.fetch.mockImplementationOnce(() => new Promise(resolve => { finishOlderRequest = resolve; }))
    .mockResolvedValue(response([{ id: 1, archived: true }]));
  render(<ProjectProvider><Selection /></ProjectProvider>);
  act(() => window.dispatchEvent(new Event("project-archive-changed")));
  await waitFor(() => expect(screen.getByTestId("selection")).toHaveTextContent("1:archived"));
  await act(async () => finishOlderRequest(response([{ id: 1, archived: false }])));
  expect(screen.getByTestId("selection")).toHaveTextContent("1:archived");
});
