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
