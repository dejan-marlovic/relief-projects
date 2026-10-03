import React, { useState } from "react";
import { EvidencePicker, TaskPicker } from "../Management/ManagementViews";
import { ApprovalBasisPicker, ReportDecisions } from "./TravelReportViews";
import TravelActionIcon, { approvalStyle } from "./TravelActionIcon";
import { reportPayload, reportTitles } from "./travelReportApi";
import styles from "./Travel.module.scss";

export default function TravelReportEditor({ form, setForm, endpoint, projectId, authFetch, refresh, today, busy, blocked, reviewRequired, reviewBlocked, onReview, onSave, onCancel }) {
  const [error, setError] = useState("");
  const { action, draft, record } = form;
  const update = (key, value) => setForm(f => ({ ...f, draft: { ...f.draft, [key]: value } }));
  const text = (key, title, required = false) => <label>{title}<textarea rows={3} required={required} value={draft[key] || ""} onChange={e => update(key, e.target.value)} /></label>;
  const styleAction = action === "accept" ? "approve" : action === "reopen" ? "return" : action;
  return <form aria-label={reportTitles[action]} className={styles.panel} onSubmit={e => {
    e.preventDefault(); if (busy || blocked || reviewRequired) return;
    setError(""); try { onSave(reportPayload(form)); } catch (err) { setError(err.message); }
  }}>
    <h3>{reportTitles[action]}</h3><fieldset disabled={busy}>
      {["create", "basis"].includes(action) && <ApprovalBasisPicker endpoint={endpoint} authFetch={authFetch} refresh={refresh} value={draft.basisApprovalId} onChange={value => update("basisApprovalId", value)} />}
      {["create", "edit"].includes(action) && <>
        <label>Reported outcome<select value={draft.outcome} onChange={e => update("outcome", e.target.value)}><option value="">Not assessed — draft</option><option value="COMPLETED">Completed travel</option><option value="PARTIALLY_COMPLETED">Partially completed — concluded but curtailed</option><option value="NOT_TAKEN">Not taken — no travel occurred</option></select></label>
        <p>Record actual dates yourself; planned dates are not proof of travel. Ongoing travel or unknown actual dates should remain a draft. For Not taken, explicitly clear both date fields.</p>
        <div className={styles.grid}>{[["actualDepartureDate", "Actual departure"], ["actualReturnDate", "Actual return"]].map(([key, title]) => <label key={key}>{title}<input type="date" min={key === "actualReturnDate" ? draft.actualDepartureDate || "1000-01-01" : "1000-01-01"} max={today} value={draft[key]} onChange={e => update(key, e.target.value)} /></label>)}</div>
        {text("outcomeSummary", "Outcome summary (required before submission)")}
        <label>Material differences from purpose, destination or scope<select value={draft.materialDifferences} onChange={e => update("materialDifferences", e.target.value)}><option value="">Not assessed</option><option value="false">No material differences</option><option value="true">Yes — explain below</option></select></label>
        {text("explanation", "Explanation of differences or exceptional authorization")}
        <p className={styles.muted}>Explain partial or untaken travel, changed dates, material differences, an unapproved or withdrawn basis, cancellation or approval recorded after departure. Partial and untaken outcomes require Yes for material differences. An incomplete draft can be saved; submission checks completeness.</p>
      </>}
      {action === "submit" && <>{text("note", "Report submission note (optional)")}<p>Submit the saved account and its current links for independent review. Submission freezes report content and associations; it does not change travel authorization or complete tasks.</p></>}
      {action === "accept" && <><ReportDecisions report={record} />{text("note", "Report review note", true)}<p>Accept report submission #{record.currentSubmission?.id}. You must be independent of the report creator, latest submitter and captured traveller, including their Employee identities. Acceptance is not verification of outcomes, travel authorization, expense approval or reconciliation.</p></>}
      {action === "return" && <p>Return report submission #{record.currentSubmission?.id} for changes without granting acceptance.</p>}
      {action === "reopen" && <p>Reopen acceptance #{record.currentAcceptance?.id}. Correction requires a reasoned edit, resubmission and a new independent acceptance. Earlier decisions remain in history.</p>}
      {action === "delete" && <p>Delete this draft or returned report from active use. History is retained; a second report cannot replace it.</p>}
      {action === "restore" && <p>Restore the same report in its nonaccepted state. This does not reinstate acceptance.</p>}
      {action === "actions" && <TaskPicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.followUp} onSelect={value => update("followUp", value)} />}
      {action === "evidence" && <EvidencePicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.documentId} onSelect={value => update("documentId", value)} />}
      {["actions", "evidence"].includes(action) && record?.state === "ACCEPTED" && <p>This is a late association, outside the accepted submission. Acceptance will not be rewritten.</p>}
      {action.endsWith("-remove") && <p>Remove association #{form.link.id}. The document or task and retained history remain.</p>}
      {["edit", "basis", "return", "reopen", "delete", "restore", "evidence-remove", "actions-remove"].includes(action) && text("reason", "Report change reason", action !== "edit" || !!record?.currentSubmission)}
      {action === "edit" && !record?.currentSubmission && <p className={styles.muted}>A change reason is optional before the first report submission.</p>}
      {error && <p role="alert">{error}</p>}{form.error && <p role="alert">{form.error}</p>}
      {reviewRequired && <div role="alert"><p>Draft retained. Review the refreshed report, travel request, links and report history. Check whether the intended change already succeeded before enabling an explicit retry. Nothing is retried automatically.</p><button type="button" disabled={reviewBlocked} onClick={onReview}>I reviewed report and travel state; use current revisions</button></div>}
      <p className={styles.muted}>Selected travel revision: {form.expectedTravelRevision}{form.expectedRevision != null ? ` · Report revision: ${form.expectedRevision}` : " · New report"}. Refreshing retains this draft and its original revisions until you explicitly review.</p>
      <div className={styles.actions}><button type="submit" disabled={busy || blocked || reviewRequired} className={approvalStyle(styleAction, styles)}><TravelActionIcon action={styleAction} />Save {reportTitles[action].toLowerCase()}</button><button type="button" onClick={onCancel}>Cancel report draft</button></div>
    </fieldset>
  </form>;
}
