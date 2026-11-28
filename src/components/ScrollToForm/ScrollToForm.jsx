import { useOpenEditor } from "../../context/OpenEditorContext";
import React, { useEffect, useRef } from "react";
import { revealEditor } from "../../hooks/useScrollToEditor";

// For action-opened editors, not permanently visible forms or filters.
export default function ScrollToForm({ scrollKey, children, autosave, ...props }) {
  const ref = useRef(null);
  useOpenEditor(ref, true, props["aria-label"]);
  const baseline = useRef({ key: scrollKey, value: autosave?.value });
  if (baseline.current.key !== scrollKey) baseline.current = { key: scrollKey, value: autosave?.value };
  const saved = autosave?.saved ?? baseline.current.value;
  const dirty = !!autosave && autosave.value !== saved;
  const latest = useRef(props.onSubmit);
  latest.current = props.onSubmit;
  useEffect(() => {
    if (!dirty || autosave?.blocked) return undefined;
    const timer = setTimeout(() => {
      if (ref.current?.checkValidity()) latest.current?.({ preventDefault() {} });
    }, 1000);
    return () => clearTimeout(timer);
  }, [dirty, autosave?.value, autosave?.blocked, saved]);
  const previousScrollKey = useRef({ initialized: false, key: undefined });
  const confirmedAutosave = !!autosave?.saved;
  useEffect(() => {
    const previous = previousScrollKey.current;
    const savedCreation = previous.key === "create" && scrollKey === "edit" && confirmedAutosave;
    if (!savedCreation && (!previous.initialized || previous.key !== scrollKey)) revealEditor(ref.current);
    previousScrollKey.current = { initialized: true, key: scrollKey };
  }, [scrollKey, confirmedAutosave]);
  return <form ref={ref} tabIndex={-1} {...props}>{autosave && (autosave.busy || autosave.paused || dirty || !autosave.saved) && <p role="status">{autosave.busy ? "Saving changes…" : autosave.paused ? "Automatic saving paused. Review the message below." : dirty ? "Valid details save automatically after a short pause. Complete any required fields. Keep this page open until saved." : "Changes save automatically after a short pause. Saving does not submit or approve this record."}</p>}{children}</form>;
}
