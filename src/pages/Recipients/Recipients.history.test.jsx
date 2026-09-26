import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Recipients from "./Recipients";
import { ProjectContext } from "../../context/ProjectContext";
import { authValue, jsonResponse } from "../../testUtils/authTestUtils";
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./Recipient/Recipient", () => (props) => <button onClick={() => props.onSelectChange(props.row.id, true)}>Select test recipient</button>);
const { useAuth } = require("../../context/AuthContext");

test("bulk deletion retains missing-row explanation and reloads current recipient and parent data", async () => {
  useAuth.mockReturnValue(authValue(["ADMIN"]));
  jest.spyOn(window, "confirm").mockReturnValue(true);
  let recipientReads = 0, orderReads = 0;
  const message = "Deleted 0 recipients. Recipients not found or already deleted: Recipient #77.";
  global.fetch = jest.fn((url, options = {}) => {
    if (url.includes("/bulk-delete")) return jsonResponse({ requestedCount: 1, deletedCount: 0, lockedRecipientIds: [], notFoundRecipientIds: [77], message });
    if (url.includes("/api/payment-orders/project/1")) {
      orderReads++;
      return jsonResponse([{ id: 120, lifecycleStatus: "DRAFT", locked: false }]);
    }
    if (url.includes("/api/recipients/by-project/1")) {
      recipientReads++;
      return jsonResponse(recipientReads === 1 ? [{ id: 77, paymentOrderId: 120, organizationId: 9, amount: 10 }] : []);
    }
    return jsonResponse([]);
  });
  render(<ProjectContext.Provider value={{ selectedProjectId: 1, projects: [] }}><Recipients /></ProjectContext.Provider>);
  fireEvent.click(await screen.findByText("Select test recipient"));
  fireEvent.click(screen.getByRole("button", { name: /Delete selected/ }));
  await waitFor(() => expect(recipientReads).toBe(2));
  expect(orderReads).toBe(2);
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Select test recipient")).not.toBeInTheDocument();
  jest.restoreAllMocks();
});
