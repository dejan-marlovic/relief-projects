import { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../config/api";
import { projectMetadataPayload } from "./projectApproval";

// Both project editors use a full-record PUT. Serialise their fresh-read/write
// sequences so one editor cannot undo the other's save in this browser.
const queues = new Map();
export async function withProjectSave(id, work) {
  const previous = queues.get(String(id)) || Promise.resolve();
  const next = previous.catch(() => {}).then(work);
  queues.set(String(id), next);
  try { return await next; }
  finally { if (queues.get(String(id)) === next) queues.delete(String(id)); }
}
const equal = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "") || (!Array.isArray(a) && !Array.isArray(b) && String(a ?? "") === String(b ?? ""));

// Empty trailing caption slots added by the gallery are equivalent to omitted slots.
const fieldEqual = (key, a, b) => key === "projectCoverImageCaption"
  ? String(a ?? "").replace(/(\|\|\|)+$/, "") === String(b ?? "").replace(/(\|\|\|)+$/, "")
  : equal(a, b);

export function validateProjectDates(project) {
  for (const [start, end] of [["projectStart", "projectEnd"], ["projectStartRev", "projectEndRev"]]) {
    if (project[start] && project[end] && project[start] > project[end]) return "The end date must be on or after the start date. Your changes have not been saved.";
  }
  return "";
}

export default function useProjectAutosave({ projectId, authFetch, enabled, onSaved, validate = () => "" }) {
  const [state, setState] = useState({ dirty: false, busy: false, message: "", error: "", conflicts: null });
  const options = useRef(); options.current = { authFetch, enabled, onSaved, validate };
  const session = useRef();
  useEffect(() => {
    const current = { id: projectId, edits: {}, timer: null, running: false, active: true, stopped: false };
    session.current = current;
    setState({ dirty: false, busy: false, message: "", error: "", conflicts: null });
    return () => { current.active = false; clearTimeout(current.timer); };
  }, [projectId]);

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
        const url = `${BASE_URL}/api/projects/${current.id}`;
        const read = async () => {
          const response = await options.current.authFetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error("Could not read the latest saved project.");
          return response.json();
        };
        const fresh = await read();
        if (!current.active) return;
        const conflicts = Object.keys(sent).filter(key => !fieldEqual(key, fresh[key], sent[key].before) && !fieldEqual(key, fresh[key], changes[key]));
        // Captions are positional; never apply them against a changed image list.
        if (sent.projectCoverImageCaption && fresh.projectCoverImage !== sent.projectCoverImageCaption.images) conflicts.push("projectCoverImage");
        if (conflicts.length) {
          const error = new Error("Saved values changed elsewhere. Review them before retrying; your edits are still here.");
          error.conflicts = Object.fromEntries(conflicts.map(key => [key, fresh[key]]));
          throw error;
        }
        const invalid = options.current.validate({ ...fresh, ...changes }, changes);
        if (invalid) { const error = new Error(invalid); error.validation = true; throw error; }
        if (!Object.keys(changes).every(key => fieldEqual(key, fresh[key], changes[key]))) {
          const response = await options.current.authFetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, silentSuccess: true, body: JSON.stringify({ ...projectMetadataPayload(fresh), ...changes }) });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error([body.message || "Could not save changes.", ...Object.values(body.fieldErrors || {})].join(" "));
          }
        }
        const saved = await read();
        if (!current.active) return;
        for (const key of Object.keys(sent)) {
          if (current.edits[key] === sent[key]) delete current.edits[key];
          else if (current.edits[key]) current.edits[key].before = saved[key];
        }
        options.current.onSaved(saved, changes);
        window.dispatchEvent(new Event("project-metadata-updated"));
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
    for (const [key, value] of Object.entries(changes)) current.edits[key] = { before: current.edits[key] ? current.edits[key].before : original?.[key], value, images: original?.projectCoverImage };
    clearTimeout(current.timer);
    setState(s => ({ ...s, dirty: true, message: s.busy ? "Saving…" : "Changes waiting to save…" }));
    if (!current.stopped) current.timer = setTimeout(flush, immediate ? 0 : 900);
  }
  function retry() { session.current.stopped = false; flush(); }
  function acceptConflicts() {
    // Image-list conflicts require reloading and re-entering captions instead.
    if (state.conflicts?.projectCoverImage !== undefined) return;
    for (const [key, value] of Object.entries(state.conflicts || {})) if (session.current.edits[key]) session.current.edits[key].before = value;
    retry();
  }
  return { ...state, edit, flush, retry, acceptConflicts };
}
