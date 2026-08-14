import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddressDetails from "./AddressDetails";

const linked = [
  {
    associationId: 1,
    organizationId: 5,
    addressId: 10,
    primary: true,
    address: { id: 10, street: "Main Street", city: "Stockholm", state: "", postalCode: "11122", country: "Sweden" },
  },
  {
    associationId: 2,
    organizationId: 5,
    addressId: 11,
    primary: false,
    address: { id: 11, street: "Second Street", city: "Geneva", state: "", postalCode: "1201", country: "Switzerland" },
  },
];

const response = (body, ok = true) => ({
  ok,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("Organization multi-address details", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "token");
    global.fetch = jest.fn((url) => {
      if (url.includes("/api/organizations/5/addresses")) return Promise.resolve(response(linked));
      if (url.includes("/api/addresses/active")) return Promise.resolve(response(linked.map((item) => item.address)));
      return Promise.resolve(response({}));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test("renders all linked addresses and the primary marker for read-only users", async () => {
    render(<AddressDetails organizationId={5} />);
    expect(await screen.findByText("Main Street")).toBeInTheDocument();
    expect(screen.getByText("Second Street")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit address/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Make address/ })).not.toBeInTheDocument();
  });

  test("manager can edit, add, select a primary address, and unlink", async () => {
    render(<AddressDetails organizationId={5} canManage />);
    expect(await screen.findByText("Main Street")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Edit address/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Make address 11 primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Address/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Remove address .* from organization/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Delete address/ })).not.toBeInTheDocument();
  });

  test("admin can unlink but cannot globally delete addresses from this view", async () => {
    render(<AddressDetails organizationId={5} canManage />);
    expect(await screen.findByText("Main Street")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Remove address .* from organization/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Delete address/ })).not.toBeInTheDocument();
  });

  test("setting an additional address as primary calls the new endpoint", async () => {
    render(<AddressDetails organizationId={5} canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Make address 11 primary" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/5/addresses/11/primary"),
      expect.objectContaining({ method: "PUT" })
    ));
  });

  test("manager unlink removes only the organization-address association", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<AddressDetails organizationId={5} canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove address 11 from organization" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/5/addresses/11"),
      expect.objectContaining({ method: "DELETE" })
    ));
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/addresses/11"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
