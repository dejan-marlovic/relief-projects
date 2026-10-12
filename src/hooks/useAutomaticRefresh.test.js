import { act, renderHook } from "@testing-library/react";
import useAutomaticRefresh from "./useAutomaticRefresh";

test("refreshes visible idle views, pauses for drafts and stops on unmount", () => {
  jest.useFakeTimers();
  const refresh = jest.fn();
  const view = renderHook(({ blocked }) => useAutomaticRefresh(refresh, blocked), { initialProps: { blocked: false } });
  act(() => window.dispatchEvent(new Event("focus")));
  expect(refresh).toHaveBeenCalledTimes(1);
  view.rerender({ blocked: true });
  act(() => { jest.advanceTimersByTime(30000); window.dispatchEvent(new Event("online")); });
  expect(refresh).toHaveBeenCalledTimes(1);
  view.rerender({ blocked: false });
  act(() => jest.advanceTimersByTime(30000));
  expect(refresh).toHaveBeenCalledTimes(2);
  view.unmount();
  act(() => { jest.advanceTimersByTime(30000); window.dispatchEvent(new Event("focus")); });
  expect(refresh).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
