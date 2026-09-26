import { act, renderHook } from "@testing-library/react";
import useTransientMessage from "./useTransientMessage";

afterEach(() => jest.useRealTimers());

test("success expires five seconds after the latest action, including repeated messages", () => {
  jest.useFakeTimers();
  const { result } = renderHook(() => useTransientMessage());
  act(() => result.current[1]("Saved."));
  act(() => jest.advanceTimersByTime(4000));
  act(() => result.current[1]("Saved."));
  act(() => jest.advanceTimersByTime(4000));
  expect(result.current[0]).toBe("Saved.");
  act(() => jest.advanceTimersByTime(1000));
  expect(result.current[0]).toBe("");
});

test("mixed feedback retains errors but expires successful messages", () => {
  jest.useFakeTimers();
  const { result } = renderHook(() => useTransientMessage("", value => value === "Saved."));
  act(() => result.current[1]("Request failed. Review the current state."));
  act(() => jest.advanceTimersByTime(10000));
  expect(result.current[0]).toContain("Request failed.");
  act(() => result.current[1]("Saved."));
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current[0]).toBe("");
});
