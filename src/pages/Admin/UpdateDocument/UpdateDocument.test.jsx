import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UpdateDocument from "./UpdateDocument";
import { jsonResponse } from "../../../testUtils/authTestUtils";

test("metadata updates omit the immutable stored key", async () => {
  const row = { id: 7, employeeId: 2, projectId: 1, documentName: "Report.pdf", documentPath: "stored.pdf" };
  localStorage.setItem("authToken", "token");
  global.fetch = jest.fn((url, options) => {
    if (options?.method === "PUT") return jsonResponse(row);
    if (url.endsWith("/documents/active")) return jsonResponse([row]);
    if (url.endsWith("/employees/active")) return jsonResponse([{ id: 2, firstName: "Test" }]);
    return jsonResponse([{ id: 1, projectName: "Project" }]);
  });
  render(<MemoryRouter><UpdateDocument /></MemoryRouter>);
  await screen.findByRole("option", { name: /Report.pdf/ });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "7" } });
  expect(screen.getByLabelText("Stored file (read-only)")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: /Update document/i }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(true));
  const [, options] = fetch.mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(options.body)).toEqual({ employeeId: 2, projectId: 1, documentName: "Report.pdf" });
  localStorage.clear();
});
