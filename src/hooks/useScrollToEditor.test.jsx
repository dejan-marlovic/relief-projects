import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import useScrollToEditor from "./useScrollToEditor";

function Editor({ open, external }) {
  const ref = useScrollToEditor(open, external);
  return <section ref={ref}>{open ? <input aria-label="Name" /> : <p>Read only</p>}</section>;
}

test("reveals only when editing opens, preserving the parent row ref", () => {
  const original = Element.prototype.scrollIntoView;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  try {
    const external = createRef();
    const { rerender } = render(<Editor open={false} external={external} />);
    expect(scroll).not.toHaveBeenCalled();
    rerender(<Editor open external={external} />);
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
    expect(external.current.tagName).toBe("SECTION");
    rerender(<Editor open external={external} />);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<Editor open={false} external={external} />);
    rerender(<Editor open external={external} />);
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally { Element.prototype.scrollIntoView = original; }
});


test("record opening keys reveal a new selection without scrolling on ordinary rerenders", () => {
  const originalScroll = Element.prototype.scrollIntoView;
  const originalMedia = window.matchMedia;
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  window.matchMedia = jest.fn(() => ({ matches: true }));
  try {
    const { rerender } = render(<Editor open={1} />);
    expect(scroll).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
    rerender(<Editor open={1} />);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<Editor open={2} />);
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally {
    Element.prototype.scrollIntoView = originalScroll;
    window.matchMedia = originalMedia;
  }
});
