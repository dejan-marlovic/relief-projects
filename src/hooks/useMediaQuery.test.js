import { act, renderHook } from "@testing-library/react";
import useMediaQuery from "./useMediaQuery";
test("updates on viewport changes and removes the listener", () => {
  let listener;
  const media = { matches: false, addEventListener: jest.fn((event, fn) => { listener = fn; }), removeEventListener: jest.fn() };
  window.matchMedia = jest.fn(() => media);
  const { result, unmount } = renderHook(() => useMediaQuery("(max-width: 700px)"));
  expect(result.current).toBe(false);
  act(() => { media.matches = true; listener(); });
  expect(result.current).toBe(true);
  unmount(); expect(media.removeEventListener).toHaveBeenCalledWith("change", listener);
  delete window.matchMedia;
});
