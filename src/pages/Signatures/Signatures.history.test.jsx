import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Signatures from "./Signatures";
import { ProjectContext } from "../../context/ProjectContext";
import { authValue, jsonResponse } from "../../testUtils/authTestUtils";
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./Signature/Signature", () => (props) => <div>
  <span>{props.poOptions[0]?.locked ? "Current order locked" : "Current order unlocked"}</span>
  <button onClick={() => props.onDelete(props.row.id)}>Delete test signature</button>
</div>);
const { useAuth } = require("../../context/AuthContext");

test.each([true, false])("signature deletion success=%s refreshes current order state only on success", async (success) => {
  useAuth.mockReturnValue(authValue(["APPROVER"]));
  jest.spyOn(window, "confirm").mockReturnValue(true);
  let changed = false;
  let orderReads = 0;
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === "DELETE") {
      changed = success;
      return jsonResponse(success ? null : { message: "Conflict" }, success ? 200 : 409);
    }
    if (url.includes("/api/payment-orders/project/1")) {
      orderReads++;
      return jsonResponse([{ id: 120, lifecycleStatus: "APPROVED", locked: !changed }]);
    }
    if (url.includes("/api/signatures/by-project/1")) return jsonResponse([{ id: 77, paymentOrderId: 120, signature: "Existing" }]);
    return jsonResponse([]);
  });
  render(<ProjectContext.Provider value={{ selectedProjectId: 1, projects: [] }}><Signatures /></ProjectContext.Provider>);
  await screen.findByText("Current order locked");
  fireEvent.click(screen.getByText("Delete test signature"));
  if (success) {
    await screen.findByText("Current order unlocked");
    expect(orderReads).toBe(2);
  } else {
    await screen.findByText("Conflict");
    await waitFor(() => expect(orderReads).toBe(1));
  }
  jest.restoreAllMocks();
});
