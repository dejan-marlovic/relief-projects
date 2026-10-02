import React, { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import styles from "./Workflow.module.scss";

export function WorkflowIntro({ children }) {
  return <p className={styles.intro}>{children} Expand or collapse each step to focus on the details. Step numbers explain the process; they do not indicate completion.</p>;
}

export function WorkflowStep({ number, title, description, children, keepOpen = false }) {
  const id = useId();
  const [expanded, setExpanded] = useState(true);
  const open = expanded || keepOpen;
  return <section className={styles.step} aria-label={title}>
    <span className={styles.marker} aria-hidden="true">{number}</span>
    <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={id} disabled={keepOpen} onClick={() => setExpanded(!expanded)}>
      <span><strong>{title}</strong><span className={styles.description}>{description}</span></span><FiChevronDown aria-hidden="true" className={open ? styles.expanded : undefined} />
    </button>
    <div id={id} hidden={!open} className={styles.body}>{children}</div>
  </section>;
}

export function HistoryIntro({ children }) {
  return <p className={styles.intro}>{children} Each entry shows a recorded change and its attribution. Expand the saved details to understand what changed; earlier entries remain available through the history pages.</p>;
}
