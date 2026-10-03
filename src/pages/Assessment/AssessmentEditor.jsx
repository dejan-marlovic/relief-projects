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
      {["create", "edit"].includes(action) && <><p>Drafts can be incomplete. Before submission, explain the need, feasibility and risks, and choose a recommendation.</p>{Object.entries(fields).map(([key, title]) => <React.Fragment key={key}>{textarea(key, title)}</React.Fragment>)}<label>Recommendation<select value={draft.recommendation} onChange={e => update("recommendation", e.target.value)}><option value="">Not yet selected</option><option value="PROCEED">Proceed</option><option value="REVISE">Revise</option></select></label>{action === "edit" && textarea("reason", record?.currentSubmission ? "Reason for changes (required)" : "Reason for changes (optional)", !!record?.currentSubmission)}</>}
      {["submit", "approve"].includes(action) && <>{textarea("note", action === "approve" ? "Approval note" : "Submission note (optional)", action === "approve")}{action === "approve" && <><p>This records an internal assessment decision. It does not verify committee signatures, evidence completeness or spending authority.</p>{textarea("evidenceGapExplanation", record?.requiresEvidenceGapExplanation ? "Missing evidence explanation (required)" : "Missing evidence explanation (optional)", record?.requiresEvidenceGapExplanation)}</>}</>}
      {action === "evidence" && <><EvidencePicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.documentId} onSelect={id => update("documentId", id)} /><label>Evidence purpose<select value={draft.purpose} onChange={e => update("purpose", e.target.value)}><option value="ASSESSMENT">Assessment</option><option value="COMMITTEE_MINUTES">Committee minutes</option><option value="SUPPORTING">Supporting material</option></select></label>{record?.state === "APPROVED" && <p>Added after approval — outside the recorded decision basis.</p>}</>}
      {!["create", "edit", "submit", "approve", "evidence"].includes(action) && <>{action === "withdraw-approval" && <p>Withdrawal removes current approval and sets the project approval value to No. The decision stays in history. Corrections need resubmission and a new independent approval.</p>}{action === "restore" && <p>Restoration restores the retained draft or returned assessment, never approval.</p>}{action === "delete" && <p>History and evidence links remain retained. An administrator can restore this assessment.</p>}{textarea("reason", "Reason", true)}</>}
      {error && <p role="alert">{error}</p>}{form.error && <p role="alert">{form.error}</p>}
      {form.reviewRequired && <div role="alert"><p>Your draft is retained. Review the refreshed assessment, evidence and history before retrying. The earlier request may have succeeded; do not repeat it if the intended result is already recorded.</p><button type="button" disabled={reviewBlocked} onClick={onReview}>I reviewed the refreshed state; enable retry</button></div>}
      <div className={styles.actions}><button type="submit" className={approvalStyle(action, styles)} disabled={busy || blocked || form.reviewRequired}><TravelActionIcon action={action} />Save {commands[action][0].toLowerCase()}</button><button type="button" onClick={onCancel}>Cancel assessment draft</button></div>
    </fieldset>
  </form>;
}
