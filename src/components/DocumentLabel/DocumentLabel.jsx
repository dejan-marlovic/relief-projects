import React from "react";
import { FiFileText } from "react-icons/fi";
import styles from "./DocumentLabel.module.scss";

// Decorative file identity, separate from link state, approval and download actions.
export default function DocumentLabel({ children }) {
  return <span className={styles.document}><span className={styles.icon} aria-hidden="true"><FiFileText focusable="false" /></span><span className={styles.name}>{children}</span></span>;
}
