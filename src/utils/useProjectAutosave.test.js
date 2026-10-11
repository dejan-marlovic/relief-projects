import { act, renderHook, waitFor } from "@testing-library/react";
import useProjectAutosave, { validateProjectDates } from "./useProjectAutosave";

const initial = { id: 1, projectName: "Water", projectCode: "W1", projectDescription: "Original", projectNameSv: null, approved: "Yes", projectStart: "2026-11-01T09:00", projectEnd: "2027-04-30T17:00" };
function setup(extra = {}) {
  let saved = { ...initial };
  const fetch = jest.fn(async (url, options = {}) => {
    if (options.method === "PUT") saved = { ...saved, ...JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ...saved }) };
  });
  const onSaved = jest.fn();
  const view = renderHook(({ id = 1 } = {}) => useProjectAutosave({ projectId: id, authFetch: fetch, enabled: true, onSaved, ...extra }));
  return { ...view, fetch, onSaved, changeSaved: value => { saved = { ...saved, ...value }; } };
}
test("debounces typing, preserves unrelated fresh values and excludes approval", async () => {
  jest.useFakeTimers();
  try {
    const { result, fetch, changeSaved } = setup();
    act(() => result.current.edit({ projectName: "New" }, initial));
    act(() => result.current.edit({ projectName: "New name" }, initial));
    changeSaved({ projectCode: "Changed elsewhere" });
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(900); });
    const writes = fetch.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(writes).toHaveLength(1);
    const payload = JSON.parse(writes[0][1].body);
    expect(payload.projectCode).toBe("Changed elsewhere");
    expect(payload.projectName).toBe("New name");
    expect(payload).not.toHaveProperty("approved");
    expect(payload).not.toHaveProperty("projectNameSv");
    expect(result.current.message).toBe("Saved");
    expect(result.current.dirty).toBe(false);
  } finally { jest.useRealTimers(); }
});
test("conflicting field changes require explicit review before overwrite", async () => {
  const { result, fetch, changeSaved } = setup();
  act(() => result.current.edit({ projectName: "Mine" }, initial));
  changeSaved({ projectName: "Theirs" });
  await act(async () => result.current.flush());
  expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  expect(result.current.conflicts).toEqual({ projectName: "Theirs" });
  expect(result.current.dirty).toBe(true);
  await act(async () => result.current.acceptConflicts());
  await waitFor(() => expect(result.current.message).toBe("Saved"));
});
test("typing during a save remains queued and is saved after the first write", async () => {
  jest.useFakeTimers();
  try {
    const { result, fetch } = setup();
    let finish;
    fetch.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => initial }); }));
    act(() => result.current.edit({ projectName: "First" }, initial));
    let saving;
    await act(async () => { saving = result.current.flush(); await Promise.resolve(); });
    act(() => result.current.edit({ projectDescription: "Second edit" }, initial));
    await act(async () => { finish(); await saving; });
    expect(result.current.dirty).toBe(true);
    await act(async () => { jest.advanceTimersByTime(900); });
    expect(fetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(2);
    expect(result.current.dirty).toBe(false);
  } finally { jest.useRealTimers(); }
});
test("invalid date pairs wait for correction without a write", async () => {
  const { result, fetch } = setup({ validate: validateProjectDates });
  act(() => result.current.edit({ projectStart: "2028-01-01T09:00" }, initial));
  await act(async () => result.current.flush());
  expect(result.current.error).toMatch(/end date/);
  expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  act(() => result.current.edit({ projectStart: "2027-01-01T09:00" }, initial));
  await act(async () => result.current.flush());
  expect(result.current.message).toBe("Saved");
});
test("failed read retains changes and retries only on request", async () => {
  const { result, fetch } = setup();
  fetch.mockRejectedValueOnce(new Error("Offline"));
  act(() => result.current.edit({ projectName: "Mine" }, initial));
  await act(async () => result.current.flush());
  expect(result.current.dirty).toBe(true);
  expect(result.current.error).toMatch(/Offline/);
  await act(async () => result.current.retry());
  await waitFor(() => expect(result.current.message).toBe("Saved"));
});
test("switching projects cancels a pending debounce", async () => {
  jest.useFakeTimers();
  try {
    const { result, rerender, fetch } = setup();
    act(() => result.current.edit({ projectName: "Old project edit" }, initial));
    rerender({ id: 2 });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);
  } finally { jest.useRealTimers(); }
});
test("read-only users never autosave", async () => {
  const { result, fetch } = setup({ enabled: false });
  act(() => result.current.edit({ projectName: "Mine" }, initial));
  await act(async () => result.current.flush());
  expect(fetch).not.toHaveBeenCalled();
});

test("parallel editors retain both changes by serialising their fresh reads", async () => {
  let saved = { ...initial };
  const fetch = jest.fn(async (url, options = {}) => {
    if (options.method === "PUT") saved = { ...saved, ...JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ...saved }) };
  });
  const { result: first } = renderHook(() => useProjectAutosave({ projectId: 1, authFetch: fetch, enabled: true, onSaved: () => {} }));
  const { result: second } = renderHook(() => useProjectAutosave({ projectId: 1, authFetch: fetch, enabled: true, onSaved: () => {} }));
  act(() => {
    first.current.edit({ projectName: "New name" }, initial);
    second.current.edit({ projectNameSv: "Vatten" }, initial);
  });
  await act(async () => { await Promise.all([first.current.flush(), second.current.flush()]); });
  expect(saved.projectName).toBe("New name");
  expect(saved.projectNameSv).toBe("Vatten");
});

test("an uncertain save that already succeeded is not written a second time", async () => {
  const { result, fetch, changeSaved } = setup();
  fetch.mockImplementationOnce(async () => ({ ok: true, json: async () => initial }));
  fetch.mockImplementationOnce(async () => { changeSaved({ projectName: "Mine" }); throw new Error("Connection lost after write"); });
  act(() => result.current.edit({ projectName: "Mine" }, initial));
  await act(async () => result.current.flush());
  expect(result.current.dirty).toBe(true);
  await act(async () => result.current.retry());
  await waitFor(() => expect(result.current.message).toBe("Saved"));
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
});
