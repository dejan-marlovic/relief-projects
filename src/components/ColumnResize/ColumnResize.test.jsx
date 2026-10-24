import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ColumnResize, { useColumnWidths } from "./ColumnResize";

const defaults = [120, 200];
function Example() {
  const { widths, resize } = useColumnWidths("test", defaults);
  return <ColumnResize label="Description" width={widths[1]} defaultWidth={200} onResize={width => resize(1, width)} />;
}
beforeEach(() => localStorage.clear());
test("keyboard resizing is bounded, persisted and resettable", () => {
  const first = render(<Example />);
  let handle = screen.getByRole("separator", { name: "Resize Description column" });
  fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
  expect(handle).toHaveAttribute("aria-valuenow", "250");
  first.unmount();
  render(<Example />);
  handle = screen.getByRole("separator");
  expect(handle).toHaveAttribute("aria-valuenow", "250");
  for (let i = 0; i < 10; i++) fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
  expect(handle).toHaveAttribute("aria-valuenow", "80");
  fireEvent.doubleClick(handle);
  expect(handle).toHaveAttribute("aria-valuenow", "200");
});
test("invalid stored widths cannot break the grid", () => {
  localStorage.setItem("table-column-widths:v1:test", '[120,"bad"]');
  render(<Example />);
  expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "200");
});
test("drag uses pointer capture and stops changing width after release", () => {
  const previous = window.PointerEvent;
  window.PointerEvent = MouseEvent;
  try {
    render(<Example />);
    const handle = screen.getByRole("separator");
    handle.setPointerCapture = jest.fn();
    handle.hasPointerCapture = () => true;
    handle.releasePointerCapture = jest.fn();
    fireEvent.pointerDown(handle, { button: 0, clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 220 });
    expect(handle).toHaveAttribute("aria-valuenow", "320");
    fireEvent.pointerUp(handle);
    fireEvent.pointerMove(handle, { clientX: 300 });
    expect(handle).toHaveAttribute("aria-valuenow", "320");
  } finally { window.PointerEvent = previous; }
});
