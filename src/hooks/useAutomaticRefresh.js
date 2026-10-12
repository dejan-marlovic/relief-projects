import { useEffect, useRef } from "react";

// Refresh visible views without interrupting drafts or overlapping requests.
export default function useAutomaticRefresh(refresh, blocked = false) {
  const latest = useRef();
  latest.current = { refresh, blocked };
  useEffect(() => {
    let last = 0;
    const update = () => {
      if (document.visibilityState === "hidden" || latest.current.blocked || Date.now() - last < 1000) return;
      last = Date.now();
      latest.current.refresh();
    };
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    const timer = setInterval(update, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
}
