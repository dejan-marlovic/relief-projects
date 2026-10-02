import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { WorkflowStep } from "./Workflow";

test("collapsing a step retains its draft and explains it while collapsed", () => {
  function Example() {
    const [draft, setDraft] = useState("");
    return <WorkflowStep number={1} title="Prepare" description="Describe the work before submission."><label>Draft<input value={draft} onChange={event => setDraft(event.target.value)} /></label></WorkflowStep>;
  }
  render(<Example />);
  const input = screen.getByRole("textbox", { name: "Draft" });
  fireEvent.change(input, { target: { value: "Unsaved work" } });
  const toggle = screen.getByRole("button", { name: /Prepare/ });
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.getByText("Describe the work before submission.")).toBeVisible();
  fireEvent.click(toggle);
  expect(screen.getByRole("textbox")).toHaveValue("Unsaved work");
});

test("steps have distinct controls and can keep required content open", () => {
  render(<><WorkflowStep number={1} title="First" description="First step" keepOpen><p>Required content</p></WorkflowStep><WorkflowStep number={2} title="Second" description="Second step"><p>Other content</p></WorkflowStep></>);
  const first = screen.getByRole("button", { name: /First/ });
  const second = screen.getByRole("button", { name: /Second/ });
  expect(first).toBeDisabled();
  expect(first.getAttribute("aria-controls")).not.toBe(second.getAttribute("aria-controls"));
  fireEvent.click(second);
  expect(screen.getByText("Required content")).toBeVisible();
});
