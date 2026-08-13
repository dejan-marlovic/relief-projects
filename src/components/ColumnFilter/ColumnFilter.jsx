import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiFilter } from "react-icons/fi";
import styles from "./ColumnFilter.module.scss";

const emptyValue = (type) =>
  type === "number" ? { min: "", max: "" } :
  type === "date" ? { from: "", to: "" } : "";

const isActive = (type, value) =>
  type === "number" ? value.min !== "" || value.max !== "" :
  type === "date" ? value.from !== "" || value.to !== "" : value !== "";

const ColumnFilter = ({ label, type, value, options = [], onApply, onClear }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const active = isActive(type, value);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (
        !containerRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const trigger = containerRef.current?.getBoundingClientRect();
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const margin = 8;
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const left = Math.min(
        Math.max(margin, trigger.left),
        window.innerWidth - width - margin,
      );
      const fitsBelow = trigger.bottom + margin + height <= window.innerHeight;
      const top = fitsBelow
        ? trigger.bottom + margin
        : Math.max(margin, trigger.top - height - margin);

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, type]);

  const clear = () => {
    setDraft(emptyValue(type));
    onClear();
    setOpen(false);
  };

  return <div className={styles.container} ref={containerRef}>
    <button
      type="button"
      className={`${styles.trigger} ${active ? styles.active : ""}`}
      onClick={() => setOpen((current) => !current)}
      aria-label={`Filter ${label}${active ? ", active" : ""}`}
      aria-expanded={open}
    ><FiFilter /></button>

    {open && createPortal(<div
      ref={popoverRef}
      className={styles.popover}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={`Filter ${label}`}
    >
      <strong>Filter {label}</strong>
      {type === "text" && <label>Contains
        <input type="text" value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} />
      </label>}
      {type === "select" && <label>Value
        <select value={draft} onChange={(e) => setDraft(e.target.value)}>
          <option value="">All</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>}
      {type === "number" && <>
        <label>Minimum<input type="number" value={draft.min} onChange={(e) => setDraft((v) => ({ ...v, min: e.target.value }))} /></label>
        <label>Maximum<input type="number" value={draft.max} onChange={(e) => setDraft((v) => ({ ...v, max: e.target.value }))} /></label>
      </>}
      {type === "date" && <>
        <label>From<input type="date" value={draft.from} onChange={(e) => setDraft((v) => ({ ...v, from: e.target.value }))} /></label>
        <label>To<input type="date" value={draft.to} onChange={(e) => setDraft((v) => ({ ...v, to: e.target.value }))} /></label>
      </>}
      <div className={styles.actions}>
        <button type="button" onClick={clear}>Clear</button>
        <button type="button" className={styles.apply} onClick={() => { onApply(draft); setOpen(false); }}>Apply</button>
      </div>
    </div>, document.body)}
  </div>;
};

export default ColumnFilter;
