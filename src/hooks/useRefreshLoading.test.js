import { act, renderHook } from "@testing-library/react";
import useRefreshLoading from "./useRefreshLoading";

test("same-view refresh keeps content visible while request guards remain active", () => {
  const { result, rerender } = renderHook(({ scope }) => useRefreshLoading(true, scope), { initialProps: { scope: "project-1" } });
  expect(result.current[0]).toBe(true); expect(result.current[2]).toBe(true);
  act(() => result.current[1](false));
  act(() => result.current[1](true));
  expect(result.current[0]).toBe(true); expect(result.current[2]).toBe(false);
  rerender({ scope: "project-2" });
  expect(result.current[0]).toBe(true); expect(result.current[2]).toBe(true);
  act(() => result.current[1](true)); act(() => result.current[1](false));
  expect(result.current[0]).toBe(false); expect(result.current[2]).toBe(false);
});
