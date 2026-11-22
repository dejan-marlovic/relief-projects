import GuidanceNote from "../GuidanceNote/GuidanceNote";
import ActionButton from "../ActionButton/ActionButton";
import React, { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import styles from "./Workflow.module.scss";

export function WorkflowIntro({ children }) {
  return <GuidanceNote title="How this works">{children} Expand or collapse each step to focus on the details. Step numbers explain the process; they do not indicate completion.</GuidanceNote>;
}

export function WorkflowStep({ number, title, description, children, keepOpen = false }) {
  const id = useId();
  const [expanded, setExpanded] = useState(true);
  const open = expanded || keepOpen;
  return <section data-mobile-tile={title} data-purpose-tile="" className={styles.step} aria-label={title}>
    <span className={styles.marker} aria-hidden="true">{number}</span>
    <ActionButton type="button" className={styles.toggle} aria-expanded={open} aria-controls={id} disabled={keepOpen} onClick={() => setExpanded(!expanded)}>
      <span><strong>{title}</strong></span><FiChevronDown aria-hidden="true" className={open ? styles.expanded : undefined} />
    </ActionButton>
    {description && <GuidanceNote title="About this step">{description}</GuidanceNote>}
    <div id={id} hidden={!open} className={styles.body}>{children}</div>
  </section>;
}

export function HistoryIntro({ children }) {
  return <GuidanceNote title="About this history">{children} Expand an entry to see what changed and who recorded it. Full recorded details and references remain available inside each entry; use the history controls to browse earlier changes.</GuidanceNote>;
}
