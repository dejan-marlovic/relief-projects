import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { jsonResponse, makeUser } from "../testUtils/authTestUtils";

const Probe = () => {
  const { user, roles, isLoading, hasRole, hasAnyRole } = useAuth();
  return <div>
    <span data-testid="loading">{String(isLoading)}</span>
    <span data-testid="username">{user?.username || "anonymous"}</span>
    <span data-testid="roles">{roles.join(",")}</span>
    <span data-testid="admin">{String(hasRole("ADMIN"))}</span>
    <span data-testid="viewer">{String(hasRole("VIEWER"))}</span>
    <span data-testid="manager-or-admin">{String(hasAnyRole("ADMIN", "PROJECT_MANAGER"))}</span>
  </div>;
};

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

  test("loads an ADMIN profile and exposes role helpers", async () => {
    localStorage.setItem("authToken", "valid-token");
    fetch.mockReturnValueOnce(jsonResponse(makeUser(["ADMIN"]), 200));
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("role.test"));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("roles")).toHaveTextContent("ADMIN");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
    expect(screen.getByTestId("viewer")).toHaveTextContent("false");
    expect(screen.getByTestId("manager-or-admin")).toHaveTextContent("true");
  });

  test("preserves multiple roles", async () => {
    localStorage.setItem("authToken", "valid-token");
    fetch.mockReturnValueOnce(jsonResponse(makeUser(["FINANCE", "APPROVER"]), 200));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("roles")).toHaveTextContent("FINANCE,APPROVER"));
  });

  test("does not call /api/auth/me without a token", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("username")).toHaveTextContent("anonymous");
    expect(fetch).not.toHaveBeenCalled();
  });

  test("clears an invalid token after a 401", async () => {
    localStorage.setItem("authToken", "expired-token");
    fetch.mockReturnValueOnce(jsonResponse({ message: "Unauthorized" }, 401));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(localStorage.getItem("authToken")).toBeNull());
    expect(screen.getByTestId("username")).toHaveTextContent("anonymous");
  });
});
