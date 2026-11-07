import { useCallback, useEffect, useRef } from "react";

export function revealEditor(element) {
  if (!element) return;
  const field = Array.from(element.querySelectorAll("input, textarea, select, button"))
    .find(control => !control.matches(":disabled, [type=hidden]") && !control.closest("[hidden]"));
  (field || element).focus({ preventScroll: true });
  element.scrollIntoView?.({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
    block: "start",
  });
}

export default function useScrollToEditor(open, forwardedRef) {
  const local = useRef(null);
  const ref = useCallback(node => {
    local.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useEffect(() => { if (open) revealEditor(local.current); }, [open]);
  return ref;
}
