import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RecordHistory from "./RecordHistory";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
const response = (body, status = 200) => ({ ok: status === 200, status, text: async () => JSON.stringify(body) });
const event = { id: 1, previousState: "DRAFT", newState: "SUBMITTED", performedByDisplay: "Alex", occurredAt: "2026-09-03T15:30:00Z" };
const page = (content = [event], number = 0, totalPages = 1) => ({ content, number, totalPages, totalElements: totalPages * content.length });
const props = { entityType: "BUDGET", entityId: 7, lifecycleStatus: "DRAFT" };
const open = () => { const details = screen.getByText(/^History ·/).closest("details"); details.open = true; fireEvent(details, new Event("toggle")); };

beforeEach(() => { global.fetch = jest.fn().mockResolvedValue(response(page())); localStorage.setItem("authToken", "token"); mockNavigate.mockClear(); });
afterEach(() => { localStorage.clear(); });

test("restored record history includes delete/restore activity and existing return reasons", async () => {
  fetch.mockResolvedValue(response(page([
    { ...event, id: 4, action: "RESTORE", previousState: null, newState: null },
    { ...event, id: 3, action: "DELETE", previousState: null, newState: null },
    { ...event, id: 2, action: "RETURN", previousState: "SUBMITTED", newState: "RETURNED", returnReason: "Correct the amounts." },
    { ...event, action: "SUBMIT" },
  ])));
  render(<RecordHistory {...props} />); open();
  for (const label of ["Restored", "Deleted"]) {
    const row = (await screen.findByText(label)).closest("tr");
    expect(row).not.toHaveTextContent("→");
    expect(row).not.toHaveTextContent("Return reason");
    expect(within(row).getByText("Alex")).toBeInTheDocument();
    expect(row.querySelector("time")).toHaveAttribute("dateTime", event.occurredAt);
  }
  expect(screen.getByText("Correct the amounts.")).toBeInTheDocument();
  expect(screen.getByText("Draft → Submitted")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(5);
});

test.each(["BUDGET", "TRANSACTION", "PAYMENT_ORDER"])("lazily loads scoped %s history with authentication", async (entityType) => {
  render(<RecordHistory {...props} entityType={entityType} />);
  expect(fetch).not.toHaveBeenCalled();
  open();
  expect(await screen.findByText("Alex")).toBeInTheDocument();
  const [url, options] = fetch.mock.calls[0];
  const query = new URL(url, "http://localhost").searchParams;
  expect(Object.fromEntries(query)).toEqual({ entityType, entityId: "7", page: "0", size: "20" });
  expect(options.headers.Authorization).toBe("Bearer token");
  expect(screen.getByText("Draft → Submitted")).toBeInTheDocument();
});

test.each([[403, "You do not have permission"], [404, "This record is unavailable"], [400, "Invalid filter"]])("handles %s without unscoped retries", async (status, message) => {
  fetch.mockResolvedValue(response({ message: "Invalid filter" }, status));
  render(<RecordHistory {...props} />); open();
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.queryByText("No record history yet.")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("empty history and expired authentication", async () => {
  fetch.mockResolvedValueOnce(response(page([], 0, 0))).mockResolvedValueOnce(response(null, 401));
  render(<RecordHistory {...props} />); open();
  expect(await screen.findByText("No record history yet.")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Refresh history"));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true }));
  expect(localStorage.getItem("authToken")).toBeNull();
});

test("paginates, clears old rows on failure, and refreshes from page zero", async () => {
  fetch.mockResolvedValueOnce(response(page([event], 0, 2)))
    .mockResolvedValueOnce(response(null, 404)).mockResolvedValueOnce(response(page()));
  render(<RecordHistory {...props} />); open();
  await screen.findByText("Alex");
  fireEvent.click(screen.getByText("Next"));
  await screen.findByRole("alert");
  expect(screen.queryByText("Alex")).not.toBeInTheDocument();
  expect(fetch.mock.calls[1][0]).toContain("page=1");
  fireEvent.click(screen.getByText("Refresh history"));
  await screen.findByText("Alex");
  expect(fetch.mock.calls[2][0]).toContain("page=0");
});

test("switching records aborts old requests and discards late responses", async () => {
  let finishOld;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
  const view = render(<RecordHistory {...props} />); open();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const signal = fetch.mock.calls[0][1].signal;
  view.rerender(<RecordHistory {...props} entityId={8} />);
  expect(signal.aborted).toBe(true);
  open();
  await screen.findByText("Alex");
  await act(async () => finishOld(response(page([{ ...event, performedByDisplay: "Old actor" }]))));
  expect(screen.queryByText("Old actor")).not.toBeInTheDocument();
  expect(fetch.mock.calls[1][0]).toContain("entityId=8&page=0");
});

test("lifecycle changes refresh an open panel and reset pagination", async () => {
  fetch.mockResolvedValueOnce(response(page([event], 0, 2))).mockResolvedValueOnce(response(page([event], 1, 2))).mockResolvedValueOnce(response(page()));
  const view = render(<RecordHistory {...props} />); open();
  await screen.findByText("Alex"); fireEvent.click(screen.getByText("Next"));
  await screen.findByText(/Page 2 of 2/);
  view.rerender(<RecordHistory {...props} lifecycleStatus="SUBMITTED" />);
  await screen.findByText(/Page 1 of 1/);
  expect(fetch.mock.calls[2][0]).toContain("page=0");
});

test("unsaved records do not offer history", () => {
  render(<RecordHistory {...props} entityId="new" />);
  expect(screen.queryByText(/^History/)).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
