import React, { useState } from "react";
import TravelActionIcon, { approvalStyle } from "./TravelActionIcon";
import { BASE_URL } from "../../config/api";
import { EvidencePicker, TaskPicker } from "../Management/ManagementViews";
import { ReadState } from "../Results/ResultViews";
import { employeeName, titles, travelPayload, useTravelRead } from "./travelApi";
import styles from "./Travel.module.scss";

export default function TravelEditor({ form, setForm, projectId, authFetch, refresh, busy, blocked, onSave, onCancel, onReview }) {
  const [error, setError] = useState("");
  const { action, draft, record } = form;
  const editing = ["create", "edit"].includes(action);
  const employees = useTravelRead(authFetch, editing ? `${BASE_URL}/api/employees/active` : null, refresh);
  const people = Array.isArray(employees.data) ? employees.data : [];
  const update = (key, value) => setForm(f => ({ ...f, draft: { ...f.draft, [key]: value } }));
  const reasonRequired = ["return", "withdraw-approval", "cancel", "delete", "restore", "actions-remove", "evidence-remove"].includes(action) || (action === "edit" && !!record.currentSubmission);
  const text = (key, name, required = true) => <label>{name}<textarea rows={3} required={required} value={draft[key] || ""} onChange={e => update(key, e.target.value)} /></label>;
  return <form className={styles.panel} aria-label={titles[action]} onSubmit={e => { e.preventDefault(); if (busy || blocked || form.reviewRequired) return; setError(""); try { onSave(travelPayload(form)); } catch (err) { setError(err.message); } }}>
    <h3>{titles[action]}</h3><fieldset disabled={busy}>
      {editing && <><ReadState state={employees} /><label>Traveller<select required value={draft.travellerEmployeeId} onChange={e => update("travellerEmployeeId", e.target.value)}><option value="">Select an employee</option>{record?.traveller && !people.some(p => p.id === record.travellerEmployeeId) && <option value={record.travellerEmployeeId}>{record.traveller.displayName} (retained traveller)</option>}{people.map(p => <option key={p.id} value={p.id}>{employeeName(p)}</option>)}</select></label>
        {text("purpose", "Purpose")}<label>Destination<input required value={draft.destination} onChange={e => update("destination", e.target.value)} /></label>
        <div className={styles.grid}>{[["departureDate", "Planned departure"], ["returnDate", "Planned return"]].map(([key, name]) => <label key={key}>{name}<input type="date" required min={key === "returnDate" ? draft.departureDate || "1000-01-01" : "1000-01-01"} max="9999-12-31" value={draft[key]} onChange={e => update(key, e.target.value)} /></label>)}</div>
        {text("notes", "Notes (optional)", false)}<p className={styles.muted}>One employee per request. Past drafts can be saved; submission and approval require departure today or later. Keep notes to general operational information.</p></>}
      {["submit", "approve"].includes(action) && <>{text("note", action === "approve" ? "Approval note" : "Submission note (optional)", action === "approve")}<p>{action === "approve" ? `Approve submission #${record.currentSubmission.id}. Another independent person must approve: the traveller, creator and latest submitter cannot approve, including as ADMIN.` : "Submitting freezes the trip details and current links until a decision is made."}</p></>}
      {action === "return" && <p>Return submission #{record.currentSubmission.id} for changes. This grants no travel approval.</p>}
      {action === "withdraw-approval" && <p>Withdraw approval #{record.currentApproval.id}. Earlier approval stays in history; changes require resubmission and a new approval.</p>}
      {action === "cancel" && <p>Cancellation is terminal and removes current authorization. A new trip requires a new request.</p>}
      {action === "delete" && <p>Hide this request from the active register. Its decisions and links remain in history.</p>}
      {action === "restore" && <p>Restore the retained request in its existing state. Restoration never reinstates approval or reopens a cancelled request.</p>}
      {action === "actions" && <><label>Follow-up purpose<select value={draft.actionPurpose} onChange={e => update("actionPurpose", e.target.value)}><option value="PREPARATION">Preparation</option><option value="REPORTING">Reporting</option></select></label><TaskPicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.followUp} onSelect={value => update("followUp", value)} /></>}
      {action === "evidence" && <EvidencePicker projectId={projectId} authFetch={authFetch} refresh={refresh} selected={draft.documentId} onSelect={value => update("documentId", value)} />}
      {["actions", "evidence"].includes(action) && record.state === "APPROVED" && <p>Added after approval: this link will remain outside the original approved submission.</p>}
      {action.endsWith("-remove") && <p>Remove association #{form.link.id}. The task or document and retained association history are preserved.</p>}
      {reasonRequired && text("reason", "Reason")}
      {error && <p role="alert">{error}</p>}{form.error && <p role="alert">{form.error}</p>}
      {form.reviewRequired && <div role="alert"><p>Draft retained. Review the refreshed request, decision basis, links and history before retrying. A failed response may follow a successful save.{action === "create" ? " Check the list before creating again to avoid duplicates." : ""}</p><button type="button" disabled={blocked} onClick={onReview}>I reviewed the refreshed state; enable retry</button></div>}
      <div className={styles.actions}><button type="submit" className={approvalStyle(action, styles)} disabled={busy || blocked || form.reviewRequired}><TravelActionIcon action={action} />Save {titles[action].toLowerCase()}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
