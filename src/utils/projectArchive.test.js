import { visibleProjects, isArchivedProject } from "./projectArchive";

const projects = [{ id: 1, archived: false }, { id: 2, archived: true }, { id: 3 }];
test("hides archived projects by default and includes them on request", () => {
  expect(visibleProjects(projects, false, 1).map(p => p.id)).toEqual([1, 3]);
  expect(visibleProjects(projects, true, 1)).toEqual(projects);
});
test("does not silently change a selected archived project", () => {
  expect(visibleProjects(projects, false, "2")).toEqual(projects);
});
test("does not infer archival from operational status", () => {
  expect(isArchivedProject({ projectStatus: "Completed" })).toBe(false);
});
