import { fireEvent, render, screen } from "@testing-library/react";
import FollowUpDetails, { FollowUpActivity } from "./FollowUpDetails";

const task = { id: 3, title: "Review distribution lists", description: "Sample the next distribution", status: "OPEN", dueDate: "2026-10-31", assignee: { displayName: "Alex" }, createdAt: "2026-10-01T09:00:00Z", createdBy: { username: "manager" }, updatedAt: "2026-10-02T09:00:00Z", updatedBy: { username: "reviewer" } };

test("details disclosure keeps description and recorded activity together", () => {
  render(<FollowUpDetails task={task} />);
  const toggle = screen.getByRole("button", { name: "Details & activity" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText(task.description)).not.toBeVisible();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(task.description)).toBeVisible();
  expect(screen.getByText("Alex")).toBeVisible();
  expect(screen.getByText("2026-10-31")).toBeVisible();
  expect(screen.getByRole("region", { name: "Recorded follow-up activity" })).toBeVisible();
  fireEvent.click(toggle);
  expect(screen.getByText(task.description)).not.toBeVisible();
});

test("activity displays only supplied attribution and does not invent earlier cycles", () => {
  const view = render(<FollowUpActivity task={{ ...task, status: "COMPLETED", completedAt: "2026-10-02T09:00:00Z", completedBy: { username: "reviewer" } }} />);
  expect(screen.getByText("Current completion recorded")).toBeInTheDocument();
  expect(screen.getByText(/earlier edits and completion cycles are not retained/)).toBeInTheDocument();
  view.rerender(<FollowUpActivity task={task} />);
  expect(screen.queryByText("Current completion recorded")).not.toBeInTheDocument();
  expect(screen.queryByText(/Reopened/)).not.toBeInTheDocument();
});
