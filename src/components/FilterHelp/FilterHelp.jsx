import React from "react";
import styles from "./FilterHelp.module.scss";
export default function FilterHelp({ title, children }) {
  return <div className={styles.help}>{title && <h3>{title}</h3>}<p>{children}</p></div>;
}
