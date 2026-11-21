import React, { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpenEditorProvider, useOpenEditor } from "./OpenEditorContext";
import ScrollToForm from "../components/ScrollToForm/ScrollToForm";

function InlineEditor({ open }) {
  const ref = useRef(null);
  useOpenEditor(ref, open, "Transaction editor");
  return <section ref={ref}><input aria-label="Transaction description" /></section>;
}

test("notice remains for a saved open form, returns focus, and disappears when closed", () => {
  const original = Element.prototype.scrollIntoView;
  const scroll = jest.fn(); Element.prototype.scrollIntoView = scroll;
  const form = saved => <OpenEditorProvider><ScrollToForm aria-label="Management response" autosave={{ value: "same", saved }} onSubmit={jest.fn()}><input aria-label="Response" /></ScrollToForm></OpenEditorProvider>;
  try {
    const { rerender } = render(form(undefined));
    expect(screen.getByRole("complementary", { name: "Open editor notice" })).toHaveTextContent("Actions that depend on finishing this editor are paused");
    rerender(form("same"));
    fireEvent.click(screen.getByRole("button", { name: "Return to editor: Management response" }));
    expect(screen.getByLabelText("Response")).toHaveFocus();
    expect(scroll).toHaveBeenCalled();
    rerender(<OpenEditorProvider><p>Closed</p></OpenEditorProvider>);
    expect(screen.queryByRole("complementary", { name: "Open editor notice" })).not.toBeInTheDocument();
  } finally { Element.prototype.scrollIntoView = original; }
});

test("read-only details do not register as editors, and closing an inline editor clears the notice", () => {
  const view = open => <OpenEditorProvider><InlineEditor open={open} /></OpenEditorProvider>;
  const { rerender } = render(view(false));
  expect(screen.queryByText("Editor open")).not.toBeInTheDocument();
  rerender(view(true));
  expect(screen.getByRole("button", { name: "Return to editor: Transaction editor" })).toBeInTheDocument();
  rerender(view(false));
  expect(screen.queryByText("Editor open")).not.toBeInTheDocument();
});
