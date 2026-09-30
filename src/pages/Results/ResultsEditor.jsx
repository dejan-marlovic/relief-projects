import React, { useState } from "react";
import { BASE_URL } from "../../config/api";
import { indicatorPayload, measurementError, useIndicatorRead } from "./indicatorApi";
import { MeasurementBasis, ReadState } from "./ResultViews";
import styles from "./Results.module.scss";

export function DocumentChoices({ authFetch, projectId, selected, onChange, refresh }) {
  const state = useIndicatorRead(authFetch, `${BASE_URL}/api/documents/project/${projectId}`, refresh);
  const docs = Array.isArray(state.data) ? state.data.filter(d => d.isDeleted === false && String(d.projectId) === String(projectId)) : [];
  return <fieldset><legend>Supporting documents · exact versions</legend><p className={styles.muted}>Choose up to 20 versions explicitly. Historical versions are included. Evidence supports a report; it does not verify it.</p><ReadState state={state} />
    <div className={styles.documents}>{docs.map(d => <label key={d.id}><input type="checkbox" checked={selected.includes(d.id)} onChange={e => onChange(e.target.checked ? [...selected, d.id] : selected.filter(id => id !== d.id))} disabled={!selected.includes(d.id) && selected.length >= 20} />{d.documentName || `Document #${d.id}`} · Version {d.versionNumber ?? "unknown"} · #{d.id} · {d.status || "Unknown status"}</label>)}</div>
    {state.data && !docs.length && <p>No active document versions available for this project.</p>}
    {selected.some(id => !docs.some(d => d.id === id)) && <p>Some selected versions are not in the current list. Review their availability before saving. <button type="button" onClick={() => onChange([])}>Clear selection</button></p>}
  </fieldset>;
}

export default function ResultsEditor({ form, setForm, indicator, authFetch, projectId, busy, onSave, onCancel, refresh, blocked, onReview }) {
  const [error, setError] = useState("");
  const { action, draft, reason = "", result } = form;
  const isIndicator = action === "create" || action === "edit";
  const isReport = ["report", "correct", "reuse"].includes(action);
  const frozen = action === "edit" && indicator?.measurementBasisFrozen;
  const change = (key, value) => setForm(f => ({ ...f, draft: { ...f.draft, [key]: value } }));
  const input = (key, label, props = {}) => <label>{label}<input value={draft[key] ?? ""} onChange={e => change(key, e.target.value)} {...props} /></label>;
  const needsReason = !["create", "report", "evidence"].includes(action);
  const title = { create: "Create indicator", edit: "Edit indicator", report: "Record result", correct: "Correct report", reuse: "Report again for voided date", void: "Void report", delete: "Delete indicator", restore: "Restore indicator", evidence: "Add supporting document", remove: "Remove evidence association" }[action];
  return <form className={styles.panel} aria-label={title} onSubmit={event => {
    event.preventDefault(); setError("");
    if (isIndicator || isReport) {
      const type = isIndicator ? draft.measurementType : action === "correct" ? result.basis?.measurementType : indicator.measurementType;
      const issue = measurementError(isIndicator ? draft.targetValue : draft.value, type) || (isIndicator && draft.baselineKnown && measurementError(draft.baselineValue, type));
      if (issue) { setError(issue); return; }
    }
    if (needsReason && (!reason.trim() || [...reason.trim()].length > 1000)) { setError("Enter a reason of 1–1,000 characters."); return; }
    let body = {};
    if (isIndicator) body = indicatorPayload(draft, frozen);
    if (isReport) {
      body = { value: draft.value, notes: draft.notes?.trim() || null, documentIds: draft.documentIds || [] };
      if (action !== "correct") body.asOfDate = draft.asOfDate;
      if (action === "reuse") body.replacesVoidedResultId = result.id;
    }
    if (action === "evidence") body.documentId = Number(draft.documentId);
    if (needsReason || reason.trim()) body.reason = reason.trim();
    onSave(body);
  }}>
    <h3>{title}{result ? ` · Report #${result.id}` : ""}</h3>
    <fieldset disabled={busy}>
      {isIndicator && <>
        {input("name", "Indicator name", { required: true, maxLength: 400 })}
        {frozen && <p>Reporting has started. The measurement definition, unit, dates and baseline are frozen, even if reports are voided. Name, notes and target can still change with a reason. Earlier reports retain their recorded targets.</p>}
        <fieldset disabled={frozen}><label>Definition and population<textarea required value={draft.definition} onChange={e => change("definition", e.target.value)} rows={3} /></label>
          <p className={styles.muted}>Explain who or what is counted, how duplicates are excluded, and—for percentages—the cumulative numerator and denominator.</p>
          <div className={styles.grid}><label>Measurement type<select value={draft.measurementType} onChange={e => change("measurementType", e.target.value)}><option value="COUNT">Count (whole numbers)</option><option value="QUANTITY">Quantity</option><option value="PERCENTAGE">Percentage (0–100)</option></select></label>
            {draft.measurementType !== "PERCENTAGE" ? input("unit", "Unit", { required: true }) : <p>Unit: %</p>}
            <label>Target direction<select value={draft.direction} onChange={e => change("direction", e.target.value)}><option value="HIGHER_IS_BETTER">Higher is better (at least)</option><option value="LOWER_IS_BETTER">Lower is better (at most)</option></select></label>
            {input("periodStart", "Reporting starts", { type: "date", required: true, min: "1000-01-01", max: draft.periodEnd || "9999-12-31" })}
            {input("periodEnd", "Reporting ends (inclusive)", { type: "date", required: true, min: draft.periodStart || "1000-01-01", max: "9999-12-31" })}
          </div>
          <label><input type="checkbox" checked={draft.baselineKnown} onChange={e => change("baselineKnown", e.target.checked)} />Baseline is known</label>
          {draft.baselineKnown ? <div className={styles.grid}>{input("baselineValue", "Baseline value", { required: true, inputMode: "decimal" })}{input("baselineDate", "Baseline date", { required: true, type: "date", min: "1000-01-01", max: draft.periodStart || "9999-12-31" })}</div> : <p>Baseline: unknown. No value will be inferred.</p>}
        </fieldset>
        {input("targetValue", "Target value", { required: true, inputMode: "decimal" })}
      </>}
      {isReport && <>
        <p>Enter the full period-to-date measurement, not the increase since the last report. Baselines are not subtracted automatically.</p>
        {action === "correct" ? <><p>Correction keeps the date {result.asOfDate} and original measurement basis. Notes and evidence below replace the old selections; choose evidence explicitly.</p><MeasurementBasis basis={result.basis} /></> : input("asOfDate", "Measured through (inclusive)", { type: "date", required: true, readOnly: action === "reuse", min: indicator.periodStart, max: indicator.today < indicator.periodEnd ? indicator.today : indicator.periodEnd })}
        {action === "reuse" && <p>This explicitly replaces voided report #{result.id} using the current measurement basis and target.</p>}
        {input("value", `Reported value (${action === "correct" ? result.basis?.unit : indicator.unit})`, { required: true, inputMode: "decimal" })}
        <p className={styles.muted}>Business date: {indicator.today} · {indicator.businessTimezone}</p>
        <DocumentChoices authFetch={authFetch} projectId={projectId} selected={draft.documentIds || []} onChange={ids => change("documentIds", ids)} refresh={refresh} />
      </>}
      {(isIndicator || isReport) && <label>Notes (optional)<textarea value={draft.notes || ""} onChange={e => change("notes", e.target.value)} rows={3} /></label>}
      {action === "evidence" && <><DocumentChoices authFetch={authFetch} projectId={projectId} selected={draft.documentId ? [Number(draft.documentId)] : []} onChange={ids => change("documentId", ids.at(-1) || "")} refresh={refresh} /><input className={styles.srOnly} aria-label="Selected document ID" required value={draft.documentId || ""} readOnly /></>}
      {action === "void" && <p>Voiding marks this report as erroneous. It retains the report and evidence and does not mean an adverse outcome. A superseded report will not become effective again.</p>}
      {action === "delete" && <p>The indicator will be hidden from the active list. Its reports and history remain available; an administrator can restore it.</p>}
      {action === "remove" && <p>This removes the active association, retaining its document version and history.</p>}
      {needsReason && <label>Reason<textarea required value={reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></label>}
      {error && <p role="alert">{error}</p>}
      {form.error && <p role="alert">{form.error}</p>}
      {form.reviewRequired && <p>Draft retained. Inspect the refreshed records and history before retrying. A failed response may follow a successful save. {action === "create" && "Check every relevant list page before creating again; retrying can create a duplicate indicator."} <button type="button" disabled={blocked} onClick={onReview}>I reviewed the refreshed records; enable retry</button></p>}
      <div className={styles.actions}><button type="submit" disabled={blocked || form.reviewRequired || (action === "evidence" && !draft.documentId)}>Save {title.toLowerCase()}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
