import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { blankIndicator, indicatorDraft, readIndicator, useIndicatorRead, words } from "./indicatorApi";
import { Attribution, HistorySnapshot, Issues, MeasurementBasis, Pagination, ReadState, ResultSummary } from "./ResultViews";
import ResultsEditor from "./ResultsEditor";
import styles from "./Results.module.scss";

function Evidence({ result, endpoint, authFetch, refresh, open, locked }) {
  const [page, setPage] = useState(0), [error, setError] = useState("");
  const state = useIndicatorRead(authFetch, `${endpoint}/results/${result.id}/evidence?page=${page}&size=20`, refresh);
  return <section aria-label={`Evidence for report ${result.id}`}><ReadState state={state} />{error && <p role="alert">{error}</p>}
    {state.data?.content.map(e => <article className={styles.panel} key={e.id}>
      <strong>{e.capturedName || `Document #${e.documentId}`} · Version {e.versionNumber ?? "unknown"}</strong>
      <p>{e.associationActive ? "Linked" : "Association removed"} · {words(e.availability)} · {e.currentStatus || "Unknown document status"}</p>
      <p>Linked <Attribution at={e.linkedAt} actor={e.linkedBy} /></p>
      {e.removedAt && <p>Removed <Attribution at={e.removedAt} actor={e.removedBy} /> · {e.removalReason}</p>}
      <div className={styles.actions}><button disabled={!e.downloadEligible} onClick={async () => { setError(""); try { await downloadDocument(e.documentId, authFetch); } catch (err) { setError(err.message); } }}>Download version {e.versionNumber ?? ""}</button>
        {e.permissions?.canRemove && <button disabled={locked || state.loading} onClick={() => open("remove", result, { ...e, page })}>Remove evidence #{e.id}</button>}
      </div><small>Availability describes metadata; downloading checks file availability.</small>
    </article>)}
    {state.data && !state.data.content.length && <p>No evidence associations.</p>}
    <Pagination data={state.data} page={page} setPage={setPage} label="evidence" disabled={state.loading} />
  </section>;
}
function Report({ result, endpoint, authFetch, refresh, open, indicator, locked }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  return <article className={styles.panel}>
    <h4>Report #{result.id} · {words(result.state)} · Through {result.asOfDate}</h4>
    <p><strong>{result.value} {result.basis?.unit}</strong> · User reported</p><p><Attribution at={result.recordedAt} actor={result.recordedBy} /></p>
    {result.notes && <p className={styles.text}>{result.notes}</p>}{result.reason && <p>Reason: {result.reason}</p>}
    {result.supersedesResultId && <p>Corrects report #{result.supersedesResultId}.</p>}{result.successorResultId && <p>Replaced by report #{result.successorResultId}.</p>}{result.replacesVoidedResultId && <p>Reuses the date of voided report #{result.replacesVoidedResultId}.</p>}
    <details><summary>Recorded measurement basis and target</summary><MeasurementBasis basis={result.basis} /></details>
    <Issues issues={result.issues} />
    <div className={styles.actions}>
      {result.permissions?.canCorrect && <button disabled={locked} onClick={() => open("correct", result)}>Correct report #{result.id}</button>}
      {result.permissions?.canVoid && <button disabled={locked} onClick={() => open("void", result)}>Void report #{result.id}</button>}
      {result.permissions?.canAddEvidence && <button disabled={locked} onClick={() => open("evidence", result)}>Add evidence to #{result.id}</button>}
      {result.state === "VOIDED" && indicator.permissions?.canRecordResult && <button disabled={locked} onClick={() => open("reuse", result)}>Report again for this date</button>}
      <button aria-expanded={evidenceOpen} onClick={() => setEvidenceOpen(v => !v)}>{evidenceOpen ? "Hide" : "Show"} evidence ({result.evidence?.totalElements ?? "…"})</button>
    </div>
    {evidenceOpen && <Evidence result={result} endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} locked={locked} />}
  </article>;
}
function History({ endpoint, authFetch, refresh }) {
  const [page, setPage] = useState(0);
  const state = useIndicatorRead(authFetch, `${endpoint}/history?page=${page}&size=20`, refresh);
  return <section aria-label="Retained indicator history"><h4>Retained decision history</h4><ReadState state={state} /><ol className={styles.history}>{state.data?.content.map(e => <li key={e.id}><h4>{words(e.action)} · Revision {e.revision}</h4><Attribution at={e.occurredAt} actor={e.actor} />{e.reason && <p>Reason: {e.reason}</p>}<details><summary>Before</summary><HistorySnapshot value={e.before} /></details><details><summary>After</summary><HistorySnapshot value={e.after} /></details></li>)}</ol><Pagination data={state.data} page={page} setPage={setPage} label="history" disabled={state.loading} /></section>;
}

function IndicatorDetail({ id, endpoint: base, authFetch, refresh, reload, projectId, onClose }) {
  const endpoint = `${base}/${id}`;
  const state = useIndicatorRead(authFetch, endpoint, refresh);
  const [page, setPage] = useState(0), [filters, setFilters] = useState({ state: "ALL", from: "", to: "" });
  const query = new URLSearchParams({ state: filters.state, page, size: 20 });
  if (filters.from) query.set("asOfFrom", filters.from); if (filters.to) query.set("asOfTo", filters.to);
  const reports = useIndicatorRead(authFetch, `${endpoint}/results?${query}`, refresh);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [inspectId, setInspectId] = useState(null);
  const inspected = useIndicatorRead(authFetch, inspectId ? `${endpoint}/results/${inspectId}` : null, refresh);
  const currentResult = useIndicatorRead(authFetch, form?.result ? `${endpoint}/results/${form.result.id}` : null, refresh);
  const currentEvidence = useIndicatorRead(authFetch, form?.action === "remove" ? `${endpoint}/results/${form.result.id}/evidence?page=${form.evidence.page}&size=20` : null, refresh);
  const reviewHistory = useIndicatorRead(authFetch, form?.reviewRequired ? `${endpoint}/history?page=0&size=20` : null, refresh);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useUnsavedChange(`indicator-${id}`, !!form);
  const indicator = state.data;
  const locked = busy || !!form || state.loading || reports.loading;
  function open(action, result, evidence) {
    setForm({ action, result, evidence, indicator, expectedRevision: indicator.revision, reason: "", draft: action === "edit" ? indicatorDraft(indicator) : { value: action === "correct" ? result.value : "", notes: action === "correct" ? result.notes || "" : "", asOfDate: action === "reuse" ? result.asOfDate : "", documentIds: [] } });
  }
  function allowed() {
    if (!form || !indicator) return false;
    const permission = { edit: "canEdit", report: "canRecordResult", reuse: "canRecordResult", delete: "canDelete", restore: "canRestore" }[form.action];
    if (permission) return indicator.permissions?.[permission];
    const resultPermission = { correct: "canCorrect", void: "canVoid", evidence: "canAddEvidence" }[form.action];
    if (resultPermission) return currentResult.data?.result?.permissions?.[resultPermission];
    return form.action === "remove" && currentEvidence.data?.content.some(e => e.id === form.evidence.id && e.permissions?.canRemove);
  }
  async function save(body) {
    if (pending.current || form.reviewRequired || state.loading || reports.loading || currentResult.loading || currentEvidence.loading || !allowed()) return;
    pending.current = true; setBusy(true);
    const { action, result, evidence } = form;
    let url = endpoint, method = "POST";
    if (action === "edit") method = "PUT";
    else if (["report", "reuse"].includes(action)) url += "/results";
    else if (action === "remove") url += `/results/${result.id}/evidence/${evidence.id}/remove`;
    else if (["correct", "void", "evidence"].includes(action)) url += `/results/${result.id}/${action}`;
    else url += `/${action}`;
    try {
      await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedRevision: form.expectedRevision }) }).then(readIndicator);
      if (alive.current) setForm(null);
    } catch (e) {
      if (alive.current) { setForm(f => ({ ...f, error: e.message, reviewRequired: true })); if (e.existingResultId) setInspectId(e.existingResultId); }
    } finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  return <section className={styles.panel} aria-label="Indicator details"><div className={styles.actions}><button disabled={busy} onClick={reload}>Refresh indicator, reports and history</button><button disabled={busy || !!form} onClick={onClose}>Close indicator</button></div><ReadState state={state} />
    {indicator && <><h3>{indicator.name} · #{id}{indicator.isDeleted ? " · Deleted" : ""}</h3><p className={styles.text}>{indicator.definition}</p><p>{indicator.periodStart} through {indicator.periodEnd} · {words(indicator.measurementType)} · {indicator.unit}</p><p>Baseline: {indicator.baselineKnown ? `${indicator.baselineValue} ${indicator.unit} on ${indicator.baselineDate}` : "Unknown"}</p>{indicator.notes && <p>{indicator.notes}</p>}<Issues issues={indicator.issues} />
      <ResultSummary summary={indicator.summary} unit={indicator.unit} direction={indicator.direction} />
      <div className={styles.actions}>{[["canEdit", "edit", "Edit indicator"], ["canRecordResult", "report", "Record result"], ["canDelete", "delete", "Delete indicator"], ["canRestore", "restore", "Restore indicator"]].map(([p,a,label]) => indicator.permissions?.[p] && <button key={a} disabled={locked} onClick={() => open(a)}>{label}</button>)}</div>
    </>}
    {form && <ResultsEditor form={form} setForm={setForm} indicator={indicator || form.indicator} authFetch={authFetch} projectId={projectId} busy={busy} refresh={refresh} blocked={!indicator || state.loading || !reports.data || reports.loading || currentResult.loading || currentEvidence.loading || reviewHistory.loading || (form.reviewRequired && !reviewHistory.data) || !allowed()} onCancel={() => setForm(null)} onSave={save} onReview={() => setForm(f => ({ ...f, expectedRevision: indicator.revision, reviewRequired: false, error: "" }))} />}
    {form && <><ReadState state={currentResult} /><ReadState state={currentEvidence} /><ReadState state={reviewHistory} /></>}
    {inspectId && <section className={styles.panel}><h4>Existing report for this date</h4><ReadState state={inspected} />{inspected.data?.result && indicator && <><p>Review this entry. Cancel the retained new-report draft before choosing an explicit correction.</p><Report result={inspected.data.result} endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} indicator={indicator} locked={locked} /></>}<button onClick={() => setInspectId(null)}>Close existing report</button></section>}
    <h3>Reports</h3><div className={styles.filters}><label>Report state<select value={filters.state} onChange={e => { setPage(0); setFilters(f => ({ ...f, state: e.target.value })); }}><option value="ALL">All, including corrected and voided</option><option value="EFFECTIVE">Effective only</option></select></label><label>Reporting date from<input type="date" value={filters.from} onChange={e => { setPage(0); setFilters(f => ({ ...f, from: e.target.value })); }} /></label><label>Reporting date to<input type="date" value={filters.to} onChange={e => { setPage(0); setFilters(f => ({ ...f, to: e.target.value })); }} /></label></div>
    <ReadState state={reports} />{indicator && reports.data?.content.map(result => <Report key={result.id} result={result} endpoint={endpoint} authFetch={authFetch} refresh={refresh} open={open} indicator={indicator} locked={locked} />)}{reports.data && !reports.data.content.length && <p>No reports match these filters.</p>}<Pagination data={reports.data} page={page} setPage={setPage} label="reports" disabled={reports.loading} />
    <History endpoint={endpoint} authFetch={authFetch} refresh={refresh} />
  </section>;
}

