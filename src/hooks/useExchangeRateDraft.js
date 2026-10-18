import { useEffect, useRef, useState } from "react";
import { notifySuccess } from "../utils/successNotifications";

// Tab-local drafts never create or update master data.
export default function useExchangeRateDraft(action, initialValue) {
  const [key] = useState(() => {
    try {
      const subject = JSON.parse(atob(localStorage.getItem("authToken").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub;
      return subject ? `exchange-rate-draft:${encodeURIComponent(subject)}:${action}` : null;
    } catch { return null; }
  });
  const [value, setValue] = useState(() => {
    const initial = typeof initialValue === "function" ? initialValue() : initialValue;
    try {
      const stored = key && JSON.parse(sessionStorage.getItem(key));
      return stored && typeof stored === "object" && !Array.isArray(stored) ? { ...initial, ...stored } : initial;
    } catch { return initial; }
  });
  const [message, setMessage] = useState("");
  const edited = useRef(false);
  const update = next => { edited.current = true; setValue(next); };
  const clear = next => {
    edited.current = false;
    try { if (key) sessionStorage.removeItem(key); } catch {}
    setMessage("");
    setValue(next);
  };
  useEffect(() => {
    if (!edited.current) return;
    if (!key) { setMessage("Draft storage is unavailable. Keep this form open until you save."); return; }
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      setMessage("Draft retained in this tab. Use the action button to save to the system. Closing this tab removes unfinished entries.");
      const timer = setTimeout(() => notifySuccess("Exchange-rate draft saved in this tab."), 900);
      return () => clearTimeout(timer);
    } catch { setMessage("Draft could not be stored. Keep this form open until you save."); }
  }, [key, value]);
  return [value, update, clear, message];
}
