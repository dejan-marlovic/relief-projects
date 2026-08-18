import { getSelectedProjectName } from "./projectDisplay";

describe("getSelectedProjectName", () => {
  const projects = [
    { id: 1, projectName: "Emergency Flood Relief" },
    { id: 2, name: "Health Programme" },
  ];

  test("returns the selected projectName regardless of ID type", () => {
    expect(getSelectedProjectName(projects, "1")).toBe(
      "Emergency Flood Relief"
    );
  });

  test("supports the alternative name property", () => {
    expect(getSelectedProjectName(projects, 2)).toBe("Health Programme");
  });

  test("falls back to the project ID until its name is available", () => {
    expect(getSelectedProjectName([], 9)).toBe("Project #9");
  });

  test("returns an empty label when no project is selected", () => {
    expect(getSelectedProjectName(projects, "")).toBe("");
  });
});
