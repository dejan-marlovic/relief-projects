import { useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import styles from "./Layout.module.scss";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/BrandingContext", () => ({ useBranding: () => ({ logoUrl: "/logo.png" }) }));
const { useAuth } = require("../../context/AuthContext");

const DirtyProject = () => {
  const { setUnsavedChange } = useUnsavedChanges();
  useEffect(() => {
    setUnsavedChange("budget-7", true);
    return () => setUnsavedChange("budget-7", false);
  }, [setUnsavedChange]);
  return <div>Project with unsaved changes</div>;
};

const renderLayout = (roles, projectContext = {}, projectElement = <div>Project</div>) => {
  localStorage.setItem("authToken", "token");
  useAuth.mockReturnValue({
    clearAuth: jest.fn(),
    hasRole: (role) => roles.includes(role),
    hasAnyRole: (...required) => required.some((role) => roles.includes(role)),
  });
  return render(
    <ProjectContext.Provider value={{
      projects: [],
      selectedProjectId: "",
      setSelectedProjectId: jest.fn(),
      ...projectContext,
    }}>
      <MemoryRouter initialEntries={["/project"]}>
        <Routes><Route path="/" element={<Layout />}><Route path="project" element={projectElement} /></Route></Routes>
      </MemoryRouter>
    </ProjectContext.Provider>,
  );
};

describe("role-aware navigation", () => {
  afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

  test("ADMIN sees Admin and New Project", () => {
    renderLayout(["ADMIN"]);
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New Project" })).toBeInTheDocument();
  });

  test("PROJECT_MANAGER sees New Project but not Admin", () => {
    renderLayout(["PROJECT_MANAGER"]);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New Project" })).toBeInTheDocument();
  });

  test.each(["FINANCE", "APPROVER", "VIEWER"])("%s sees neither privileged navigation item", (role) => {
    renderLayout([role]);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New Project" })).not.toBeInTheDocument();
  });

  test("uses the selected project name as the project tab label", () => {
    renderLayout(["VIEWER"], {
      projects: [
        { id: 1, projectName: "First Project" },
        { id: 2, projectName: "Emergency Flood Relief" },
      ],
      selectedProjectId: "2",
    });

    const projectTab = screen.getByRole("link", {
      name: "Emergency Flood Relief",
    });
    expect(projectTab).toHaveAttribute("href", "/project");
    expect(projectTab).toHaveClass(styles.projectTab);
    expect(screen.queryByRole("link", { name: "Project" })).not.toBeInTheDocument();
  });

  test("uses Project while no selected project name is available", () => {
    renderLayout(["VIEWER"]);
    expect(screen.getByRole("link", { name: "Project" })).toBeInTheDocument();
  });

  test("keeps the user on the current tab when unsaved budget changes are not discarded", () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    renderLayout(["FINANCE"], {}, <DirtyProject />);

    fireEvent.click(screen.getByRole("link", { name: "Transactions" }));

    expect(confirm).toHaveBeenCalledWith(
      "You have unsaved changes. Leave this page without saving them?",
    );
    expect(screen.getByText("Project with unsaved changes")).toBeInTheDocument();
  });
});
