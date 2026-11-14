import { useCallback, useRef, useState } from "react";

// Keep request locking separate from the initial-load presentation.
// A new query must load normally; refreshing the same query keeps its content mounted.
export default function useRefreshLoading(initial = true, key = "view") {
  const currentKey = useRef(key);
  currentKey.current = key;
  const [state, setState] = useState({ key, pending: initial, settled: false });
  const setLoading = useCallback(pending => {
    const key = currentKey.current;
    setState(previous => ({ key, pending, settled: !pending || (previous.key === key && previous.settled) }));
  }, []);
  const same = state.key === key;
  return [same ? state.pending : true, setLoading, !same || (state.pending && !state.settled)];
}
