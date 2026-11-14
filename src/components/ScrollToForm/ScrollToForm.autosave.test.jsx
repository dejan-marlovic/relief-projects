import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ScrollToForm from "./ScrollToForm";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const tick = () => act(() => jest.advanceTimersByTime(1100));
function editor(value, onSubmit, options = {}) {
  return <ScrollToForm scrollKey="edit" autosave={{ value, ...options }} onSubmit={onSubmit}><input aria-label="Title" required defaultValue="Valid" /></ScrollToForm>;
}
test("does not save opening an editor; debounces edits and stops after acknowledgement", () => {
  const save = jest.fn(); const view = render(editor("original", save)); tick(); expect(save).not.toHaveBeenCalled();
  view.rerender(editor("first edit", save)); act(() => jest.advanceTimersByTime(600));
  view.rerender(editor("latest edit", save)); tick(); expect(save).toHaveBeenCalledTimes(1);
  view.rerender(editor("latest edit", save, { saved: "latest edit" })); tick(); expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveTextContent("Changes saved");
});
test("blocks invalid, busy and unreviewed drafts, then resumes after explicit recovery", () => {
  const save = jest.fn(); const view = render(editor("original", save));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "" } });
  view.rerender(editor("invalid", save)); tick(); expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Valid" } });
  view.rerender(editor("changed", save, { blocked: true, paused: true })); tick(); expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("paused");
  view.rerender(editor("changed", save, { blocked: false })); tick(); expect(save).toHaveBeenCalledTimes(1);
});
test("explicit decision forms never submit on a timer", () => {
  const save = jest.fn(); render(<ScrollToForm onSubmit={save}><input aria-label="Reason" /></ScrollToForm>);
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Approve" } }); tick(); expect(save).not.toHaveBeenCalled();
});
