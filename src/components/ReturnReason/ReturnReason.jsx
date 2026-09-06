import React from "react";
import styles from "./ReturnReason.module.scss";

export default function ReturnReason({ event }) {
  if (event.action !== "RETURN") return null;
  return <div className={styles.reason}><strong>Return reason</strong><div>{event.returnReason || "No reason recorded."}</div></div>;
}
