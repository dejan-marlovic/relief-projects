import React from "react";
import styles from "../ReviewAttribution/ReviewAttribution.module.scss";

export default function ArchiveAttribution({ value }) {
  const archived = value?.latestArchive || (value?.archive?.recordedBy ? { actor: value.archive.recordedBy, occurredAt: value.archive.recordedAt } : null);
  const unarchived = value?.latestUnarchive;
  if (!archived && !unarchived) return null;
  const name = actor => actor?.employeeName || actor?.displayName || actor?.username;
  return <div className={styles.attribution} aria-label="Archive attribution">
    {[["Archived by", archived], ["Unarchived by", unarchived]].map(([label, decision]) => name(decision?.actor) && <span key={label} title={decision.occurredAt ? new Date(decision.occurredAt).toLocaleString() : undefined}>{label} <strong>{name(decision.actor)}</strong></span>)}
  </div>;
}
