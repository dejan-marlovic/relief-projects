import React, { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FiTrash2 } from "react-icons/fi";
import ActionButton from "./ActionButton";
import RecordIcon from "../RecordIcon/RecordIcon";
import { OpenEditorState } from "../../context/OpenEditorState";

test("adds a decorative delete icon while retaining the name, class and native handler", () => {
  const onClick = jest.fn(), ref = createRef();
  render(<ActionButton ref={ref} className="existing" onClick={onClick}>Delete record</ActionButton>);
  const button = screen.getByRole("button", { name: "Delete record" });
  expect(ref.current).toBe(button);
  expect(button).toHaveClass("existing", "danger");
  expect(button.querySelectorAll("svg")).toHaveLength(1);
  expect(button.querySelector("svg").closest('[aria-hidden="true"]')).not.toBeNull();
  fireEvent.click(button); expect(onClick).toHaveBeenCalledTimes(1);
});
test("does not duplicate explicit icons or alter navigation labels", () => {
  render(<><ActionButton><FiTrash2 />Delete</ActionButton><ActionButton><RecordIcon type="close" />Close</ActionButton><ActionButton>← Previous page</ActionButton><ActionButton>Finance</ActionButton></>);
  expect(screen.getByRole("button", { name: "Delete" }).querySelectorAll("svg")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Close" }).querySelectorAll("svg")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "← Previous page" }).querySelector("svg")).toBeNull();
  expect(screen.getByRole("button", { name: "Finance" }).querySelector("svg")).toBeNull();
});
test("preserves disabled and form submission semantics", () => {
  const submit=jest.fn(event=>event.preventDefault());
  const { rerender }=render(<form onSubmit={submit}><ActionButton type="submit" disabled>Save</ActionButton></form>);
  fireEvent.click(screen.getByRole("button", { name: "Save" })); expect(submit).not.toHaveBeenCalled();
  rerender(<form onSubmit={submit}><ActionButton type="submit">Save</ActionButton></form>);
  fireEvent.click(screen.getByRole("button", { name: "Save" })); expect(submit).toHaveBeenCalledTimes(1);
});
test("updates icon and tone when a dynamic action changes", () => {
  const { rerender }=render(<ActionButton>Delete record</ActionButton>);
  rerender(<ActionButton>Restore record</ActionButton>);
  expect(screen.getByRole("button", { name: "Restore record" })).not.toHaveClass("danger");
  expect(screen.getByRole("button", { name: "Restore record" }).querySelectorAll("svg")).toHaveLength(1);
});
test("selected item names are not interpreted as commands", () => {
  render(<ActionButton aria-haspopup="dialog">Delete obsolete draft.pdf</ActionButton>);
  const button=screen.getByRole("button", { name: "Delete obsolete draft.pdf" });
  expect(button).not.toHaveClass("danger");
  expect(button.querySelector("svg")).toBeNull();
});
test("explains an editor lock without enabling the action, and removes the hint after closing", () => {
  const click=jest.fn();
  const { rerender }=render(<ActionButton disabled editorBlocked onClick={click}>Delete record</ActionButton>);
  const button=screen.getByRole("button", { name: "Delete record" });
  expect(button).toHaveAccessibleDescription(/Close the related form/);
  expect(button).toHaveAttribute("title", expect.stringContaining("Save or discard"));
  expect(screen.getByText(/Close the related form/)).toBeVisible();
  fireEvent.click(button); expect(click).not.toHaveBeenCalled();
  rerender(<ActionButton disabled editorBlocked={false} onClick={click}>Delete record</ActionButton>);
  expect(screen.getByRole("button", { name: "Delete record" })).not.toHaveAttribute("title");
  expect(screen.getByRole("button", { name: "Delete record" })).not.toHaveAttribute("aria-describedby");
});
test("a combined lock only cites an editor when one is registered", () => {
  const view=editors=><OpenEditorState.Provider value={{editors}}><ActionButton disabled editorBlocked="registered">Record review</ActionButton></OpenEditorState.Provider>;
  const {rerender}=render(view([]));
  expect(screen.getByRole("button")).not.toHaveAttribute("title");
  rerender(view([{name:"Management response"}]));
  expect(screen.getByRole("button")).toHaveAccessibleDescription(/Close the related form/);
});
test("an open record with an editor explains both closing steps", () => {
  render(<OpenEditorState.Provider value={{editors:[{name:"Response"}]}}><ActionButton disabled recordBlocked>Create finding or lesson</ActionButton></OpenEditorState.Provider>);
  expect(screen.getByRole("button")).toHaveAccessibleDescription(/Close the open editor, then close the record/);
});
