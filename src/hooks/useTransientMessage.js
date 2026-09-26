import { useCallback, useEffect, useState } from "react";

// Only opt success messages into expiry; errors and progress remain visible.
export default function useTransientMessage(initial = "", shouldExpire = true) {
  const [entry, setEntry] = useState({ value: initial });
  const setMessage = useCallback(value => setEntry(previous => ({
    value: typeof value === "function" ? value(previous.value) : value
  })), []);
  const expires = typeof shouldExpire === "function" ? shouldExpire(entry.value) : shouldExpire;
  useEffect(() => {
    if (!entry.value || !expires) return undefined;
    const timer = setTimeout(() => setEntry({ value: "" }), 5000);
    return () => clearTimeout(timer);
  }, [entry, expires]);
  return [entry.value, setMessage];
}
