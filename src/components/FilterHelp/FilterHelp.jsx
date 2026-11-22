import GuidanceNote from "../GuidanceNote/GuidanceNote";
import React from "react";
import styles from "./FilterHelp.module.scss";
export default function FilterHelp({ title, children }) {
  return <div className={styles.help}><GuidanceNote title={title || "Filter guidance"}>{children}</GuidanceNote></div>;
}
