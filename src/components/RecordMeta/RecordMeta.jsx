import React from "react";
import styles from "./RecordMeta.module.scss";

export default function RecordMeta({ as: Tag = "p", className = "", children, ...props }) {
  return <Tag {...props} data-record-meta="true" className={`${styles.meta} ${className}`.trim()}>{children}</Tag>;
}
