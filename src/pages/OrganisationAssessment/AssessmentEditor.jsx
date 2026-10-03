import React, { useState } from "react";
import { EvidencePicker } from "../Management/ManagementViews";
import { assessmentPayload, commands, fields } from "./assessmentApi";
import TravelActionIcon, { approvalStyle } from "../Travel/TravelActionIcon";
import styles from "../Travel/Travel.module.scss";

export default function AssessmentEditor({ form, setForm, projectId, authFetch, refresh, busy, blocked, reviewBlocked, onReview, onSave, onCancel }) {
  const [error, setError] = useState("");
  const { action, draft, record } = form;
  const update = (key, value) => setForm(f => ({ ...f, draft: { ...f.draft, [key]: value } }));
  const textarea = (key, title, required = false) => <label>{title}<textarea rows={3} required={required} value={draft[key] || ""} onChange={e => update(key, e.target.value)} /></label>;
  return <form className={styles.panel} aria-label={commands[action][0]} onSubmit={e => { e.preventDefault(); if (busy || blocked || form.reviewRequired) return; try { setError(""); onSave(assessmentPayload(action, draft, record)); } catch (failure) { setError(failure.message); } }}>
    <h3>{commands[action][0]}</h3><fieldset disabled={busy}>
      {["create", "edit"].includes(action) && <><p>Describe capacity, suitability for this particular project role and any material concerns. Drafts may be incomplete; all three narratives are required before submission.</p>{Object.entries(fields).map(([key, title]) => <React.Fragment key={key}>{textarea(key, title)}</React.Fragment>)}{action === "edit" && textarea("reason", record?.currentSubmission ? "Reason for changes (required)" : "Reason for changes (optional)", !!record?.currentSubmission)}</>}
      {action === "submit" && textarea("note", "Submission note (optional)")}
      {action === "review" && <><label>Review outcome<select required value={draft.decision} onChange={e => update("decision", e.target.value)}><option value="">Select outcome</option><option value="SUITABLE_FOR_STATED_ROLE">Suitable for the stated role</option><option value="NOT_RECOMMENDED_FOR_STATED_ROLE">Not recommended for the stated role</option></select></label>{textarea("decisionExplanation", "Decision explanation", true)}{textarea("evidenceGapExplanation", record?.requiresEvidenceGapExplanation ? "Missing evidence explanation (required)" : "Missing evidence explanation (optional)", record?.requiresEvidenceGapExplanation)}<p>Either outcome records a review for this project role. It does not change the role, project approval or funding permissions.</p></>}
      {action === "evidence" && <><EvidencePicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.documentId} onSelect={id => update("documentId", id)} /><label>Evidence purpose<select value={draft.purpose} onChange={e => update("purpose", e.target.value)}><option value="ASSESSMENT">Assessment</option><option value="SUPPORTING">Supporting material</option></select></label>{record?.state === "REVIEWED" && <p>Added after review — outside the recorded decision basis.</p>}</>}
      {!["create", "edit", "submit", "review", "evidence"].includes(action) && <>{action === "withdraw-review" && <p>Withdrawal clears the current review outcome. The decision stays in history. Corrections need resubmission and a new independent review.</p>}{action === "restore" && <p>Restoration restores the retained draft or returned assessment, never a review outcome.</p>}{action === "delete" && <p>History and evidence links remain retained. An administrator can restore this assessment.</p>}{textarea("reason", "Reason", true)}</>}
      {error && <p role="alert">{error}</p>}{form.error && <p role="alert">{form.error}</p>}
      {form.reviewRequired && <div role="alert"><p>Your draft is retained. Review the refreshed assessment, evidence and history before retrying. The earlier request may have succeeded; do not repeat it if the intended result is already recorded.</p><button type="button" disabled={reviewBlocked} onClick={onReview}>I reviewed the refreshed state; enable retry</button></div>}
      <div className={styles.actions}><button type="submit" className={approvalStyle(action, styles)} disabled={busy || blocked || form.reviewRequired}><TravelActionIcon action={action} />Save {commands[action][0].toLowerCase()}</button><button type="button" onClick={onCancel}>Cancel assessment draft</button></div>
    </fieldset>
  </form>;
}
