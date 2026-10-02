import React, { useEffect, useId, useState } from "react";
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

export default function FollowUpSteps({ task, editing, editor }) {
  const id = useId();
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { if (editing) setExpanded("plan"); }, [editing]);
  const sections = [
    { key: "plan", title: "Define the action", summary: `${task.assignee?.displayName || "Unassigned"} · Due ${task.dueDate}`, content: <>
      <p>Describe the work, choose the responsible employee and set a deadline. Keep the description specific enough to know when the action is complete.</p><dl className={styles.taskDetails}><dt>Responsible employee</dt><dd>{task.assignee?.displayName || "Unavailable"}</dd><dt>Deadline</dt><dd>{task.dueDate}</dd><dt>Description</dt><dd className={styles.description}>{task.description || "No description recorded."}</dd></dl>{editor}
    </> },
    { key: "track", title: "Track and complete", summary: task.isDeleted ? "Deleted follow-up" : task.status === "COMPLETED" ? "Completed" : "Open", content: <>
      <p><strong>{task.status === "COMPLETED" ? "Completed" : "Open"}{task.isDeleted ? " · Deleted" : ""}</strong></p>
      <p>Use the quick actions above to complete or reopen this follow-up when permitted. Completion does not approve documents, travel or other linked records.</p>
      <FollowUpActivity task={task} />
    </> },
  ];
  return <><p className={styles.muted}>Define the action and its owner, then track completion. Expand a step for details; completion applies only to this follow-up.</p><ol className={styles.steps} aria-label={`Follow-up #${task.id} workflow`}>
    {sections.map((section, index) => {
      const open = expanded === section.key || (editing && section.key === "plan");
      return <li className={styles.step} key={section.key}>
        <span className={styles.stepMarker} aria-hidden="true">{index + 1}</span>
        <button type="button" className={styles.stepToggle} aria-expanded={open} aria-controls={`${id}-${section.key}`} disabled={editing && section.key === "plan"} onClick={() => setExpanded(open ? null : section.key)}><span><strong>{section.title}</strong><span className={styles.stepDescription}>{section.summary}</span></span><FiChevronDown aria-hidden="true" className={open ? styles.chevronOpen : undefined} /></button>
        <div id={`${id}-${section.key}`} className={styles.stepBody} hidden={!open}>{section.content}</div>
      </li>;
    })}
  </ol></>;
}
