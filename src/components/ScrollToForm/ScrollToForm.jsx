import React, { useEffect, useRef } from "react";
import { revealEditor } from "../../hooks/useScrollToEditor";

// For action-opened editors, not permanently visible forms or filters.
export default function ScrollToForm({ scrollKey, children, ...props }) {
  const ref = useRef(null);
  useEffect(() => { revealEditor(ref.current); }, [scrollKey]);
  return <form ref={ref} tabIndex={-1} {...props}>{children}</form>;
}
