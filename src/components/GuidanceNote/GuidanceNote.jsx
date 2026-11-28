import React, { useId, useRef, useState, useEffect } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import styles from "./GuidanceNote.module.scss";

export default function GuidanceNote({ title = "Guidance", children, className = "", ...props }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = useRef(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current) {
      toggle.current?.focus();
      restoreFocus.current = false;
    }
  }, [open]);
  const change = () => { restoreFocus.current = true; setOpen(value => !value); };
  return <aside {...props} data-guidance-open={open} className={`${styles.note} ${className}`} aria-label={props['aria-label'] || title}>
    <FiInfo className={styles.info} aria-hidden="true" />
    <div className={styles.content}>
      {open && <><strong>{title}</strong><div id={id} className={styles.text}>{children}</div></>}
      {!open && <button ref={toggle} type="button" className={styles.reopen} onClick={change} aria-expanded={false}>Show {title.toLowerCase()}</button>}
    </div>
    {open && <button ref={toggle} type="button" className={styles.close} aria-label={`Hide ${title.toLowerCase()}`} aria-expanded={true} aria-controls={id} onClick={change}><FiX aria-hidden="true" /></button>}
  </aside>;
}
