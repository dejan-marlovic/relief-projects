import { fireEvent, render, screen } from "@testing-library/react";
import FollowUpDetails from "./FollowUpDetails";

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
  fireEvent.click(toggle);
  expect(screen.getByText(task.description)).not.toBeVisible();
});
