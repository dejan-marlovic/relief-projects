import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateDocument from "./CreateDocument";
import { jsonResponse } from "../../../testUtils/authTestUtils";

test.each(["", "2024-02-29"])("admin multipart upload includes category and optional date %s without spoofed attribution", async (date) => {
  localStorage.setItem("authToken", "token");
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  global.fetch = jest.fn((url, options) => {
    if (options?.method === "POST") return jsonResponse({ id: 8 });
    if (url.endsWith("/categories")) return jsonResponse([{ id: "FINANCE", label: "Finance" }, { id: "UNCATEGORIZED", label: "Uncategorized" }]);
    return jsonResponse([{ id: 1, projectName: "Demo project" }]);
  });
  const view = render(<MemoryRouter><CreateDocument /></MemoryRouter>);
  await screen.findByRole("option", { name: /Demo project/ });
  fireEvent.change(view.container.querySelector('[name="projectId"]'), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "FINANCE" } });
  fireEvent.change(screen.getByLabelText("Document date (optional)"), { target: { value: date } });
  fireEvent.change(view.container.querySelector('input[type="file"]'), { target: { files: [new File(["demo"], "demo.txt", { type: "text/plain" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  await screen.findByRole("option", { name: "Uncategorized" });
  const request = fetch.mock.calls.find(([, options]) => options?.method === "POST")[1];
  expect(request.body.get("category")).toBe("FINANCE");
  expect(request.body.get("documentDate")).toBe(date || null);
  expect(request.body.get("employeeId")).toBeNull();
  expect(request.body.get("uploadedByUserId")).toBeNull();
  expect(request.headers["Content-Type"]).toBeUndefined();
  alert.mockRestore();
  localStorage.clear();
});
