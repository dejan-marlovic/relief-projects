import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import { ProjectContext } from "../../context/ProjectContext";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/BrandingContext", () => ({ useBranding: () => ({ logoUrl: "/logo.png" }) }));
const { useAuth } = require("../../context/AuthContext");

const renderLayout = (roles) => {
  localStorage.setItem("authToken", "token");
  useAuth.mockReturnValue({
    clearAuth: jest.fn(),
    hasRole: (role) => roles.includes(role),
    hasAnyRole: (...required) => required.some((role) => roles.includes(role)),
  });
  return render(
    <ProjectContext.Provider value={{ projects: [], selectedProjectId: "", setSelectedProjectId: jest.fn() }}>
      <MemoryRouter initialEntries={["/project"]}>
        <Routes><Route path="/" element={<Layout />}><Route path="project" element={<div>Project</div>} /></Route></Routes>
      </MemoryRouter>
    </ProjectContext.Provider>,
  );
};

describe("role-aware navigation", () => {
  afterEach(() => { localStorage.clear(); jest.clearAllMocks(); });

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
});