export function ResultsRegister({ projectId, authFetch }) {
  const endpoint = `${BASE_URL}/api/projects/${projectId}/indicators`;
  const [refresh, setRefresh] = useState(0), [page, setPage] = useState(0), [deleted, setDeleted] = useState(false), [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const pending = useRef(false), alive = useRef(true);
  const reload = () => setRefresh(n => n + 1);
  useEffect(() => { alive.current = true; const focus = () => setRefresh(n => n + 1); window.addEventListener("focus", focus); return () => { alive.current = false; window.removeEventListener("focus", focus); }; }, []);
  const state = useIndicatorRead(authFetch, `${endpoint}?deleted=${deleted}&page=${page}&size=20`, refresh);
  useUnsavedChange(`new-indicator-${projectId}`, !!form);
  async function save(body) {
    if (pending.current || form.reviewRequired || state.loading || !state.data?.canCreate) return;
    pending.current = true; setBusy(true);
    try { const data = await authFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(readIndicator); if (alive.current) { setForm(null); setSelected(data.id); setDeleted(false); setPage(0); } }
    catch (e) { if (alive.current) setForm(f => ({ ...f, error: e.message, reviewRequired: true })); }
    finally { pending.current = false; if (alive.current) { setBusy(false); reload(); } }
  }
  return <><div className={styles.actions}><button disabled={busy} onClick={reload}>Refresh results</button>{state.data?.canCreate && <button disabled={busy || !!form || !!selected} onClick={() => setForm({ action: "create", draft: blankIndicator() })}>Create indicator</button>}<label><input type="checkbox" checked={deleted} disabled={busy} onChange={e => { setDeleted(e.target.checked); setPage(0); }} />Show deleted indicators only</label></div><ReadState state={state} />
    {state.data?.projectDeleted && <p>This project is inactive. Retained results are read-only.</p>}
    <ul className={styles.list}>{state.data?.content.map(i => <li key={i.id}><div className={styles.heading}><h3>{i.name}{i.isDeleted ? " · Deleted" : ""}</h3><button disabled={!!form || (selected != null && selected !== i.id)} onClick={() => setSelected(i.id)}>Open indicator #{i.id}</button></div><p>{i.periodStart} through {i.periodEnd} · Target {i.targetValue} {i.unit}</p><ResultSummary summary={i.summary} unit={i.unit} direction={i.direction} /></li>)}</ul>
    {state.data && !state.data.content.length && <p>No {deleted ? "deleted" : "active"} indicators on this page.</p>}
    <Pagination data={state.data} page={page} setPage={setPage} label="indicators" disabled={state.loading || busy} />
    {form && <ResultsEditor form={form} setForm={setForm} authFetch={authFetch} projectId={projectId} busy={busy} refresh={refresh} blocked={!state.data?.canCreate || state.loading} onSave={save} onCancel={() => setForm(null)} onReview={() => setForm(f => ({ ...f, reviewRequired: false, error: "" }))} />}
    {selected && <IndicatorDetail key={selected} id={selected} endpoint={endpoint} projectId={projectId} authFetch={authFetch} refresh={refresh} reload={reload} onClose={() => setSelected(null)} />}
  </>;
}
export default function Results() {
  const { selectedProjectId } = useContext(ProjectContext);
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  return <section className={styles.page}><h2>Project results & indicators</h2><p>Track user-reported measurements against defined targets. Each report covers the full period from its start through the reporting date. Repeated reports are never added together, and supporting documents do not certify outcomes.</p>{selectedProjectId ? <ResultsRegister key={selectedProjectId} projectId={selectedProjectId} authFetch={authFetch} /> : <p>Select a project to view its results.</p>}</section>;
}
