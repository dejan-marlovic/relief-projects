import { fireEvent, render, screen } from "@testing-library/react";
import useSwipeNavigation from "./useSwipeNavigation";
function Harness({ enabled = true, onSwipe }) {
  const handlers = useSwipeNavigation({ enabled, route: "/project", onSwipe });
  return <main data-testid="surface" {...handlers}><div data-testid="text">Text</div><input aria-label="Input" /><div data-testid="scroll" style={{ overflowX: "auto" }}>Table</div></main>;
}
function swipe(target, { x = 300, end = 100, y = 100, endY = 100, move = false } = {}) {
  fireEvent.touchStart(target, { touches: [{ identifier: 1, clientX: x, clientY: y }] });
  if (move) fireEvent.touchMove(target, { touches: [{ identifier: 1, clientX: end, clientY: endY }] });
  fireEvent.touchEnd(target, { touches: [], changedTouches: [{ identifier: 1, clientX: end, clientY: endY }] });
}
test("horizontal swipes navigate in standard directions", () => {
  const onSwipe = jest.fn(); render(<Harness onSwipe={onSwipe} />);
  swipe(screen.getByTestId("text")); swipe(screen.getByTestId("text"), { x: 100, end: 300 });
  expect(onSwipe.mock.calls).toEqual([[1], [-1]]);
});
test("ignores vertical scrolling, short gestures, controls and screen edges", () => {
  const onSwipe = jest.fn(); render(<Harness onSwipe={onSwipe} />);
  swipe(screen.getByTestId("text"), { endY: 180, move: true });
  swipe(screen.getByTestId("text"), { end: 270 });
  swipe(screen.getByLabelText("Input"));
  swipe(screen.getByTestId("text"), { x: 10, end: 200 });
  expect(onSwipe).not.toHaveBeenCalled();
});
test("preserves horizontal scrollers and desktop behaviour", () => {
  const onSwipe = jest.fn(); const view = render(<Harness onSwipe={onSwipe} />);
  const table = screen.getByTestId("scroll");
  Object.defineProperty(table, "scrollWidth", { value: 1000 });
  Object.defineProperty(table, "clientWidth", { value: 300 });
  swipe(table); expect(onSwipe).not.toHaveBeenCalled();
  view.rerender(<Harness enabled={false} onSwipe={onSwipe} />);
  swipe(screen.getByTestId("text")); expect(onSwipe).not.toHaveBeenCalled();
});
test("cancelled or multitouch gestures do not navigate", () => {
  const onSwipe = jest.fn(); render(<Harness onSwipe={onSwipe} />);
  const target = screen.getByTestId("text");
  fireEvent.touchStart(target, { touches: [{ identifier: 1, clientX: 300, clientY: 100 }] });
  fireEvent.touchCancel(target);
  fireEvent.touchEnd(target, { touches: [], changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 }] });
  fireEvent.touchStart(target, { touches: [{}, {}] });
  fireEvent.touchEnd(target, { touches: [], changedTouches: [] });
  expect(onSwipe).not.toHaveBeenCalled();
});
