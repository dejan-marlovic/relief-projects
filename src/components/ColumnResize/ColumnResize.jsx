import React, { useEffect, useRef, useState } from "react";
import styles from "./ColumnResize.module.scss";

const MIN = 80;
const MAX = 1600;
const clamp = width => Math.max(MIN, Math.min(MAX, Math.round(width)));

export function useColumnWidths(view, defaults) {
  const key = `table-column-widths:v1:${view}`;
  const [widths, setWidths] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return defaults.map((width, index) => Number.isFinite(saved?.[index]) ? clamp(saved[index]) : width);
    } catch (_) { return [...defaults]; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(widths)); } catch (_) { /* Resizing still works without storage. */ }
  }, [key, widths]);
  const resize = (index, width) => setWidths(current => current.map((item, i) => i === index ? clamp(width) : item));
  return { widths, resize };
}

export default function ColumnResize({ label, width, defaultWidth, onResize }) {
  const drag = useRef(null);
  return <span className={styles.handle} role="separator" aria-orientation="vertical"
    aria-label={`Resize ${label} column`} aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={width}
    tabIndex={0} title="Drag to resize. Arrow keys adjust width; double-click or Home resets."
    onClick={event => event.stopPropagation()}
    onDoubleClick={event => { event.preventDefault(); event.stopPropagation(); onResize(defaultWidth); }}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      drag.current = { x: event.clientX, width };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => { if (drag.current) onResize(drag.current.width + event.clientX - drag.current.x); }}
    onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { drag.current = null; }}
    onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      onResize(event.key === "Home" ? defaultWidth : width + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 50 : 10));
    }} />;
}
