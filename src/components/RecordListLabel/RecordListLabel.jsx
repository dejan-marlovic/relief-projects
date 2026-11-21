import React from "react";
import RecordIcon from "../RecordIcon/RecordIcon";
import styles from "./RecordListLabel.module.scss";

// Describes the item type, never its approval, completion or save state.
export default function RecordListLabel({ type = "record", children }) {
  return <span className={styles.label}><RecordIcon type={type} />{children}</span>;
}
