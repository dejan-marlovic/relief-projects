import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import styles from "./Layout.module.scss";

// Disclosure navigation uses ordinary links and native Tab navigation, not ARIA menu widgets.
export default function NavigationGroup({ label, items, isActive, open, onToggle, onClose, confirmNavigation }) {
  const root = useRef(null), trigger = useRef(null);
  const current = items.find(([path]) => isActive(path));
  useEffect(() => {
    if (!open) return undefined;
    const outside = event => { if (!root.current?.contains(event.target)) onClose(); };
    const fitDropdown = () => {
      const panel = root.current?.querySelector("ul");
      if (!panel) return;
      panel.style.transform = "none";
      const bounds = panel.getBoundingClientRect();
      const shift = bounds.right > window.innerWidth - 16 ? window.innerWidth - 16 - bounds.right : bounds.left < 16 ? 16 - bounds.left : 0;
      panel.style.transform = `translateX(${shift}px)`;
      panel.style.maxHeight = `${Math.max(80, Math.min(400, window.innerHeight - bounds.top - 16))}px`;
    };
    fitDropdown();
    window.addEventListener("resize", fitDropdown);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", fitDropdown); };
  }, [open, onClose]);
  const id = `navigation-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <li ref={root} className={`${styles.tabItem} ${styles.groupItem}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) onClose();
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); onClose(); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" className={`${styles.tabLink} ${styles.groupTrigger} ${current ? styles.active : ""}`} aria-expanded={open} aria-controls={id} onClick={onToggle}>
      <span className={styles.groupTitle}>{label}<FiChevronDown aria-hidden="true" /></span>
      {current && <span className={styles.projectTabSubtitle}>{current[1]}</span>}
    </button>
    {open && <ul id={id} className={styles.dropdown} aria-label={label}>{items.map(([path, name]) => <li key={path}><Link to={path} aria-current={isActive(path) ? "page" : undefined} onClick={event => {
      if (!isActive(path) && !confirmNavigation()) { event.preventDefault(); return; }
      onClose();
    }}>{name}</Link></li>)}</ul>}
  </li>;
}
