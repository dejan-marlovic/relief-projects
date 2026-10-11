import { useEffect, useRef, useState } from "react";
import { withProjectSave } from "./useProjectAutosave";

const equal = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "") || (!Array.isArray(a) && !Array.isArray(b) && String(a ?? "") === String(b ?? ""));

export default function useRecordAutosave({ recordKey, read, write, enabled, onSaved, validate = () => "" }) {
  const [state, setState] = useState({ dirty: false, busy: false, message: "", error: "", conflicts: null });
  const options = useRef(); options.current = { read, write, enabled, onSaved, validate };
  const session = useRef();
  useEffect(() => {
    const current = { id: recordKey, edits: {}, timer: null, running: false, active: true, stopped: false };
    session.current = current;
    setState({ dirty: false, busy: false, message: "", error: "", conflicts: null });
    return () => { current.active = false; clearTimeout(current.timer); };
  }, [recordKey]);

  async function flush() {
    const current = session.current;
    if (!current?.active || current.running || current.stopped || !options.current.enabled || !Object.keys(current.edits).length) return;
    clearTimeout(current.timer);
    current.running = true;
    const sent = { ...current.edits };
    const changes = Object.fromEntries(Object.entries(sent).map(([key, edit]) => [key, edit.value]));
    setState(s => ({ ...s, busy: true, message: "Saving…", error: "", conflicts: null }));
    let completed = false;
    try {
      await withProjectSave(current.id, async () => {
        if (!current.active) return;
        const read = () => options.current.read();
        const fresh = await read();
        if (!current.active) return;
        const conflicts = Object.keys(sent).filter(key => !equal(fresh[key], sent[key].before) && !equal(fresh[key], changes[key]));
        if (conflicts.length) {
          const error = new Error("Saved values changed elsewhere. Review them before retrying; your edits are still here.");
          error.conflicts = Object.fromEntries(conflicts.map(key => [key, fresh[key]]));
          throw error;
        }
        const invalid = options.current.validate({ ...fresh, ...changes }, changes);
        if (invalid) { const error = new Error(invalid); error.validation = true; throw error; }
        if (!Object.keys(changes).every(key => equal(fresh[key], changes[key]))) {
          await options.current.write(fresh, changes);
        }
        const saved = await read();
        if (!Object.keys(changes).every(key => equal(saved[key], changes[key]))) throw new Error("The saved values could not be confirmed. Review and retry.");
        if (!current.active) return;
        for (const key of Object.keys(sent)) {
          if (current.edits[key] === sent[key]) delete current.edits[key];
          else if (current.edits[key]) current.edits[key].before = saved[key];
        }
        options.current.onSaved(saved, changes, Object.fromEntries(Object.entries(current.edits).map(([key, edit]) => [key, edit.value])));
      });
      completed = true;
      if (current.active) setState({ dirty: !!Object.keys(current.edits).length, busy: false, message: Object.keys(current.edits).length ? "Changes waiting to save…" : "Saved", error: "", conflicts: null });
    } catch (error) {
      current.stopped = !error.validation;
      if (current.active) setState({ dirty: true, busy: false, message: "", error: `${error.message} Your unsaved changes are retained.`, conflicts: error.conflicts || null });
    } finally {
      current.running = false;
      if (current.active && !current.stopped && Object.keys(current.edits).length) {
        // Validation errors wait for a new edit rather than retrying forever.
        if (completed || Object.keys(current.edits).some(key => current.edits[key] !== sent[key])) current.timer = setTimeout(flush, 900);
      }
    }
  }
  function edit(changes, original, immediate = false) {
    const current = session.current;
    if (!current?.active || !options.current.enabled) return;
    for (const [key, value] of Object.entries(changes)) current.edits[key] = { before: current.edits[key] ? current.edits[key].before : original?.[key], value };
    clearTimeout(current.timer);
    setState(s => ({ ...s, dirty: true, message: s.busy ? "Saving…" : "Changes waiting to save…" }));
    if (!current.stopped) current.timer = setTimeout(flush, immediate ? 0 : 900);
  }
  function retry() { session.current.stopped = false; flush(); }
  function acceptConflicts() {
    for (const [key, value] of Object.entries(state.conflicts || {})) if (session.current.edits[key]) session.current.edits[key].before = value;
    retry();
  }
  return { ...state, edit, flush, retry, acceptConflicts };
}
