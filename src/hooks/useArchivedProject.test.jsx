import { renderHook } from "@testing-library/react";
import { ProjectContext } from "../context/ProjectContext";
import useArchivedProject from "./useArchivedProject";

test("uses the record's actual project instead of the selected project", () => {
  const wrapper = ({ children }) => <ProjectContext.Provider value={{ selectedProjectId: "1", projects: [{ id: 1, archived: false }, { id: 2, archived: true }] }}>{children}</ProjectContext.Provider>;
  const { result, rerender } = renderHook(({ id }) => useArchivedProject(id), { wrapper, initialProps: { id: 2 } });
  expect(result.current).toBe(true);
  rerender({ id: 1 });
  expect(result.current).toBe(false);
  rerender({ id: undefined });
  expect(result.current).toBe(false);
});
