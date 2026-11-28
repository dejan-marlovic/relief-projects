import { useCallback, useEffect, useRef } from "react";

import { revealEditor } from "../utils/revealEditor";
import { useOpenEditor } from "../context/OpenEditorContext";
export { revealEditor } from "../utils/revealEditor";

export default function useScrollToEditor(open, forwardedRef, editorOpen = false, editorLabel) {
  const local = useRef(null);
  useOpenEditor(local, editorOpen, editorLabel);
  const ref = useCallback(node => {
    local.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useEffect(() => { if (open) return revealEditor(local.current); }, [open]);
  return ref;
}
