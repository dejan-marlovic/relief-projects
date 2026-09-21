import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExcelJS from "exceljs";
import Transactions from "./Transactions";
import { ProjectContext } from "../../context/ProjectContext";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasRole: () => false, hasAnyRole: () => false }) }));
jest.mock("../../hooks/useMediaQuery", () => () => false);
jest.mock("exceljs", () => ({ Workbook: jest.fn() }));
test("export keeps exact funding and allocation values, current currency and no mixed or legacy-share grand totals", async () => {
  ExcelJS.Workbook.mockImplementation(() => {
    const workbook = new (jest.requireActual("exceljs").Workbook)();
    workbook.xlsx.writeBuffer = jest.fn().mockResolvedValue(new Uint8Array());
    return workbook;
  });
  URL.createObjectURL = jest.fn(() => "blob:test"); URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const transactions = [
    { id: 31, projectId: 2, budgetId: 8, appliedForAmount: "9999999999999999999.999", approvedAmount: "90.000", firstShareAmount: "12.50", secondShareAmount: "0.00", fundingCurrency: { source: "CURRENT_BUDGET_CONFIGURATION", availability: "AVAILABLE", currency: { id: 3, name: "SEK" } } },
    { id: 32, projectId: 2, budgetId: 9, appliedForAmount: null, approvedAmount: "12.125", firstShareAmount: "1.00", secondShareAmount: "0.00", fundingCurrency: { source: "CURRENT_BUDGET_CONFIGURATION", availability: "CURRENCY_UNAVAILABLE", currency: null } },
  ];
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => url.includes("/cost-allocations/") ? [{ id: 81, costDetailId: 7, plannedAmount: "90.000001" }] : url.includes("/transactions/project/") ? transactions : [] }));
  render(<MemoryRouter><ProjectContext.Provider value={{ selectedProjectId: 2, projects: [{ id: 2, projectName: "Demo" }] }}><Transactions /></ProjectContext.Provider></MemoryRouter>);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Select transaction 31" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Select transaction 32" }));
  fireEvent.click(screen.getByRole("button", { name: "Export selected (2)" }));
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  const sheet = ExcelJS.Workbook.mock.results[0].value.worksheets[0];
  const rows = sheet.getRows(1, sheet.rowCount);
  const first = rows.find((row) => row.getCell(1).value === 31);
  expect(first.getCell(7).value).toBe("9999999999999999999.999");
  expect(first.getCell(9).numFmt).toBe("#,##0.000");
  expect(first.getCell(4).value).toContain("Current currency: SEK");
  expect(rows.find((row) => row.getCell(1).value === 32).getCell(7).value).toBe("Unavailable");
  expect(rows.some((row) => String(row.getCell(9).value).includes("Remaining for allocation: -0.000001"))).toBe(true);
  expect(rows.some((row) => row.getCell(1).value === "GRAND TOTAL — TRANSACTION ALLOCATIONS")).toBe(false);
  expect(rows.some((row) => String(row.getCell(1).value).includes("Cross-transaction totals omitted"))).toBe(true);
  click.mockRestore();
});
