import React, { useState } from "react";
import { DecisionSummary, EvidencePicker, TaskPicker } from "./ManagementViews";
import { observationPayload } from "./managementApi";
import styles from "./Management.module.scss";

export const titles = { create: "Create finding or lesson", edit: "Edit observation", response: "Record management response", reviews: "Record review", actions: "Link existing follow-up", evidence: "Link supporting document", resolve: "Record management resolution", reopen: "Reopen record", delete: "Delete record", restore: "Restore record", "actions-remove": "Remove action association", "evidence-remove": "Remove evidence association" };
export default function ManagementEditor({ form, setForm, projectId, authFetch, refresh, busy, blocked, onSave, onCancel, onReview, today }) {
  const [error, setError] = useState("");
  const { action, draft, record } = form;
  const update = (name, value) => setForm(f => ({ ...f, draft: { ...f.draft, [name]: value } }));
  const requiredReason = ["edit", "resolve", "reopen", "delete", "restore", "actions-remove", "evidence-remove"].includes(action) || (action === "response" && !!record.response);
  const dateInput = (key, name, min = "1000-01-01") => <label>{name}<input type="date" required min={min} max={today || "9999-12-31"} value={draft[key] || ""} onChange={e => update(key, e.target.value)} /></label>;
  const textArea = (key, name, required = true) => <label>{name}<textarea rows={3} required={required} value={draft[key] || ""} onChange={e => update(key, e.target.value)} /></label>;
  return <form className={styles.panel} aria-label={titles[action]} onSubmit={e => {
    e.preventDefault(); if (busy || blocked || form.reviewRequired) return;
    setError("");
    if (requiredReason && (!draft.reason?.trim() || [...draft.reason.trim()].length > 1000)) { setError("Enter a reason of 1–1,000 characters."); return; }
    let body = {};
    if (["create", "edit"].includes(action)) {
      if (!draft.title.trim() || [...draft.title.trim()].length > 200 || !draft.observation.trim() || [...draft.observation.trim()].length > 4000 || [...draft.sourceReference.trim()].length > 500 || !draft.sourceType || !draft.observedDate) { setError("Enter a title (up to 200 characters), observation (up to 4,000), source type and observation date. Source reference allows up to 500 characters."); return; }
      body = observationPayload(draft, action === "create");
    }
    if (action === "response") {
      if (!draft.text?.trim() || [...draft.text.trim()].length > 4000) { setError("Explain the response in 1–4,000 characters."); return; }
      body = { disposition: draft.disposition, text: draft.text.trim(), responseDate: draft.responseDate };
    }
    if (action === "reviews") {
      if (!draft.note?.trim() || [...draft.note.trim()].length > 1000) { setError("Enter a review note of 1–1,000 characters."); return; }
      body = { reviewDate: draft.reviewDate, note: draft.note.trim() };
    }
    if (action === "actions") {
      if (!draft.followUp) { setError("Select the existing follow-up you reviewed."); return; }
      body = { followUpId: draft.followUp.id, expectedFollowUpRevision: draft.followUp.revision };
    }
    if (action === "evidence") {
      if (!draft.documentId) { setError("Select an available exact document version."); return; }
      body = { documentId: draft.documentId };
    }
    if (action === "resolve") {
      const explanation = draft.outstandingActionExplanation?.trim() || null;
      if ((record.requiresOutstandingActionExplanation && !explanation) || (explanation && [...explanation].length > 1000)) { setError("Explain the outstanding actions in 1–1,000 characters."); return; }
      body = { resolvedDate: draft.resolvedDate, expectedFollowUpRevisions: form.manifest, outstandingActionExplanation: explanation };
    }
    if (requiredReason) body.reason = draft.reason.trim();
    onSave(body);
  }}>
    <h3>{titles[action]}</h3>
    <fieldset disabled={busy}>
      {["create", "edit"].includes(action) && <>
        {action === "create" ? <label>Record type<select value={draft.type} onChange={e => update("type", e.target.value)}><option value="FINDING">Finding</option><option value="LESSON">Lesson learned</option></select></label> : <p>Record type is retained: {record.type.toLowerCase()}.</p>}
        <label>Title<input required value={draft.title} onChange={e => update("title", e.target.value)} /></label>
        {textArea("observation", "Observation")}
        <label>Source type<select required value={draft.sourceType} onChange={e => update("sourceType", e.target.value)}><option value="">Select source</option><option value="EVALUATION">Evaluation</option><option value="REPORT">Report</option><option value="REVIEW">Review</option><option value="OPERATIONAL_EXPERIENCE">Operational experience</option></select></label>
        <label>Source reference (optional)<input value={draft.sourceReference} onChange={e => update("sourceReference", e.target.value)} /></label>{dateInput("observedDate", "Observed on")}
      </>}
      {action === "response" && <><label>Response disposition<select value={draft.disposition} onChange={e => update("disposition", e.target.value)}><option value="ACTIONS_REQUIRED">Actions required</option><option value="NO_ACTION_REQUIRED">No action required</option></select></label>{textArea("text", draft.disposition === "NO_ACTION_REQUIRED" ? "Explain why no action is required" : "Management response")}{dateInput("responseDate", "Response date", record.observedDate)}<p className={styles.muted}>Actions required needs a linked follow-up before resolution. No action required needs all active action associations removed first. Earlier responses remain in history.</p></>}
      {action === "reviews" && <>{dateInput("reviewDate", "Review date", record.observedDate)}{textArea("note", "Review note")}<p>A review does not resolve the record or complete tasks.</p></>}
      {action === "actions" && <TaskPicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.followUp} onSelect={task => update("followUp", task)} />}
      {action === "evidence" && <EvidencePicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.documentId} onSelect={id => update("documentId", id)} />}
      {action === "resolve" && <><p>This records a management decision. It does not complete linked tasks or certify that the finding has been remedied.</p><DecisionSummary record={record} /><p>Task revisions reviewed for this decision: {Object.entries(form.manifest || {}).map(([id, revision]) => `#${id} (revision ${revision})`).join(", ") || "No active action links"}.</p>{dateInput("resolvedDate", "Resolution date", [record.observedDate, record.response?.responseDate, record.latestReview?.reviewDate].filter(Boolean).sort().at(-1))}{textArea("outstandingActionExplanation", record.requiresOutstandingActionExplanation ? "Outstanding-action explanation (required)" : "Outstanding-action explanation (optional)", record.requiresOutstandingActionExplanation)}</>}
      {action === "reopen" && <p>Reopening allows changes and later reaffirmation. The previous decision stays in history; linked tasks and evidence remain.</p>}
      {action === "delete" && <p>This hides the record from the active register and retains its state, responses and links. An administrator can restore it.</p>}
      {action.endsWith("-remove") && <p>Remove association #{form.link.id}. Its history is retained; the linked task or document is not deleted.</p>}
      {requiredReason && textArea("reason", "Reason")}
      {error && <p role="alert">{error}</p>}{form.error && <p role="alert">{form.error}</p>}
      {form.reviewRequired && <div role="alert"><p>Draft retained. Review the refreshed record, links and history before trying again. A failed response may follow a successful save.{action === "create" ? " Check the list before creating again to avoid duplicates." : ""}</p><button type="button" disabled={blocked} onClick={onReview}>I reviewed the refreshed state; enable retry</button></div>}
      <div className={styles.actions}><button type="submit" disabled={busy || blocked || form.reviewRequired}>Save {titles[action].toLowerCase()}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
