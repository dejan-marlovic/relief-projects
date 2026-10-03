import React, { useEffect, useRef, useState } from "react";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import { WorkflowStep } from "../../components/Workflow/Workflow";
import { Attribution, HistorySnapshot, Issues, ReadState } from "../Results/ResultViews";
import { label, readTravel, useTravelRead } from "./travelApi";
import { Associations } from "./TravelViews";
import { ReportAccount, ReportBasis, ReportDecisions, ReportHistory } from "./TravelReportViews";
import TravelReportEditor from "./TravelReportEditor";
import { reportCommands, reportDraft, reportTitles } from "./travelReportApi";
import TravelActionIcon, { approvalStyle } from "./TravelActionIcon";
import styles from "./Travel.module.scss";

export default function TravelReport({ endpoint: travelEndpoint, projectId, travel, authFetch, refresh, reload, parentLocked, onActivityChange }) {
  const endpoint = `${travelEndpoint}/report`;
  const state = useTravelRead(authFetch, endpoint, refresh);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const [savedRevision, setSavedRevision] = useState(null);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { onActivityChange?.(!!form || busy); return () => onActivityChange?.(false); }, [form, busy, onActivityChange]);
  useUnsavedChange(`travel-report-${projectId}-${travel.id}`, !!form);
  const validEnvelope = state.data && Object.prototype.hasOwnProperty.call(state.data, "report") && Number.isSafeInteger(state.data.travelRevision);
  const data = validEnvelope ? state.data : null, record = data?.report;
  const awaitingSavedReport = savedRevision != null && (record?.revision ?? -1) < savedRevision;
  const mismatchedTravel = !!data && travel.revision !== data.travelRevision;
  const stale = !!form && !!data && (form.expectedTravelRevision !== data.travelRevision || form.expectedRevision !== record?.revision || mismatchedTravel);
  const reviewRequired = !!form && (form.reviewRequired || stale);
  const kind = form?.action?.endsWith("-remove") ? form.action.split("-")[0] : null;
  const removal = useTravelRead(authFetch, kind ? `${endpoint}/${kind}?includeRemoved=${form.link.includeRemoved}&page=${form.link.page}&size=20` : null, refresh);
  const history = useTravelRead(authFetch, reviewRequired && record ? `${endpoint}/history?page=0&size=20` : null, refresh);
  const permitted = form?.action === "create" ? data?.canCreate && !record : kind ? removal.data?.content?.some(row => row.id === form.link.id && row.permissions?.canRemove) : record?.permissions?.[reportCommands[form?.action]?.[1]];
  const blocked = parentLocked || awaitingSavedReport || state.loading || !data || mismatchedTravel || !permitted || removal.loading;
  const reviewBlocked = blocked || (record && (history.loading || !history.data || !!history.error));
  const locked = parentLocked || awaitingSavedReport || !!form || busy || state.loading || !data || mismatchedTravel;
  function open(action, link) {
    setForm({ action, link, record, draft: reportDraft(action === "edit" ? record : undefined), expectedRevision: record?.revision, expectedTravelRevision: data.travelRevision });
  }
  async function save(body) {
    if (pending.current || blocked || reviewRequired) return;
    pending.current = true; setBusy(true);
    const action = form.action;
    const path = ["create", "edit"].includes(action) ? "" : kind ? `/${kind}/${form.link.id}/remove` : `/${action}`;
    const payload = { ...body, expectedTravelRevision: form.expectedTravelRevision, ...(action !== "create" ? { expectedRevision: form.expectedRevision } : {}) };
    try {
      const result = await authFetch(`${endpoint}${path}`, { method: action === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(readTravel);
      if (!result.report || !Number.isSafeInteger(result.report.revision) || !Number.isSafeInteger(result.travelRevision)) throw new Error("The save response was incomplete. Check the refreshed report before retrying.");
      if (alive.current) { setSavedRevision(result.report.revision); setForm(null); }
    } catch (err) { if (alive.current) setForm(f => ({ ...f, error: err.message, reviewRequired: true })); }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  const buttons = actions => <div className={styles.actions}>{actions.map(action => {
    const [title, flag] = reportCommands[action];
    const styleAction = action === "accept" ? "approve" : action === "reopen" ? "return" : action;
    return record?.permissions?.[flag] && <button key={action} disabled={locked} className={approvalStyle(styleAction, styles)} onClick={() => open(action)}><TravelActionIcon action={styleAction} />{title}</button>;
  })}</div>;
  const reviewForm = form && ["submit", "accept", "return", "reopen"].includes(form.action);
  const editor = form && <><TravelReportEditor key={form.action} form={form} setForm={setForm} endpoint={travelEndpoint} projectId={projectId} authFetch={authFetch} refresh={refresh} today={data?.today} busy={busy} blocked={blocked} reviewRequired={reviewRequired} reviewBlocked={reviewBlocked} onSave={save} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, record, expectedRevision: record?.revision, expectedTravelRevision: data.travelRevision, reviewRequired: false, error: "", draft: f.action === "actions" ? { ...f.draft, followUp: null } : f.draft }))} /><ReadState state={history} /><ReadState state={removal} /></>;
  return <section aria-label="Post-trip reporting">
    <p className={styles.muted}>After travel concludes—or when it was not taken—record what actually happened, then request independent review. Reports and acceptance remain separate from travel authorization, payments and task completion.</p>
    <button disabled={busy} onClick={reload}>Refresh report, travel and history</button><ReadState state={state} />
    {state.data && !validEnvelope && <p role="alert">Report response unavailable. Refresh after checking the backend deployment.</p>}
    {awaitingSavedReport && <p role="status">Refreshing the saved report before enabling another change…</p>}
    {mismatchedTravel && <p role="alert">The travel request changed. Refresh report and travel together before making a report decision.</p>}
    <Issues issues={data?.issues} />
    <details><summary>Current live travel plan and authorization</summary><dl className={styles.snapshot}><dt>Traveller</dt><dd>{travel.traveller?.displayName}</dd><dt>Purpose</dt><dd>{travel.purpose}</dd><dt>Destination</dt><dd>{travel.destination}</dd><dt>Planned dates</dt><dd>{travel.departureDate} through {travel.returnDate}</dd><dt>Authorization state</dt><dd>{label(travel.state)}</dd></dl><p>This is the current request, separate from the report’s captured plan and actual dates.</p></details>
    <WorkflowStep number={3} title="Report the actual outcome" description="Choose a saved approval or an explicit unapproved plan basis. Record actual dates, outcome and any differences. Add exact report documents and existing follow-ups; nothing is inherited automatically from the trip plan." keepOpen={!!form && !reviewForm}>
      {data && !record && <p>No post-trip report recorded. This does not mean the trip failed or that a report is overdue.</p>}
      {data?.canCreate && !record && <button disabled={locked} onClick={() => open("create")}>{reportTitles.create}</button>}
      {record && <><p><span className={`${styles.statusBadge} ${styles[`status${record.state === "ACCEPTED" ? "APPROVED" : record.state}`] || ""}`}>Report {label(record.state)}</span>{record.isDeleted ? " · Deleted report — restore this retained report instead of creating another" : ""}</p><ReportBasis basis={record.planBasis} /><ReportAccount report={record} />
        <p>Report created <Attribution at={record.createdAt} actor={record.createdBy} /></p>
        <details><summary>Current travel authorization observation</summary><HistorySnapshot value={record.authorizationObservation} /></details>
        {record.linkedActionSummary && <p>Report follow-ups across all active links: {record.linkedActionSummary.completed} completed · {record.linkedActionSummary.open} open · {record.linkedActionSummary.unavailable} unavailable.</p>}
        {record.state === "SUBMITTED" && <p>Report content and associations are frozen until a reviewer accepts or returns the submission.</p>}
        {record.state === "ACCEPTED" && <p>Reopen before correcting the accepted account or removing accepted links. Late links stay outside the acceptance.</p>}
        {buttons(["edit", "basis", "evidence", "actions", "delete", "restore"])}
      </>}
      {!reviewForm && editor}
      {record && <><Associations kind="evidence" endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked} reportMode approved={record.state === "ACCEPTED"} /><Associations kind="actions" endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked} reportMode approved={record.state === "ACCEPTED"} /></>}
    </WorkflowStep>
    <WorkflowStep number={4} title="Review and accept the report" description="Submit the saved account for an independent reviewer to accept or return with a note. Accepted corrections require reopening, editing, resubmission and a new acceptance. This reviews a user-reported account; it does not verify outcomes or approve expenses." keepOpen={!!reviewForm}>
      {record ? <><ReportDecisions report={record} />{!record.currentSubmission && <p>No current report submission. Prepare and save the account before submitting it.</p>}{buttons(["submit", "accept", "return", "reopen"])}</> : <p>Create and prepare a report before requesting review.</p>}
      {reviewForm && editor}
    </WorkflowStep>
    {record && <ReportHistory endpoint={endpoint} authFetch={authFetch} refresh={refresh} />}
  </section>;
}
