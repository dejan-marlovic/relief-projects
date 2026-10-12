import React, { useState } from "react";
import { EvidencePicker } from "../Management/ManagementViews";
import { assessmentPayload, commands, fields } from "./assessmentApi";
import TravelActionIcon, { approvalStyle } from "../Travel/TravelActionIcon";
import styles from "../Travel/Travel.module.scss";

export default function AssessmentEditor({ form, setForm, projectId, authFetch, refresh, busy, blocked, reviewBlocked, onReview, onSave, onCancel, onDiscard, localSaved }) {
  const [error, setError] = useState("");
  const { action, draft, record } = form;
  let draftValidation = "";
  if (["create", "edit"].includes(action)) {
    try { assessmentPayload(action, draft, record); } catch (failure) { draftValidation = failure.message; }
  }
  const update = (key, value) => setForm(f => ({ ...f, draft: { ...f.draft, [key]: value } }));
  const textarea = (key, title, required = false) => <label>{title}<textarea rows={3} required={required} value={draft[key] || ""} onChange={e => update(key, e.target.value)} /></label>;
  return <form className={styles.panel} aria-label={commands[action][0]} onSubmit={e => { e.preventDefault(); if (busy || blocked || form.reviewRequired) return; try { setError(""); onSave(assessmentPayload(action, draft, record)); } catch (failure) { setError(failure.message); } }}>
    <h3>{commands[action][0]}</h3>
    <p role="status">{busy ? "Saving…" : ["create", "edit"].includes(action) && form.savedDraft === JSON.stringify(draft) && action === "edit" ? "Draft saved to the project." : localSaved ? "Unfinished work saved in this browser tab." : "Changes are not yet saved. Keep this page open."}</p>
    <p>{["create", "edit"].includes(action) ? "Assessment text saves automatically after a short pause. Saving a draft does not submit it for review." : "Your unfinished entries are kept in this tab. Use the action button below to record the change; nothing is submitted automatically."} Tab drafts are not shared with other devices and are lost when this tab is closed.</p>
    <fieldset disabled={busy}>
      {["create", "edit"].includes(action) && <><p>Describe capacity, suitability for this particular project role and any material concerns. Drafts may be incomplete; all three narratives are required before submission.</p>{Object.entries(fields).map(([key, title]) => <React.Fragment key={key}>{textarea(key, title)}</React.Fragment>)}{action === "edit" && textarea("reason", record?.currentSubmission ? "Reason for changes (required)" : "Reason for changes (optional)", !!record?.currentSubmission)}</>}
      {action === "submit" && textarea("note", "Submission note (optional)")}
      {action === "review" && <><label>Review outcome<select required value={draft.decision} onChange={e => update("decision", e.target.value)}><option value="">Select outcome</option><option value="SUITABLE_FOR_STATED_ROLE">Suitable for the stated role</option><option value="NOT_RECOMMENDED_FOR_STATED_ROLE">Not recommended for the stated role</option></select></label>{textarea("decisionExplanation", "Decision explanation", true)}{textarea("evidenceGapExplanation", record?.requiresEvidenceGapExplanation ? "Missing evidence explanation (required)" : "Missing evidence explanation (optional)", record?.requiresEvidenceGapExplanation)}<p>Either outcome records a review for this project role. It does not change the role, project approval or funding permissions.</p></>}
      {action === "evidence" && <><EvidencePicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.documentId} onSelect={id => update("documentId", id)} /><label>Evidence purpose<select value={draft.purpose} onChange={e => update("purpose", e.target.value)}><option value="ASSESSMENT">Assessment</option><option value="SUPPORTING">Supporting material</option></select></label>{record?.state === "REVIEWED" && <p>Added after review — outside the recorded decision basis.</p>}</>}
      {!["create", "edit", "submit", "review", "evidence"].includes(action) && <>{action === "withdraw-review" && <p>Withdrawal clears the current review outcome. The decision stays in history. Corrections need resubmission and a new independent review.</p>}{action === "restore" && <p>Restoration restores the retained draft or returned assessment, never a review outcome.</p>}{action === "delete" && <p>History and evidence links remain retained. An administrator can restore this assessment.</p>}{textarea("reason", "Reason", true)}</>}
      {draftValidation && <p role="alert">Automatic saving is waiting: {draftValidation}</p>}
      {error && <p role="alert">{error}</p>}{form.error && <p role="alert">{form.error}</p>}
      {form.reviewRequired && <div role="alert"><p>Your draft is retained. Review the refreshed assessment, evidence and history before retrying. The earlier request may have succeeded; do not repeat it if the intended result is already recorded.</p><button type="button" disabled={reviewBlocked} onClick={onReview}>I reviewed the refreshed state; enable retry</button></div>}
      <div className={styles.actions}><button type="submit" className={approvalStyle(action, styles)} disabled={busy || blocked || form.reviewRequired}><TravelActionIcon action={action} />{["create", "edit"].includes(action) ? "Save draft now" : commands[action][0]}</button><button type="button" onClick={onCancel}>Close</button><button type="button" onClick={() => { if (window.confirm("Discard the unfinished entries in this tab? Any draft already saved to the project will remain.")) onDiscard(); }}>Discard unfinished entries</button></div>
    </fieldset>
  </form>;
}
