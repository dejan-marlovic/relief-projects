import { act, renderHook, waitFor } from "@testing-library/react";
import useRecordAutosave from "./useRecordAutosave";

function setup(overrides = {}) {
  let stored = { name: "Original", city: "Original city" };
  const read = jest.fn(async () => ({ ...stored }));
  const write = jest.fn(async (fresh, changes) => { stored = { ...fresh, ...changes }; });
  const onSaved = jest.fn();
  const props = { recordKey: "test-record", enabled: true, read, write, onSaved, ...overrides };
  const view = renderHook(p => useRecordAutosave(p), { initialProps: props });
  return { ...view, read, write, onSaved, props, setStored: value => { stored = value; } };
}

test("merges only edited fields over fresh values and confirms persistence", async () => {
  const h = setup();
  h.setStored({ name: "Original", city: "Changed elsewhere" });
  act(() => h.result.current.edit({ name: "New" }, { name: "Original" }));
  await act(async () => h.result.current.flush());
  expect(h.write).toHaveBeenCalledWith({ name: "Original", city: "Changed elsewhere" }, { name: "New" });
  expect(h.result.current.message).toBe("Saved");
  expect(h.result.current.dirty).toBe(false);
});

test("conflicting saved values require explicit review", async () => {
  const h = setup();
  h.setStored({ name: "Another person's edit" });
  act(() => h.result.current.edit({ name: "Mine" }, { name: "Original" }));
  await act(async () => h.result.current.flush());
  expect(h.write).not.toHaveBeenCalled();
  expect(h.result.current.conflicts).toEqual({ name: "Another person's edit" });
  await act(async () => h.result.current.acceptConflicts());
  await waitFor(() => expect(h.result.current.message).toBe("Saved"));
});

test("uncertain writes can be retried without writing twice", async () => {
  const h = setup();
  h.read.mockImplementationOnce(async () => ({ name: "Original" })).mockImplementationOnce(async () => { throw new Error("Offline"); });
  act(() => h.result.current.edit({ name: "Mine" }, { name: "Original" }));
  await act(async () => h.result.current.flush());
  expect(h.result.current.dirty).toBe(true);
  await act(async () => h.result.current.retry());
  await waitFor(() => expect(h.result.current.message).toBe("Saved"));
  expect(h.write).toHaveBeenCalledTimes(1);
});

test("typing during a write is retained and saved in a subsequent pass", async () => {
  let finish;
  const h = setup();
  h.write.mockImplementationOnce(async () => { await new Promise(resolve => { finish = resolve; }); h.setStored({ name: "First" }); });
  act(() => h.result.current.edit({ name: "First" }, { name: "Original" }));
  let saving;
  act(() => { saving = h.result.current.flush(); });
  await waitFor(() => expect(finish).toBeDefined());
  act(() => h.result.current.edit({ name: "Second" }, { name: "Original" }));
  await act(async () => { finish(); await saving; });
  expect(h.onSaved).toHaveBeenLastCalledWith({ name: "First" }, { name: "First" }, { name: "Second" });
  await act(async () => h.result.current.flush());
  expect(h.result.current.dirty).toBe(false);
  expect(h.write).toHaveBeenCalledTimes(2);
});

test("switching records cancels a queued save; read-only edits never write", async () => {
  jest.useFakeTimers();
  const h = setup();
  act(() => h.result.current.edit({ name: "Mine" }, { name: "Original" }));
  h.rerender({ ...h.props, recordKey: "another-record", enabled: false });
  act(() => h.result.current.edit({ name: "No" }, {}));
  await act(async () => jest.advanceTimersByTime(1000));
  expect(h.write).not.toHaveBeenCalled();
  h.unmount();
  jest.useRealTimers();
});
