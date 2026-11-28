import React, { useEffect, useRef, useState } from "react";
import styles from "./ColumnResize.module.scss";

const MIN = 80;
const MAX = 1600;
const clamp = width => Math.max(MIN, Math.min(MAX, Math.round(width)));

// Measure visible controls, not the stretched grid container itself.
export function fitActionColumn(table) {
  let width = 110; // Selection checkbox, Actions label and resize handle.
  table?.querySelectorAll('[data-financial-row-actions="true"]').forEach(group => {
    const controls = [...group.querySelectorAll('button, input[type="checkbox"]')]
      .filter(control => control.getClientRects().length && !control.closest('[hidden]'));
    if (!controls.length) return;
    const style = getComputedStyle(group);
    const gap = parseFloat(style.columnGap) || 8;
    const cell = getComputedStyle(group.parentElement);
    const padding = (parseFloat(cell.paddingLeft) || 0) + (parseFloat(cell.paddingRight) || 0);
    const content = controls.reduce((sum, control) => sum + Math.max(34, control.getBoundingClientRect().width), 0);
    width = Math.max(width, content + gap * (controls.length - 1) + Math.max(24, padding));
  });
  return clamp(width);
}

export function useColumnWidths(view, defaults, { tableRef, compact = false } = {}) {
  const key = `table-column-widths:v2:${view}`;
  const [overrides, setOverrides] = useState(() => {
    try {
      const current = localStorage.getItem(key);
      const saved = JSON.parse(current ?? localStorage.getItem(`table-column-widths:v1:${view}`));
      // Older versions persisted defaults as well as user sizes. Migrate only
      // sizes that differ from their old default so automatic fitting can work.
      return defaults.map((width, index) => Number.isFinite(saved?.[index]) &&
        (current !== null || saved[index] !== width) ? clamp(saved[index]) : null);
    } catch (_) { return defaults.map(() => null); }
  });
  const [actionWidth, setActionWidth] = useState(110);
  useEffect(() => {
    const table = tableRef?.current;
    if (!table || compact) return undefined;
    const measure = () => setActionWidth(fitActionColumn(table));
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(overrides)); } catch (_) { /* Resizing still works without storage. */ }
  }, [key, overrides]);
  const fittedDefaults = defaults.map((width, index) => index === 0 && tableRef && !compact ? actionWidth : width);
  const widths = fittedDefaults.map((width, index) => overrides[index] ?? width);
  const resize = (index, width) => setOverrides(current => current.map((item, i) => i === index ? clamp(width) : item));
  const reset = index => setOverrides(current => current.map((item, i) => i === index ? null : item));
  return { widths, resize, reset, fittedDefaults };
}

export default function ColumnResize({ label, width, defaultWidth, onResize, onReset }) {
  const drag = useRef(null);
  return <span className={styles.handle} role="separator" aria-orientation="vertical"
    aria-label={`Resize ${label} column`} aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={width}
    tabIndex={0} title="Drag to resize. Arrow keys adjust width; double-click or Home resets."
    onClick={event => event.stopPropagation()}
    onDoubleClick={event => { event.preventDefault(); event.stopPropagation(); onReset ? onReset() : onResize(defaultWidth); }}
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
      if (event.key === "Home" && onReset) onReset();
      else onResize(event.key === "Home" ? defaultWidth : width + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 50 : 10));
    }} />;
}
