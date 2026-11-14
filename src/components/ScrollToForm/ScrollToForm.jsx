import React, { useEffect, useRef } from "react";
import { revealEditor } from "../../hooks/useScrollToEditor";

// For action-opened editors, not permanently visible forms or filters.
export default function ScrollToForm({ scrollKey, children, autosave, ...props }) {
  const ref = useRef(null);
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
  useEffect(() => { revealEditor(ref.current); }, [scrollKey]);
  return <form ref={ref} tabIndex={-1} {...props}>{autosave && <p role="status">{autosave.busy ? "Saving changes…" : autosave.paused ? "Automatic saving paused. Review the message below." : dirty ? "Valid details save automatically after a short pause. Complete any required fields. Keep this page open until saved." : autosave.saved ? "Changes saved." : "Changes save automatically after a short pause. Saving does not submit or approve this record."}</p>}{children}</form>;
}
