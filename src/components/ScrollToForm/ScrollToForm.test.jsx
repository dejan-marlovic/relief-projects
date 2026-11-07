import React from "react";
import { render, screen } from "@testing-library/react";
import ScrollToForm from "./ScrollToForm";

afterEach(() => jest.restoreAllMocks());

test("focuses an available field once on opening, not on edits; scrolls again for another action", () => {
  const original = Element.prototype.scrollIntoView;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  try {
    const view = action => <ScrollToForm scrollKey={action}><input disabled /><input aria-label="Title" defaultValue="Risk" /></ScrollToForm>;
    const { rerender } = render(view("edit"));
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    rerender(view("edit"));
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(view("close"));
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally { Element.prototype.scrollIntoView = original; }
});

test("respects reduced motion and focuses the form when no fields are ready", () => {
  const original = Element.prototype.scrollIntoView;
  const media = window.matchMedia;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  window.matchMedia = () => ({ matches: true });
  try {
    render(<ScrollToForm aria-label="Loading editor"><p>Loading</p></ScrollToForm>);
    expect(document.activeElement).toBe(screen.getByRole("form", { name: "Loading editor" }));
    expect(scroll).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  } finally { Element.prototype.scrollIntoView = original; window.matchMedia = media; }
});
