import FollowUpAttachments from "./FollowUpAttachments";
import FollowUpHistory from "./FollowUpHistory";
import React, { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import styles from "./FollowUps.module.scss";


export default function FollowUpDetails({ task, authFetch, disabled, onAttachmentOperation, observation }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <>
    {authFetch && Number.isInteger(task.attachmentCount) && <FollowUpAttachments task={task} authFetch={authFetch} disabled={disabled} onOperation={onAttachmentOperation} observation={observation} />}
    <div className={styles.details}>
    <button type="button" className={styles.detailsToggle} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      <span>Details &amp; activity</span><FiChevronDown aria-hidden="true" className={expanded ? styles.chevronOpen : undefined} />
    </button>
    <div id={id} className={styles.detailsBody} hidden={!expanded}>
      <dl className={styles.taskDetails}>
        <dt>Responsible employee</dt><dd>{task.assignee?.displayName || "Unavailable"}</dd>
        <dt>Deadline</dt><dd>{task.dueDate}</dd>
        <dt>Description</dt><dd className={styles.description}>{task.description || "No description recorded."}</dd>
      </dl>
      {expanded && authFetch && <FollowUpHistory key={`${task.projectId}-${task.id}`} task={task} authFetch={authFetch} />}
    </div>
  </div></>;
}
