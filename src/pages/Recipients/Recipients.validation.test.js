import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Recipients from "./Recipients";
import { ProjectContext } from "../../context/ProjectContext";
import { authValue, jsonResponse } from "../../testUtils/authTestUtils";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
const { useAuth } = require("../../context/AuthContext");

const positiveAmountError = {
  status: 400,
  message: "A recipient requires a positive amount.",
  fieldErrors: {
    organizationId:
      "The selected organization has no positive payment-order-line amount for this payment order.",
  },
};

describe("Recipient amount validation", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "token");
    Element.prototype.scrollIntoView = jest.fn();
    useAuth.mockReturnValue(authValue(["FINANCE"]));

    global.fetch = jest.fn((url, options = {}) => {
      if (options.method === "POST" && url.includes("/api/recipients")) {
        return jsonResponse(positiveAmountError, 400);
      }
      if (url.includes("/api/recipients/by-project/1")) {
        return jsonResponse([]);
      }
      if (url.includes("/api/payment-orders/project/1")) {
        return jsonResponse([{ id: 12 }]);
      }
      if (url.includes("/api/organizations/active/options")) {
        return jsonResponse([
          { id: 5, label: "First organization" },
          { id: 6, label: "Second organization" },
        ]);
      }
      return jsonResponse([]);
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("shows the backend positive-amount error inline and clears it when corrected", async () => {
    render(
      <MemoryRouter>
        <ProjectContext.Provider
          value={{
            selectedProjectId: "1",
            projects: [{ id: 1, name: "Test project" }],
          }}
        >
          <Recipients />
        </ProjectContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /New/i }));

    const [organizationSelect, paymentOrderSelect] =
      screen.getAllByRole("combobox");
    fireEvent.change(organizationSelect, { target: { value: "5" } });
    fireEvent.change(paymentOrderSelect, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "The selected organization has no positive payment-order-line amount for this payment order.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A recipient requires a positive amount."),
    ).toBeInTheDocument();

    fireEvent.change(organizationSelect, { target: { value: "6" } });

    await waitFor(() =>
      expect(
        screen.queryByText(
          "The selected organization has no positive payment-order-line amount for this payment order.",
        ),
      ).not.toBeInTheDocument(),
    );
  });
});
