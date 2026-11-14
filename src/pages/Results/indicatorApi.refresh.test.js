import { act, renderHook, waitFor } from "@testing-library/react";
import { useIndicatorRead } from "./indicatorApi";
const response = data => ({ ok: true, text: async () => JSON.stringify(data) });
test("retains same-query content during refresh, but clears it on scope change or failure", async () => {
  let finish;
  const fetcher = jest.fn().mockResolvedValueOnce(response({ name: "First project" })).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ url, refresh }) => useIndicatorRead(fetcher, url, refresh), { initialProps: { url: "/first", refresh: 0 } });
  await waitFor(() => expect(result.current.data).toEqual({ name: "First project" }));
  rerender({ url: "/first", refresh: 1 });
  expect(result.current.loading).toBe(true); expect(result.current.data.name).toBe("First project");
  await act(async () => finish(response({ name: "Updated" })));
  expect(result.current.data.name).toBe("Updated");
  rerender({ url: "/second", refresh: 1 });
  expect(result.current.data).toBeNull();
  await act(async () => finish({ ok: false, status: 403, text: async () => JSON.stringify({ message: "Access denied" }) }));
  expect(result.current.data).toBeNull(); expect(result.current.error).toBe("Access denied");
});
