import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireRole from "./RequireRole";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
const { useAuth } = require("../context/AuthContext");

const renderGuard = (auth, props = { role: "ADMIN" }) => {
  useAuth.mockReturnValue(auth);
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<RequireRole {...props}><div>Protected content</div></RequireRole>} />
        <Route path="/project" element={<div>Project page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("RequireRole", () => {
  test("renders an allowed ADMIN route", () => {
    renderGuard({ isLoading: false, user: {}, hasAnyRole: () => true });
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  test.each(["PROJECT_MANAGER", "FINANCE", "APPROVER", "VIEWER"])(
    "redirects %s from the ADMIN route",
    (role) => {
      renderGuard({ isLoading: false, user: { roles: [role] }, hasAnyRole: () => false });
      expect(screen.getByText("Project page")).toBeInTheDocument();
    },
  );

  test("allows ADMIN and PROJECT_MANAGER on a multi-role route", () => {
    renderGuard(
      { isLoading: false, user: {}, hasAnyRole: (...roles) => roles.includes("PROJECT_MANAGER") },
      { roles: ["ADMIN", "PROJECT_MANAGER"] },
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  test("redirects an unauthenticated visitor to login", () => {
    renderGuard({ isLoading: false, user: null, hasAnyRole: () => false });
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
