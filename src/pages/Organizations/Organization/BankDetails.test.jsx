import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BankDetails from "./BankDetails";

const linked = [
  {
    bankId: 21,
    organizationId: 5,
    bankName: "Nordic Relief Bank",
    accountNumber: "SE-100",
    branchName: "Stockholm",
    swiftCode: "NRBKSESS",
  },
  {
    bankId: 22,
    organizationId: 5,
    bankName: "Humanitarian Bank",
    accountNumber: "CH-200",
    branchName: "Geneva",
    swiftCode: "HUMBCHGG",
  },
];

const unlinked = [
  {
    bankId: 30,
    organizationId: null,
    bankName: "Available Bank",
    accountNumber: "UN-300",
    branchName: "New York",
    swiftCode: "AVBKUS33",
  },
];

const response = (body, ok = true) => ({
  ok,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("Organization bank-detail relationships", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "token");
    global.fetch = jest.fn((url) => {
      if (url.includes("/api/organizations/5/bank-details")) {
        return Promise.resolve(response(linked));
      }
      if (url.includes("/api/bank-details/unlinked")) {
        return Promise.resolve(response(unlinked));
      }
      return Promise.resolve(response({}));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test("renders linked bank details without mutation controls for read-only users", async () => {
    render(<BankDetails organizationId={5} />);

    expect(await screen.findByText("Nordic Relief Bank")).toBeInTheDocument();
    expect(screen.getByText("Humanitarian Bank")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit bank detail/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove bank detail/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New Bank Detail/ })).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/bank-details/unlinked"),
      expect.anything()
    );
  });

  test("managers can edit, create, link, and unlink without a global delete control", async () => {
    render(<BankDetails organizationId={5} canManage />);

    expect(await screen.findByText("Nordic Relief Bank")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Edit bank detail/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Remove bank detail .* from organization/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /New Bank Detail/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Existing bank detail" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete bank detail/ })).not.toBeInTheDocument();
  });

  test("links an existing bank detail through the organization relationship endpoint", async () => {
    render(<BankDetails organizationId={5} canManage />);

    const select = await screen.findByRole("combobox", { name: "Existing bank detail" });
    await waitFor(() => expect(screen.getByRole("option", { name: /Available Bank/ })).toBeInTheDocument());
    fireEvent.change(select, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /Add existing/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/5/bank-details/30"),
      expect.objectContaining({ method: "POST" })
    ));
  });

  test("unlink removes only the organization-bank-detail relationship", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<BankDetails organizationId={5} canManage />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove bank detail 22 from organization" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/5/bank-details/22"),
      expect.objectContaining({ method: "DELETE" })
    ));
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/bank-details\/22$/),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
