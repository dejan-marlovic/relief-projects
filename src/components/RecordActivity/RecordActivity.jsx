import React from "react";
import styles from "./RecordActivity.module.scss";

export default function RecordActivity({ recordLabel, children }) {
  return (
    <details className={styles.activity}>
      <summary>Details &amp; activity <span>· {recordLabel}</span></summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
