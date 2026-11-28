import React, { useId } from "react";
import styles from "./RecordActivity.module.scss";

export default function RecordActivity({ recordLabel, children, expanded, onExpandedChange }) {
  const id = useId();
  const heading = <>Details &amp; activity {recordLabel && <span>· {recordLabel}</span>}<span className="expanded-record-label" aria-hidden="true">Expanded</span></>;
  if (onExpandedChange) return (
    <div className={styles.activity} data-open-record={expanded ? "true" : undefined}>
      <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={id} onClick={() => onExpandedChange(!expanded)}>{heading}</button>
      <div id={id} className={styles.content} hidden={!expanded}>{children}</div>
    </div>
  );
  return (
    <details className={styles.activity} data-record-disclosure="true">
      <summary>{heading}</summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
