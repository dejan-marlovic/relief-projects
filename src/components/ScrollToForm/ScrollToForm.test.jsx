import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ScrollToForm from "./ScrollToForm";

afterEach(() => jest.restoreAllMocks());

test("first opening still scrolls after StrictMode effect cleanup", async () => {
  const original = Element.prototype.scrollIntoView;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  try {
    render(<React.StrictMode><ScrollToForm scrollKey="response"><input aria-label="Response" /></ScrollToForm></React.StrictMode>);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
  } finally { Element.prototype.scrollIntoView = original; }
});

test("confirmed autosave does not scroll or steal focus when creation becomes editing", async () => {
  const original = Element.prototype.scrollIntoView;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  try {
    const view = (action, saved) => <ScrollToForm scrollKey={action} autosave={{ value: "draft", saved, blocked: true }}><input aria-label="First" /><textarea aria-label="Notes" /></ScrollToForm>;
    const { rerender } = render(view("create"));
    screen.getByLabelText("Notes").focus();
    scroll.mockClear();
    rerender(view("edit", "draft"));
    expect(scroll).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Notes")).toHaveFocus();
  } finally { Element.prototype.scrollIntoView = original; }
});

test("focuses an available field once on opening, not on edits; scrolls again for another action", async () => {
  const original = Element.prototype.scrollIntoView;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  try {
    const view = action => <ScrollToForm scrollKey={action}><input disabled /><input aria-label="Title" defaultValue="Risk" /></ScrollToForm>;
    const { rerender } = render(view("edit"));
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ behavior: "auto", block: "start" }));
    rerender(view("edit"));
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    rerender(view("close"));
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
  } finally { Element.prototype.scrollIntoView = original; }
});

test("respects reduced motion and focuses the form when no fields are ready", async () => {
  const original = Element.prototype.scrollIntoView;
  const media = window.matchMedia;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  window.matchMedia = () => ({ matches: true });
  try {
    render(<ScrollToForm aria-label="Loading editor"><p>Loading</p></ScrollToForm>);
    expect(document.activeElement).toBe(screen.getByRole("form", { name: "Loading editor" }));
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ behavior: "auto", block: "start" }));
  } finally { Element.prototype.scrollIntoView = original; window.matchMedia = media; }
});
