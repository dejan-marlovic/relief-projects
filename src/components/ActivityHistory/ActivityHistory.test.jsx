import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HistoryTimeline, HistoryEntry, SnapshotHistoryEntry, HistoryPagination } from "./ActivityHistory";

const Snapshot = ({ value }) => <p>{value?.title || "No earlier state"}</p>;
test("entries start collapsed, preserve captured changes and retain expansion on rerender", () => {
  const event = { id: 9, action: "UPDATE", revision: 2, occurredAt: "2026-11-07T10:00:00Z", actor: { username: "historic.user", userId: 5 }, before: {title: "Before title"}, after: {title: "<b>After title</b>"} };
  const view = <HistoryTimeline><SnapshotHistoryEntry event={event} title="Update" Snapshot={Snapshot} /></HistoryTimeline>;
  const { rerender } = render(view);
  const entry = screen.getByText("Details changed").closest("details");
  expect(entry).not.toHaveAttribute("open");
  expect(screen.getByText("historic.user")).toBeVisible();
  fireEvent.click(screen.getByText("Details changed"));
  expect(screen.getAllByText("<b>After title</b>")[0]).toBeVisible();
  expect(entry.querySelector("b b")).toBeNull();
  const full = screen.getByText("Full recorded details and references");
  expect(full.closest("details")).not.toHaveAttribute("open");
  fireEvent.click(full);
  expect(screen.getByText(/Entry #9/)).toBeVisible();
  rerender(view);
  expect(entry).toHaveAttribute("open");
});
test("creation and cleared values are distinct; no arbitrary sensitive fields are summarised", () => {
  render(<HistoryTimeline><SnapshotHistoryEntry title="Create" event={{ id: 1, action: "CREATE", after: {title: "Original", pinCode: "secret-value"} }} Snapshot={Snapshot} /><SnapshotHistoryEntry title="Update" event={{ id: 2, before: {description: "Old"}, after: {description: null} }} Snapshot={Snapshot} /></HistoryTimeline>);
  fireEvent.click(screen.getByText("Created"));
  expect(screen.getByText("Initial value:")).toBeVisible();
  expect(screen.queryByText("secret-value")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Update"));
  expect(screen.getByText("Not recorded")).toBeVisible();
});
test("pagination disables unavailable directions and offers a route back to latest", () => {
  const onPage = jest.fn();
  const { rerender } = render(<HistoryPagination page={0} totalPages={3} totalElements={42} onPage={onPage} />);
  expect(screen.getByRole("button", {name:"Newer history"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button", {name:"Older history"}));
  expect(onPage).toHaveBeenCalledWith(1);
  rerender(<HistoryPagination page={2} totalPages={3} totalElements={42} onPage={onPage} />);
  expect(screen.getByRole("button", {name:"Older history"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button", {name:"Latest history"}));
  expect(onPage).toHaveBeenLastCalledWith(0);
});
test("specialised audit content and references remain separate disclosures", () => {
  render(<HistoryTimeline><HistoryEntry title="Signature changed" context="Payment order #7" references={<p>Account #7</p>}><p>Values not retained</p></HistoryEntry></HistoryTimeline>);
  const row = screen.getByRole("listitem");
  expect(screen.getByText("Payment order #7")).toBeVisible();
  fireEvent.click(within(row).getByText("Signature changed"));
  expect(within(row).getByText("Values not retained")).toBeVisible();
  expect(within(row).getByText("Account #7")).not.toBeVisible();
});

test("nested assessment fields produce readable changes while captured context stays in full details", () => {
  render(<HistoryTimeline><SnapshotHistoryEntry event={{ id: 3, action: "UPDATE", before: {fields: {capacitySummary: "Limited"}}, after: {fields: {capacitySummary: "Improved"}} }} Snapshot={Snapshot} /></HistoryTimeline>);
  fireEvent.click(screen.getByText("Details changed"));
  expect(screen.getByText("Limited")).toBeVisible();
  expect(screen.getByText("Improved")).toBeVisible();
});
