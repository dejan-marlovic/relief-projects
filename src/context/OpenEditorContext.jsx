import ActionButton from "../components/ActionButton/ActionButton";
import RecordIcon from "../components/RecordIcon/RecordIcon";
import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { revealEditor } from "../utils/revealEditor";
import styles from "./OpenEditorContext.module.scss";

const OpenEditorContext = createContext({ register: () => () => {} });

export function useOpenEditor(ref, open = true, label) {
  const { register } = useContext(OpenEditorContext);
  const id = useId();
  useEffect(() => {
    if (!open || !ref.current) return undefined;
    const element = ref.current;
    const name = label || element.getAttribute("aria-label") || element.querySelector("h2,h3,h4")?.textContent || "Record editor";
    return register(id, { element, name });
  }, [id, label, open, ref, register]);
}

export function OpenEditorProvider({ children }) {
  const [editors, setEditors] = useState({});
  const register = useCallback((id, editor) => {
    setEditors(current => ({ ...current, [id]: editor }));
    return () => setEditors(current => {
      const next = { ...current }; delete next[id]; return next;
    });
  }, []);
  const value = useMemo(() => ({ register }), [register]);
  const entries = Object.entries(editors);
  return <OpenEditorContext.Provider value={value}>
    {!!entries.length && <aside data-open-editor-notice="" className={styles.notice} aria-label="Open editor notice">
      <div><strong role="status">Editor open{entries.length > 1 ? ` (${entries.length})` : ""}</strong>
        <p>Actions that depend on finishing this editor are paused. Complete required fields, save or wait for autosave, then close the editor to continue. Previously saved changes remain saved.</p>
      </div>
      <div className={styles.actions}>{entries.map(([id, editor]) => <ActionButton type="button" key={id} onClick={() => revealEditor(editor.element)}><RecordIcon type="open" />Return to editor: {editor.name}</ActionButton>)}</div>
    </aside>}
    {children}
  </OpenEditorContext.Provider>;
}
