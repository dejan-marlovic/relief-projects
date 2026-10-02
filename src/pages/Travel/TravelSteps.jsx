import React, { useEffect, useId, useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import styles from "./Travel.module.scss";

export default function TravelSteps({ record, plan, approval, editingStep }) {
  const id = useId();
  const needsPlan = ["DRAFT", "RETURNED"].includes(record.state) && !record.isDeleted;
  const [expanded, setExpanded] = useState({ plan: needsPlan, approval: !needsPlan });
  useEffect(() => { setExpanded({ plan: needsPlan, approval: !needsPlan }); }, [record.state, needsPlan]);
  useEffect(() => { if (editingStep) setExpanded(previous => ({ ...previous, [editingStep]: true })); }, [editingStep]);
  const approvalStatus = record.isDeleted ? "Retained decisions" : ({ DRAFT: "Not submitted", RETURNED: "Changes required", SUBMITTED: "Awaiting independent approval", APPROVED: "Approval recorded", CANCELLED: "Cancelled" }[record.state]);
  const steps = [
    { key: "plan", title: "Plan the trip", status: record.isDeleted ? "Retained plan" : needsPlan ? "Draft / changes to prepare" : record.currentSubmission ? "Submitted plan" : "Saved plan", summary: `${record.traveller?.displayName || "Traveller"} · ${record.destination} · ${record.departureDate} – ${record.returnDate}`, description: "Describe the traveller, purpose, destination and dates. Link preparation tasks and exact supporting versions before submission.", body: plan },
    { key: "approval", title: "Travel approval", status: approvalStatus, summary: record.currentApproval ? `Approved by ${record.currentApproval.actor?.username || "recorded approver"}` : record.currentSubmission ? `Submitted by ${record.currentSubmission.actor?.username || "recorded submitter"}` : "Submit the plan when it is ready for review.", description: "Submit the prepared plan for an independent decision. Returned plans can be revised; withdraw approval before changing an approved plan. Approval does not confirm booking, payment or travel.", body: approval },
  ];
  return <><p className={styles.muted}>Prepare the trip, then request independent approval. Expand each step to review its details and available actions. The recorded status determines what you can do next.</p><ol className={styles.steps} aria-label="Travel workflow">
    {steps.map((step, index) => <li key={step.key} className={styles.step}>
      <span className={`${styles.stepMarker} ${step.key === "approval" && record.hasCurrentAuthorization ? styles.stepApproved : ""}`} aria-hidden="true">{step.key === "approval" && record.hasCurrentAuthorization ? <FiCheck /> : index + 1}</span>
      <button type="button" className={styles.stepToggle} aria-expanded={expanded[step.key] || editingStep === step.key} aria-controls={`${id}-${step.key}`} disabled={editingStep === step.key} onClick={() => setExpanded(previous => ({ ...previous, [step.key]: !previous[step.key] }))}>
        <span><strong>{step.title}</strong><span className={styles.stepStatus}>{step.status}</span><span className={styles.stepDescription}>{step.summary}</span></span><FiChevronDown aria-hidden="true" className={expanded[step.key] ? styles.chevronOpen : undefined} />
      </button>
      <div id={`${id}-${step.key}`} hidden={!expanded[step.key] && editingStep !== step.key} className={styles.stepBody}><p className={styles.muted}>{step.description}</p>{step.body}</div>
    </li>)}
  </ol></>;
}
