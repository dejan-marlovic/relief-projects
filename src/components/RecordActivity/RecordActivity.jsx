import React from "react";
import styles from "./RecordActivity.module.scss";

export default function RecordActivity({ recordLabel, children }) {
  return (
    <details className={styles.activity} data-record-disclosure="true">
      <summary>Details &amp; activity <span>· {recordLabel}</span><span className="expanded-record-label">Expanded</span></summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
