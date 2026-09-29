import { useEffect, useState } from "react";

export default function useFinancialRefresh() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(n => n + 1);
    window.addEventListener("budget-revisions-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("budget-revisions-changed", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  return revision;
}
