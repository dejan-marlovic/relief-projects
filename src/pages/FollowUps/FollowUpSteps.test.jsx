import { fireEvent, render, screen } from "@testing-library/react";
import FollowUpSteps, { FollowUpActivity } from "./FollowUpSteps";

const task = { id: 3, title: "Review distribution lists", description: "Sample the next distribution", status: "OPEN", dueDate: "2026-10-31", assignee: { displayName: "Alex" }, createdAt: "2026-10-01T09:00:00Z", createdBy: { username: "manager" }, updatedAt: "2026-10-02T09:00:00Z", updatedBy: { username: "reviewer" } };

test("follow-up sections expand locally and keep an edited action visible", () => {
  const view = render(<FollowUpSteps task={task} editing={false} />);
  const plan = screen.getByRole("button", { name: /Define the action/ });
  expect(plan).toHaveAttribute("aria-expanded", "false"); fireEvent.click(plan);
  expect(screen.getByText(task.description)).toBeVisible();
  view.rerender(<FollowUpSteps task={task} editing editor={<p>Unsaved action</p>} />);
  expect(plan).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: /Track and complete/ }));
  expect(screen.getByText("Unsaved action")).toBeVisible();
});

test("activity displays only supplied attribution and does not invent earlier cycles", () => {
  const view = render(<FollowUpActivity task={{ ...task, status: "COMPLETED", completedAt: "2026-10-02T09:00:00Z", completedBy: { username: "reviewer" } }} />);
  expect(screen.getByText("Current completion recorded")).toBeInTheDocument();
  expect(screen.getByText(/earlier edits and completion cycles are not retained/)).toBeInTheDocument();
  view.rerender(<FollowUpActivity task={task} />);
  expect(screen.queryByText("Current completion recorded")).not.toBeInTheDocument();
  expect(screen.queryByText(/Reopened/)).not.toBeInTheDocument();
});
