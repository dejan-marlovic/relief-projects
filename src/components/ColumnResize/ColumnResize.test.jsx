import React, { useRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ColumnResize, { useColumnWidths, fitActionColumn } from "./ColumnResize";

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


test("fits visible action controls and ignores hidden controls", () => {
  const table = document.createElement('div');
  table.innerHTML = '<div><div data-financial-row-actions="true"><input type="checkbox" /><button>Edit</button><button>Delete</button></div></div>';
  const controls = [...table.querySelectorAll('input,button')];
  controls.forEach(control => {
    control.getClientRects = () => [{}];
    control.getBoundingClientRect = () => ({ width: 34 });
  });
  expect(fitActionColumn(table)).toBe(142);
  controls[1].getClientRects = () => [];
  controls[2].getClientRects = () => [];
  expect(fitActionColumn(table)).toBe(110);
});

test("automatic Actions width can be overridden, persisted and reset to fit", async () => {
  localStorage.setItem('table-column-widths:v1:fit', '[190,200]');
  function Fitted() {
    const ref = useRef(null);
    const { widths, resize, reset, fittedDefaults } = useColumnWidths('fit', [190, 200], { tableRef: ref });
    return <div ref={ref}><ColumnResize label="Actions" width={widths[0]} defaultWidth={fittedDefaults[0]} onResize={width => resize(0, width)} onReset={() => reset(0)} /></div>;
  }
  const first = render(<Fitted />);
  let handle = screen.getByRole('separator');
  expect(handle).toHaveAttribute('aria-valuenow', '110');
  fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
  expect(handle).toHaveAttribute('aria-valuenow', '160');
  first.unmount();
  render(<Fitted />);
  handle = screen.getByRole('separator');
  expect(handle).toHaveAttribute('aria-valuenow', '160');
  fireEvent.keyDown(handle, { key: 'Home' });
  await waitFor(() => expect(handle).toHaveAttribute('aria-valuenow', '110'));
});
