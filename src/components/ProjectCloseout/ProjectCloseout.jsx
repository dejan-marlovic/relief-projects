import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { stockholmToday } from "../../utils/fundingReceipts";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import { DecisionSnapshot, Observation, FinancialRow, readable, stamp } from "./CloseoutViews";
import styles from "./ProjectCloseout.module.scss";

const actions = { acceptance: ["canEditAcceptance", "Record / update final-report acceptance", "/final-report-acceptance", "PUT"], close: ["canClose", "Record administrative closeout", "/close", "POST"], reopen: ["canReopen", "Reopen closeout", "/reopen", "POST"], archive: ["canMarkArchived", "Record / reaffirm archive filing", "/archive", "PUT"], revoke: ["canRevokeArchive", "Revoke archive marker", "/archive/revoke", "POST"] };
async function read(response) {
  const body = await safeReadJson(response);
  if (!response.ok) throw new Error([...new Set([body?.message, ...Object.values(body?.fieldErrors || {})].filter(Boolean))].join(" ") || `Request failed (${response.status}).`);
  if (!body) throw new Error("The server response could not be read.");
  return body;
}
function FinancialAttention({ endpoint, authFetch, revision }) {
  const [page, setPage] = useState(0), [data, setData] = useState(null), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError("");
    authFetch(`${endpoint}/financial-attention?page=${page}&size=20`, { signal: controller.signal, cache: "no-store" }).then(read).then(value => { if (!Array.isArray(value.content)) throw new Error("Invalid financial diagnostics response."); if (!controller.signal.aborted) setData(value); }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [endpoint, authFetch, page, revision]);
  return <section aria-label="Financial attention"><h4>Financial record observations</h4><p className={styles.hint}>All discovered records are included, including normal statuses. No project balance or reconciled result is calculated.</p>{error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Loading financial observations…</p>}
    {data && <>{data.content.map((row,index) => <FinancialRow key={`${row.recordType}-${row.recordId ?? index}`} row={row} />)}{!data.content.length && <p>No financial records in this view.</p>}<div className={styles.actions}><button disabled={!page} onClick={() => setPage(p => p - 1)}>Previous financial page</button><span>Page {data.totalPages ? page + 1 : 0} of {data.totalPages} · {data.totalElements} records</span><button disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next financial page</button></div></>}
  </section>;
}
export function CloseoutPanel({ projectId, refreshKey }) {
  const navigate = useNavigate(), authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const endpoint = `${BASE_URL}/api/projects/${projectId}/closeout`;
  const [data, setData] = useState(null), [history, setHistory] = useState(null), [historyPage, setHistoryPage] = useState(0);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [historyError, setHistoryError] = useState("");
  const [revision, setRevision] = useState(0), [form, setForm] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const [documents, setDocuments] = useState([]), [documentError, setDocumentError] = useState(""), [financeOpen, setFinanceOpen] = useState(false), [downloading, setDownloading] = useState(null);
  const alive = useRef(true), pending = useRef(false);
  const refresh = () => setRevision(n => n + 1);
  useUnsavedChange(`closeout-${projectId}`, Boolean(form));
  useEffect(() => { alive.current = true; window.addEventListener("focus", refresh); return () => { alive.current = false; window.removeEventListener("focus", refresh); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError("");
    authFetch(endpoint, { signal: controller.signal, cache: "no-store" }).then(read).then(value => { if (!Number.isInteger(value.revision) || !value.permissions || !value.readiness) throw new Error("Invalid closeout response."); if (!controller.signal.aborted) setData(value); }).catch(err => { if (!controller.signal.aborted) { setData(null); setLoadError(err.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, authFetch, revision, refreshKey]);
  useEffect(() => {
    const controller = new AbortController(); setHistory(null); setHistoryError("");
    authFetch(`${endpoint}/history?page=${historyPage}&size=20`, { signal: controller.signal, cache: "no-store" }).then(read).then(value => { if (!Array.isArray(value.content)) throw new Error("Invalid decision history response."); if (!controller.signal.aborted) setHistory(value); }).catch(err => { if (!controller.signal.aborted) setHistoryError(err.message); });
    return () => controller.abort();
  }, [endpoint, authFetch, revision, refreshKey, historyPage]);
  const choosingEvidence = form?.action === "acceptance";
  useEffect(() => {
    const controller = new AbortController(); setDocuments([]); setDocumentError("");
    if (!choosingEvidence) return undefined;
    authFetch(`${BASE_URL}/api/documents/project/${projectId}`, { signal: controller.signal, cache: "no-store" }).then(read).then(value => { if (!Array.isArray(value)) throw new Error("Could not load document versions."); if (!controller.signal.aborted) setDocuments(value.filter(d => d.isDeleted === false && String(d.projectId) === String(projectId))); }).catch(err => { if (!controller.signal.aborted) setDocumentError(err.message); });
    return () => controller.abort();
  }, [choosingEvidence, authFetch, projectId, revision]);
  const open = action => {
    const acceptance = data.acceptance || {}, archive = data.archive || {};
    setBlocked(false); setError("");
    setForm({ action, expectedRevision: data.revision, reason: "", status: acceptance.status === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "ACCEPTED", acceptedDate: acceptance.acceptedDate || stockholmToday(), acceptedByLabel: acceptance.acceptedByLabel || "", notApplicableReason: acceptance.notApplicableReason || "", documentIds: (acceptance.documentIds || []).map(String), evidenceReviewed: false, closedDate: stockholmToday(), acknowledgeOutstanding: false, outstandingReason: "", archivedDate: archive.archivedDate || stockholmToday(), physicalArchiveReference: archive.physicalArchiveReference || "", digitalArchiveReference: archive.digitalArchiveReference || "", archiveNote: archive.archiveNote || "" });
  };
  const change = (field,value) => setForm(current => ({ ...current, [field]: value }));
  const submit = async event => {
    event.preventDefault();
    if (!form || blocked || pending.current || loading || form.expectedRevision !== data?.revision || !data?.permissions?.[actions[form.action][0]]) return;
    if (!form.reason.trim()) { setError("Enter a reason for this decision."); return; }
    const body = { expectedRevision: form.expectedRevision, reason: form.reason.trim() };
    if (form.action === "acceptance") {
      if (!form.evidenceReviewed) { setError("Review and confirm the exact evidence selection, including an empty selection."); return; }
      Object.assign(body, { status: form.status, documentIds: form.documentIds.map(Number) }, form.status === "ACCEPTED" ? { acceptedDate: form.acceptedDate, acceptedByLabel: form.acceptedByLabel.trim() } : { notApplicableReason: form.notApplicableReason.trim() });
    }
    if (form.action === "close") Object.assign(body, { closedDate: form.closedDate, acknowledgeOutstanding: form.acknowledgeOutstanding, outstandingReason: form.outstandingReason.trim() || null });
    if (form.action === "archive") Object.assign(body, { archivedDate: form.archivedDate, physicalArchiveReference: form.physicalArchiveReference.trim(), digitalArchiveReference: form.digitalArchiveReference.trim(), archiveNote: form.archiveNote.trim() || null });
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await read(await authFetch(`${endpoint}${actions[form.action][2]}`, { method: actions[form.action][3], headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      if (!Number.isInteger(result.revision)) throw new Error("The decision result is uncertain.");
      if (alive.current) { setData(result); setForm(null); setBlocked(false); }
    } catch (err) { if (alive.current) { setError(`${err.message} Review refreshed state and decision history. Your draft and original revision are retained; nothing will be retried automatically.`); setBlocked(true); } }
    finally { pending.current = false; if (alive.current) { setBusy(false); setHistoryPage(0); refresh(); } }
  };
  const download = async id => { setDownloading(id); try { await downloadDocument(id,authFetch); } catch (err) { if (alive.current) setError(err.message); } finally { if (alive.current) setDownloading(null); } };
  const stale = form && data && form.expectedRevision !== data.revision;
  const warnings = data?.readiness?.warnings || [];
  return <div className={styles.panel}>
    <p className={styles.hint}>Administrative closeout is a recorded decision. It does not certify reconciled accounts, complete evidence or verified filing, and it does not freeze other project work.</p>
    <div className={styles.actions}><button type="button" onClick={refresh} disabled={busy || loading}>Refresh closeout and observations</button><Link to="/documents">Document checklist</Link><Link to="/risks">Open risks</Link><Link to="/follow-ups">Open follow-ups</Link></div>
    {loading && <p role="status">Loading closeout…</p>}{loadError && <p role="alert">{loadError}</p>}{error && <p role="alert">{error}</p>}
    {data && <>
      {data.closeoutReviewRequired && <p role="alert">Closeout review required: acceptance changed. Reopen and close explicitly to reaffirm the decision.</p>}
      {data.archive?.reviewRequired && <p role="alert">Archive review required. After a current closeout, explicitly reaffirm filing. Reopening does not move or unarchive files.</p>}
      <DecisionSnapshot value={data} />
      <h4>Current attention and coverage</h4><Observation value={data.readiness} />
      {data.issues?.map((issue,index) => <p key={index}>{issue.message}</p>)}
      <div className={styles.actions}>{Object.entries(actions).map(([action,[flag,label]]) => data.permissions[flag] && <button type="button" key={action} disabled={loading || busy || !!form} onClick={() => open(action)}>{label}</button>)}</div>
    </>}
    {form && <form className={styles.form} aria-label="Closeout decision" onSubmit={submit}>
      <h4>{actions[form.action][1]}</h4><p>Draft revision {form.expectedRevision}. Current revision: {data?.revision ?? "Unavailable"}.</p>
      {(blocked || stale) && <div role="alert"><p>Review current decisions and history below before continuing. If the intended decision already succeeded, cancel this draft.</p><button type="button" disabled={busy || loading || !data || !history || !!historyError} onClick={() => { setForm(current => ({ ...current, expectedRevision: data.revision })); setBlocked(false); setError(""); }}>I reviewed state and history; use current revision</button></div>}
      <fieldset disabled={busy}>
        {form.action === "acceptance" && <>
          <label>Final-report decision<select value={form.status} onChange={e => change("status",e.target.value)}><option value="ACCEPTED">Acceptance obtained</option><option value="NOT_APPLICABLE">Not applicable</option></select></label>
          <p className={styles.hint}>Acceptance is your project-level assertion that applicable acceptances were obtained, not verification by this application.</p>
          {form.status === "ACCEPTED" ? <><label>Acceptance date<input required type="date" min="1000-01-01" max={stockholmToday()} value={form.acceptedDate} onChange={e => change("acceptedDate",e.target.value)} /></label><label>Accepted by (donor / accepting party)<input required maxLength={255} value={form.acceptedByLabel} onChange={e => change("acceptedByLabel",e.target.value)} /></label></> : <label>Why final-report acceptance is not applicable<textarea required maxLength={1000} value={form.notApplicableReason} onChange={e => change("notApplicableReason",e.target.value)} /></label>}
          {documentError && <p role="alert">{documentError} You can refresh or explicitly choose no evidence.</p>}
          <fieldset><legend>Exact supporting versions (optional)</legend>{Array.from(new Map([...(data?.evidence || []).map(d => ({ ...d,id:d.documentId })), ...documents].map(d => [String(d.id),d])).values()).map(d => <label key={d.id}><input type="checkbox" checked={form.documentIds.includes(String(d.id))} onChange={e => setForm(current => ({ ...current, evidenceReviewed:false, documentIds: e.target.checked ? [...current.documentIds,String(d.id)] : current.documentIds.filter(id => id !== String(d.id)) }))} /> {d.documentName || `Document #${d.id}`} · v{d.versionNumber ?? "Unknown"} (#{d.id}){d.documentDeleted && " · Unavailable; deselect to change acceptance"}</label>)}</fieldset>
          <label><input required type="checkbox" checked={form.evidenceReviewed} onChange={e => change("evidenceReviewed",e.target.checked)} /> I confirm these exact versions, or explicitly no evidence ({form.documentIds.length} selected). Replacements are never selected automatically.</label>
        </>}
        {form.action === "close" && <><label>Administrative closeout date<input required type="date" min={data?.acceptance?.status === "ACCEPTED" ? data.acceptance.acceptedDate : "1000-01-01"} max={stockholmToday()} value={form.closedDate} onChange={e => change("closedDate",e.target.value)} /></label><label><input type="checkbox" required={warnings.length > 0} checked={form.acknowledgeOutstanding} onChange={e => change("acknowledgeOutstanding",e.target.checked)} /> I considered and acknowledge the outstanding warnings shown above.</label><label>Why closure can proceed with outstanding items<textarea required={warnings.length > 0 || form.acknowledgeOutstanding} maxLength={1000} value={form.outstandingReason} onChange={e => change("outstandingReason",e.target.value)} /></label></>}
        {form.action === "archive" && <><p className={styles.hint}>This records a human filing assertion. Both references are required plain text; no files are moved or verified.</p><label>Archive date<input required type="date" min={data?.closure?.closedDate || "1000-01-01"} max={stockholmToday()} value={form.archivedDate} onChange={e => change("archivedDate",e.target.value)} /></label>{[["physicalArchiveReference","Physical archive reference",500],["digitalArchiveReference","Digital archive reference",500],["archiveNote","Archive note (optional)",1000]].map(([field,label,max]) => <label key={field}>{label}<textarea required={field !== "archiveNote"} maxLength={max} value={form[field]} onChange={e => change(field,e.target.value)} /></label>)}</>}
        <label>Decision reason<textarea required maxLength={1000} value={form.reason} onChange={e => change("reason",e.target.value)} /></label>
        <button type="submit" disabled={blocked || stale || loading || !data?.permissions?.[actions[form.action][0]]}>Save decision</button>
      </fieldset><div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setForm(null); setBlocked(false); setError(""); }}>Cancel draft</button></div>
    </form>}
    {!!data?.evidence?.length && <section><h4>Current acceptance evidence</h4><ul>{data.evidence.map(d => <li key={d.documentId}>{d.documentName || `Document #${d.documentId}`} · Version {d.versionNumber ?? "Unknown"}{!d.downloadEligible && " · Unavailable"} <button type="button" disabled={!d.downloadEligible || downloading != null} onClick={() => download(d.documentId)}>Download version #{d.documentId}</button></li>)}</ul></section>}
    <details onToggle={e => { if (e.currentTarget === e.target) setFinanceOpen(e.currentTarget.open); }}><summary>Financial attention details</summary>{financeOpen && <FinancialAttention endpoint={endpoint} authFetch={authFetch} revision={revision} />}</details>
    <section aria-label="Closeout decision history"><h4>Retained decision history</h4>{historyError && <p role="alert">{historyError}</p>}{!history && !historyError && <p>Loading decision history…</p>}{history && <>{!history.content.length && <p>No decisions recorded.</p>}{history.content.map(event => <article className={styles.card} key={event.id}><h4>{readable(event.action)} · Revision {event.revision}</h4><p>{stamp(event.occurredAt)} · {event.actor?.username || "Unknown user"}</p><p>Reason: {event.reason}</p><details><summary>Before decision</summary><DecisionSnapshot value={event.before} /></details><details><summary>After decision</summary><DecisionSnapshot value={event.after} /></details>{event.warningObservation && <details><summary>Warnings observed at decision</summary><Observation value={event.warningObservation} /></details>}</article>)}<div className={styles.actions}><button type="button" disabled={busy || historyPage === 0} onClick={() => setHistoryPage(n => n-1)}>Previous decision page</button><span>Page {history.totalPages ? historyPage+1 : 0} of {history.totalPages} · {history.totalElements} decisions</span><button type="button" disabled={busy || historyPage+1 >= history.totalPages} onClick={() => setHistoryPage(n => n+1)}>Next decision page</button></div></>}</section>
  </div>;
}
export default function ProjectCloseout({ projectId }) {
  const [opened, setOpened] = useState(false), [entry, setEntry] = useState(0);
  if (!projectId) return null;
  return <details className={styles.section} onToggle={e => { if (e.currentTarget === e.target && e.currentTarget.open) { setOpened(true); setEntry(n => n+1); } }}><summary>Closeout &amp; archive</summary>{opened && <CloseoutPanel key={projectId} projectId={projectId} refreshKey={entry} />}</details>;
}
