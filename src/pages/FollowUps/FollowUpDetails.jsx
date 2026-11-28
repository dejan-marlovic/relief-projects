import RecordActivity from "../../components/RecordActivity/RecordActivity";
import RecordListLabel from "../../components/RecordListLabel/RecordListLabel";
import FollowUpAttachments from "./FollowUpAttachments";
import FollowUpHistory from "./FollowUpHistory";
import React, { useState } from "react";
import styles from "./FollowUps.module.scss";


export default function FollowUpDetails({ task, authFetch, disabled, onAttachmentOperation, observation }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    {authFetch && Number.isInteger(task.attachmentCount) && <FollowUpAttachments task={task} authFetch={authFetch} disabled={disabled} onOperation={onAttachmentOperation} observation={observation} />}
    <RecordActivity expanded={expanded} onExpandedChange={setExpanded}>
      <RecordListLabel type="followUp">Follow-up</RecordListLabel>
      <dl className={styles.taskDetails}>
        <dt>Responsible employee</dt><dd>{task.assignee?.displayName || "Unavailable"}</dd>
        <dt>Deadline</dt><dd>{task.dueDate}</dd>
        <dt>Description</dt><dd className={styles.description}>{task.description || "No description recorded."}</dd>
      </dl>
      {expanded && authFetch && <FollowUpHistory key={`${task.projectId}-${task.id}`} task={task} authFetch={authFetch} />}
    </RecordActivity></>;
}
