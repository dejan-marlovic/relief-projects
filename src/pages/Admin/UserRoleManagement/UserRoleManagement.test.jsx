import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByLabelText("Assign VIEWER to role.test")).toBeChecked();
    expect(screen.getByLabelText("Assign FINANCE to role.test")).not.toBeChecked();
  });

  test("Reset restores persisted roles without sending PUT", async () => {
    mockInitialLoads();
    renderManagement();
    const finance = await screen.findByLabelText("Assign FINANCE to role.test");
    fireEvent.click(finance);
    const row = screen.getByRole("row", { name: /role\.test/ });
    fireEvent.click(within(row).getByRole("button", { name: "Reset" }));
    expect(finance).not.toBeChecked();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("saves multiple roles in the expected request body", async () => {
    mockInitialLoads();
    fetch.mockReturnValueOnce(jsonResponse({ ...users[0], roles: ["FINANCE", "APPROVER"] }));
    renderManagement();
    await screen.findByText("role.test");
    fireEvent.click(screen.getByLabelText("Assign VIEWER to role.test"));
    fireEvent.click(screen.getByLabelText("Assign FINANCE to role.test"));
    fireEvent.click(screen.getByLabelText("Assign APPROVER to role.test"));
    fireEvent.click(within(screen.getByRole("row", { name: /role\.test/ })).getByRole("button", { name: /Save/ }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    const [, options] = fetch.mock.calls[2];
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ roles: ["FINANCE", "APPROVER"] });
    expect(await screen.findByText("Roles updated for role.test.")).toBeInTheDocument();
  });

  test("rejects an empty role selection without calling PUT", async () => {
    mockInitialLoads();
    renderManagement();
    await screen.findByText("role.test");
    fireEvent.click(screen.getByLabelText("Assign VIEWER to role.test"));
    fireEvent.click(within(screen.getByRole("row", { name: /role\.test/ })).getByRole("button", { name: /Save/ }));
    expect(await screen.findByText("At least one role is required for role.test.")).toBeInTheDocument();
    expect(screen.getByText("Select at least one role.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("shows the backend final-admin conflict", async () => {
    const adminUsers = [{ ...users[0], roles: ["ADMIN"] }];
    fetch.mockReturnValueOnce(jsonResponse(adminUsers)).mockReturnValueOnce(jsonResponse(roles));
    fetch.mockReturnValueOnce(jsonResponse({ message: "The final active administrator cannot lose the ADMIN role." }, 409));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    renderManagement();
    await screen.findByText("role.test");
    fireEvent.click(screen.getByLabelText("Assign VIEWER to role.test"));
    fireEvent.click(screen.getByLabelText("Assign ADMIN to role.test"));
    fireEvent.click(within(screen.getByRole("row", { name: /role\.test/ })).getByRole("button", { name: /Save/ }));
    expect(await screen.findByText("The final active administrator cannot lose the ADMIN role.")).toBeInTheDocument();
    errorSpy.mockRestore();
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
