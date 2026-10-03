import React, { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { uploadTimeLabel } from "../../utils/documentMetadata";
import styles from "./FollowUps.module.scss";


const actorName = actor => actor?.username || (actor?.userId ? `User #${actor.userId}` : "Unknown actor");
export function FollowUpActivity({ task }) {
  const events = [
    { key: "created", label: "Created", at: task.createdAt, actor: task.createdBy },
    { key: "updated", label: "Last changed", at: task.updatedAt, actor: task.updatedBy },
    { key: "completed", label: "Current completion recorded", at: task.completedAt, actor: task.completedBy },
    { key: "deleted", label: "Current deletion recorded", at: task.deletedAt, actor: task.deletedBy },
  ].filter(event => event.at).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return <section aria-label="Recorded follow-up activity"><h4>Recorded activity</h4>
    <p className={styles.muted}>Current attribution only; earlier edits and completion cycles are not retained. “Last changed” may refer to the same operation as completion or deletion.</p>
    <ol className={styles.timeline}>{events.map(event => <li key={event.key}><strong>{event.label}</strong><p>{uploadTimeLabel(event.at)} · {actorName(event.actor)}</p></li>)}</ol>
    {!events.length && <p>No activity timestamps available.</p>}
  </section>;
}

export default function FollowUpDetails({ task }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.details}>
    <button type="button" className={styles.detailsToggle} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      <span>Details &amp; activity</span><FiChevronDown aria-hidden="true" className={expanded ? styles.chevronOpen : undefined} />
    </button>
    <div id={id} className={styles.detailsBody} hidden={!expanded}>
      <dl className={styles.taskDetails}>
        <dt>Responsible employee</dt><dd>{task.assignee?.displayName || "Unavailable"}</dd>
        <dt>Deadline</dt><dd>{task.dueDate}</dd>
        <dt>Description</dt><dd className={styles.description}>{task.description || "No description recorded."}</dd>
      </dl>
      <FollowUpActivity task={task} />
    </div>
  </div>;
}
