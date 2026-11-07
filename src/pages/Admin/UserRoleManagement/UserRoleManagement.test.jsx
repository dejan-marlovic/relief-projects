import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserRoleManagement from "./UserRoleManagement";
import { jsonResponse } from "../../../testUtils/authTestUtils";

const roles = [
  { id: 1, name: "ADMIN", description: "Administration" },
  { id: 2, name: "PROJECT_MANAGER", description: "Projects" },
  { id: 3, name: "FINANCE", description: "Finance" },
  { id: 4, name: "APPROVER", description: "Approvals" },
  { id: 5, name: "VIEWER", description: "Read only" },
];
const users = [{ id: 10, employeeId: 2, username: "role.test", email: "role.test@example.com", roles: ["VIEWER"] }];

const mockInitialLoads = () => {
  fetch.mockReturnValueOnce(jsonResponse(users)).mockReturnValueOnce(jsonResponse(roles));
};

const renderManagement = () => render(<MemoryRouter><UserRoleManagement /></MemoryRouter>);

describe("UserRoleManagement", () => {
  beforeEach(() => { localStorage.setItem("authToken", "token"); global.fetch = jest.fn(); });
  afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

  test("renders persisted role assignments", async () => {
    mockInitialLoads();
    renderManagement();
    expect(await screen.findByText("role.test")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Save status" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Assign VIEWER to role.test")).toBeChecked();
    expect(screen.getByLabelText("Assign FINANCE to role.test")).not.toBeChecked();
  });

  test("automatically saves a role change without Save or Reset buttons", async () => {
    mockInitialLoads();
    fetch.mockReturnValueOnce(jsonResponse({ ...users[0], roles: ["FINANCE", "VIEWER"] }));
    renderManagement();
    fireEvent.click(await screen.findByLabelText("Assign FINANCE to role.test"));
    expect(await screen.findByText("Roles updated for role.test.")).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ roles: ["FINANCE", "VIEWER"] });
    expect(fetch.mock.calls[2][1].method).toBe("PUT");
    expect(screen.queryByRole("button", { name: /^Save|Reset$/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Assign FINANCE to role.test")).toBeChecked();
  });

  test("keeps the user's only role and does not send an invalid update", async () => {
    mockInitialLoads();
    renderManagement();
    const viewer = await screen.findByLabelText("Assign VIEWER to role.test");
    fireEvent.click(viewer);
    expect(await screen.findByText(/At least one role is required for role.test/)).toBeInTheDocument();
    expect(viewer).toBeChecked();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("blocks removal of the final administrator locally", async () => {
    fetch.mockReturnValueOnce(jsonResponse([{ ...users[0], roles: ["ADMIN", "VIEWER"] }])).mockReturnValueOnce(jsonResponse(roles));
    renderManagement();
    const admin = await screen.findByLabelText("Assign ADMIN to role.test");
    fireEvent.click(admin);
    expect(await screen.findByRole("alert")).toHaveTextContent("The last administrator cannot be removed. Assign ADMIN to another active user first.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss error message" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(admin);
    expect(await screen.findByRole("alert")).toHaveTextContent("The last administrator cannot be removed.");
    expect(admin).toBeChecked();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("honours a backend final-admin conflict when the loaded counts are stale", async () => {
    fetch.mockReturnValueOnce(jsonResponse([
      { ...users[0], roles: ["ADMIN", "VIEWER"] },
      { id: 11, username: "other.admin", roles: ["ADMIN"] },
    ])).mockReturnValueOnce(jsonResponse(roles));
    fetch.mockReturnValueOnce(jsonResponse({ message: "The final active administrator cannot lose the ADMIN role." }, 409));
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderManagement();
    fireEvent.click(await screen.findByLabelText("Assign ADMIN to role.test"));
    expect(await screen.findByText(/The final active administrator cannot lose the ADMIN role./)).toBeInTheDocument();
    expect(screen.getByLabelText("Assign ADMIN to role.test")).toBeChecked();
    expect(screen.getByLabelText("Assign ADMIN to role.test")).toBeDisabled();
    expect(screen.queryByText("Roles updated for role.test.")).not.toBeInTheDocument();
  });

  test("serializes changes and uses confirmed roles for the next update", async () => {
    mockInitialLoads();
    let resolveSave;
    fetch.mockReturnValueOnce(new Promise(resolve => { resolveSave = resolve; }));
    renderManagement();
    fireEvent.click(await screen.findByLabelText("Assign FINANCE to role.test"));
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByLabelText("Assign VIEWER to role.test")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeDisabled();
    resolveSave(await jsonResponse({ ...users[0], roles: ["FINANCE", "VIEWER"] }));
    await waitFor(() => expect(screen.getByLabelText("Assign VIEWER to role.test")).toBeEnabled());
    fetch.mockReturnValueOnce(jsonResponse({ ...users[0], roles: ["FINANCE"] }));
    fireEvent.click(screen.getByLabelText("Assign VIEWER to role.test"));
    await waitFor(() => expect(screen.getByLabelText("Assign VIEWER to role.test")).toBeEnabled());
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ roles: ["FINANCE"] });
    expect(screen.getByLabelText("Assign VIEWER to role.test")).not.toBeChecked();
  });

  test("refreshes uncertain assignments after a network failure without silently retrying", async () => {
    mockInitialLoads();
    fetch.mockRejectedValueOnce(new Error("Connection lost"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    renderManagement();
    fireEvent.click(await screen.findByLabelText("Assign FINANCE to role.test"));
    expect(await screen.findByText(/Connection lost/)).toBeInTheDocument();
    expect(screen.getByLabelText("Assign FINANCE to role.test")).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(3);
    // The server may have committed before the connection was lost.
    fetch.mockReturnValueOnce(jsonResponse([{ ...users[0], roles: ["FINANCE", "VIEWER"] }])).mockReturnValueOnce(jsonResponse(roles));
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    await waitFor(() => expect(screen.getByLabelText("Assign FINANCE to role.test")).toBeEnabled());
    expect(screen.getByLabelText("Assign FINANCE to role.test")).toBeChecked();
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  test("Refresh reloads users and roles", async () => {
    mockInitialLoads();
    renderManagement();
    await screen.findByText("role.test");
    fetch.mockReturnValueOnce(jsonResponse(users)).mockReturnValueOnce(jsonResponse(roles));
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
  });
});
