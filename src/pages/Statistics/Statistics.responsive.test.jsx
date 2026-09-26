import { render, screen } from "@testing-library/react";
import Statistics from "./Statistics";

jest.mock("recharts", () => {
  const React = require("react");
  const Container = ({ children }) => React.createElement("div", null, children);
  const Chart = ({ children }) => React.createElement("svg", null, children);
  return { ResponsiveContainer: Container, PieChart: Chart, BarChart: Chart,
    Pie: () => null, Bar: () => null, Cell: () => null, XAxis: () => null,
    YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null };
});

const rows = [
  [{ sectorId: 1, projectId: 1 }, { sectorId: 1, projectId: 2 }],
  [{ id: 1, sectorCode: "HEALTH", sectorDescription: "Emergency health services" }],
  [{ id: 1, projectName: "First" }, { id: 2, projectName: "Second" }],
  [{ id: 1, projectTypeName: "Long-term rehabilitation and recovery" }],
  [{ id: 1, statusName: "Active" }],
  [{ id: 1, projectTypeId: 1, projectStatusId: 1 }, { id: 2, projectTypeId: 1, projectStatusId: 1 }],
];

afterEach(() => { jest.restoreAllMocks(); delete window.matchMedia; delete global.fetch; });

test.each([true, false])("readable legends preserve counts and percentages (phone: %s)", async (phone) => {
  window.matchMedia = jest.fn(() => ({ matches: phone, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn();
  rows.forEach(data => global.fetch.mockResolvedValueOnce({ ok: true, json: async () => data }));
  render(<Statistics />);
  expect(await screen.findByText("HEALTH — Emergency health services — 2 (100.0%)")).toBeInTheDocument();
  expect(screen.getByText("Active — 2 (100.0%)")).toBeInTheDocument();
  if (phone) expect(screen.getByText("Long-term rehabilitation and recovery — 2")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(6);
});

test("empty data retains informative empty states", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
  render(<Statistics />);
  expect(await screen.findByText("No project–sector data found.")).toBeInTheDocument();
  expect(screen.getByText(/Make sure each project has a Project Status/)).toBeInTheDocument();
});
