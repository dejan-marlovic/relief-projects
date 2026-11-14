import React, { Children, useEffect, useRef, useState } from "react";
import useMediaQuery from "../../hooks/useMediaQuery";
import useSwipeNavigation from "../../hooks/useSwipeNavigation";
import styles from "./MobileRecordDeck.module.scss";

// Keep records mounted so expanded details and unfinished child forms survive navigation.
export default function MobileRecordDeck({ children, label = "Record", locked = false, creating = false }) {
  const mobile = useMediaQuery("(max-width: 700px)");
  const records = Children.toArray(children);
  const [selectedKey, setSelectedKey] = useState(null);
  const root = useRef(null);
  const editingIndex = records.findIndex(child => child.props.isEditing);
  const selectedIndex = records.findIndex(child => child.key === selectedKey);
  const index = editingIndex >= 0 ? editingIndex : Math.max(0, selectedIndex);
  const currentKey = records[index]?.key;
  useEffect(() => {
    if (currentKey !== selectedKey) setSelectedKey(currentKey ?? null);
  }, [currentKey, selectedKey]);
  const move = direction => {
    if (locked || creating || editingIndex >= 0) return;
    const next = records[index + direction];
    if (!next) return;
    setSelectedKey(next.key);
    root.current?.scrollIntoView({ block: "start", behavior: "auto" });
  };
  const handlers = useSwipeNavigation({ enabled: mobile && !locked && !creating, route: currentKey, onSwipe: move });
  const disabled = locked || creating || editingIndex >= 0;
  return <div ref={root} className={styles.deck} data-mobile-record-deck="" data-swipe-scope="records" hidden={mobile && creating} {...handlers}>
    {mobile && records.length > 0 && <nav className={styles.navigation} aria-label={`${label} navigation`}>
      <button type="button" aria-label={`Previous ${label.toLowerCase()}`} disabled={disabled || index === 0} onClick={() => move(-1)}>← Previous</button>
      <span aria-live="polite">{label} {index + 1} of {records.length}<small>{disabled ? "Finish editing to browse" : "Swipe to browse"}</small></span>
      <button type="button" aria-label={`Next ${label.toLowerCase()}`} disabled={disabled || index === records.length - 1} onClick={() => move(1)}>Next →</button>
    </nav>}
    {records.map((child, i) => <div key={child.key} className={styles.record} hidden={mobile && i !== index}>{child}</div>)}
  </div>;
}
