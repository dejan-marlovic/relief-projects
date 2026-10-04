import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readDocumentError, uploadTimeLabel } from "../../utils/documentMetadata";
import { downloadDocument } from "../../utils/documentDownload";
import useTransientMessage from "../../hooks/useTransientMessage";
import styles from "../FinancialDocuments/FinancialDocuments.module.scss";

export const evidenceRole = role => ({ SIGNED_PAYMENT_ORDER: "Signed payment order", COMBINED_PAYMENT_EVIDENCE: "Combined payment evidence" }[role] || role);
const actor = value => value?.username || "Unknown user";
const warning = value => ({ DOCUMENT_UNAVAILABLE: "Document unavailable", STATUS_UNKNOWN: "Document status unknown", DOCUMENT_DRAFT: "Document is a draft", HISTORICAL_VERSION: "Historical version; this attachment does not follow newer versions" }[value] || value);

export function FinalEvidencePanel({ paymentOrderId, refreshKey, editingLocked }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { hasAnyRole } = useAuth();
  const endpoint = `${BASE_URL}/api/payment-orders/${paymentOrderId}/final-evidence`;
  const [data, setData] = useState(null), [history, setHistory] = useState(null), [page, setPage] = useState(0);
  const [tick, setTick] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [actionError, setActionError] = useState(""), [message, setMessage] = useTransientMessage("");
  const [form, setForm] = useState(null), [docs, setDocs] = useState([]), [candidateError, setCandidateError] = useState(""), [candidateLoading, setCandidateLoading] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false), [downloading, setDownloading] = useState(null);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setData(null); setHistory(null);
    async function json(url) {
      const response = await authFetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(await readDocumentError(response, "Unable to load late evidence. Check that the updated backend is running."));
      return response.json();
    }
    Promise.all([json(endpoint), json(`${endpoint}/history?page=${page}&size=20`)]).then(([collection, decisions]) => {
      if (!Array.isArray(collection.entries) || !Number.isSafeInteger(collection.revision) || !Array.isArray(decisions.content)) throw new Error("Unsupported evidence response.");
      if (!controller.signal.aborted) { setData(collection); setHistory(decisions); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authFetch, endpoint, page, tick, refreshKey]);

  const selecting = form && form.action !== "remove";
  useEffect(() => {
    const controller = new AbortController(); setDocs([]); setCandidateError(""); setCandidateLoading(false);
    if (!selecting) return;
    setCandidateLoading(true);
    async function json(url) {
      const response = await authFetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(await readDocumentError(response, "Unable to load this order's project documents."));
      return response.json();
    }
    (async () => {
      const order = await json(`${BASE_URL}/api/payment-orders/${paymentOrderId}`);
      if (!order.transactionId) throw new Error("An active header transaction is required. The selected project does not establish ownership.");
      const transaction = await json(`${BASE_URL}/api/transactions/${order.transactionId}`);
      if (!transaction.projectId) throw new Error("The owning project is unavailable.");
      const candidates = await json(`${BASE_URL}/api/documents/project/${transaction.projectId}`);
      if (!Array.isArray(candidates)) throw new Error("Unsupported document response.");
      if (!controller.signal.aborted) setDocs(candidates.filter(doc => doc.isDeleted === false && String(doc.projectId) === String(transaction.projectId)));
    })().catch(e => { if (!controller.signal.aborted) setCandidateError(e.message); }).finally(() => { if (!controller.signal.aborted) setCandidateLoading(false); });
    return () => controller.abort();
  }, [authFetch, paymentOrderId, selecting, tick]);

  const start = (action, entry) => { setActionError(""); setReviewRequired(false); setForm({ action, entryId: entry?.id, documentId: entry ? String(entry.documentId) : "", role: entry?.role || "COMBINED_PAYMENT_EVIDENCE", reason: "" }); };
  const allowed = form && (form.action === "attach" ? data?.permissions?.canAttach : data?.entries.find(entry => entry.id === form.entryId)?.permissions?.[form.action === "remove" ? "canRemove" : "canReplace"]);
  async function save(event) {
    event.preventDefault();
    if (pending.current || !allowed || editingLocked || reviewRequired || loading) return;
    pending.current = true; setBusy(true); setActionError("");
    const body = { expectedRevision: data.revision, reason: form.reason.trim() };
    if (form.action !== "remove") Object.assign(body, { documentId: Number(form.documentId), role: form.role });
    try {
      const response = await authFetch(`${endpoint}${form.action === "attach" ? "" : `/${form.entryId}/${form.action}`}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await readDocumentError(response, "Could not save late evidence."));
      if (!alive.current) return;
      setForm(null); setMessage("Late evidence updated. Decision history retained.");
      window.dispatchEvent(new CustomEvent("payment-order-evidence-changed", { detail: { paymentOrderId } }));
      // Notify report tabs without including any document or user data.
      try { localStorage.setItem("payment-order-evidence-changed", JSON.stringify({ paymentOrderId, at: Date.now() })); } catch (_) { /* Report can always be refreshed manually. */ }
    } catch (e) {
      if (alive.current) { setActionError(`${e.message} Collection and history are refreshing. Compare the saved result before issuing another command; your draft is preserved.`); setReviewRequired(true); }
    } finally {
      pending.current = false;
      if (alive.current) { setBusy(false); setPage(0); setTick(n => n + 1); }
    }
  }
  async function download(id) {
    setDownloading(id); setActionError("");
    try { await downloadDocument(id, authFetch); } catch (e) { if (alive.current) setActionError(e.message); } finally { if (alive.current) setDownloading(null); }
  }
  const selected = docs.find(doc => String(doc.id) === form?.documentId);
  return <div className={styles.panel}>
    <p className={styles.hint}><strong>Not part of the approval decision.</strong> Select an externally prepared signed order or combined evidence file. These descriptions do not verify signatures, settlement or completeness. No payment entry is required.</p>
    <button disabled={busy || loading} onClick={() => setTick(n => n + 1)}>Refresh late evidence and history</button>
    {loading && <p role="status">Loading late evidence…</p>}{error && <p role="alert">{error}</p>}{actionError && <p role="alert">{actionError}</p>}{message && <p role="status">{message}</p>}
    {editingLocked && <p>Finish editing the order before changing evidence.</p>}
    {data && <>
      <ul>{data.issues?.map(issue => <li key={issue.code}>{issue.message}</li>)}</ul>
      {!data.entries.length && <p>No late payment evidence attached.</p>}
      <ul className={styles.list}>{data.entries.map(entry => <li key={entry.id}><div className={styles.info}>
        <strong>{entry.capturedDocumentName || "Name unavailable"} · Attachment #{entry.id}</strong>
        <span>{evidenceRole(entry.role)} · Document #{entry.documentId} · Version {entry.versionNumber ?? "Unknown"} · {entry.document?.status || "Status unknown"}</span>
        <span>Attached {uploadTimeLabel(entry.attachedAt)} by {actor(entry.attachedBy)}</span><span>Reason: {entry.reason}</span>
        {entry.replacesEntryId && <span>Replaces attachment #{entry.replacesEntryId}</span>}
        {entry.warnings?.map(item => <span key={item}>{warning(item)}</span>)}
      </div><div className={styles.actions}>
        <button disabled={entry.document?.downloadEligible !== true || downloading !== null} onClick={() => download(entry.documentId)}>Download exact version #{entry.documentId}</button>
        {entry.permissions?.canReplace && <button disabled={busy || editingLocked} onClick={() => start("replace", entry)}>Replace attachment #{entry.id}</button>}
        {entry.permissions?.canRemove && <button disabled={busy || editingLocked} onClick={() => start("remove", entry)}>Remove attachment #{entry.id}</button>}
      </div></li>)}</ul>
      {data.permissions?.canAttach && !form && <button disabled={busy || editingLocked} onClick={() => start("attach")}>Attach late evidence</button>}
    </>}
    {form && <form className={styles.picker} onSubmit={save}>
      <h4>{form.action === "attach" ? "Attach late evidence" : `${form.action === "remove" ? "Remove" : "Replace"} attachment #${form.entryId}`}</h4>
      {selecting && <>
        <p>All active exact versions from the header transaction’s project are listed, including historical versions. FINANCE classification is suggested, not required.</p>
        {candidateError && <p role="alert">{candidateError}</p>}
        <label>Exact document version<select required disabled={busy || candidateLoading} value={form.documentId} onChange={e => setForm({ ...form, documentId: e.target.value })}><option value="">{candidateLoading ? "Loading documents…" : "Select a version"}</option>{docs.filter(doc => !data?.entries.some(entry => entry.documentId === doc.id && entry.id !== form.entryId)).map(doc => <option key={doc.id} value={doc.id}>{doc.documentName || "Name unavailable"} · #{doc.id} · Version {doc.versionNumber ?? "Unknown"} · {doc.status || "Status unknown"}{doc.isCurrent ? " · Current" : " · Historical"}</option>)}</select></label>
        {selected && <p>Selected exact version #{selected.id}: {selected.status || "Unknown status"}{!selected.isCurrent && " · Historical version"}. This selection will not follow future replacements.</p>}
        <label>Evidence description<select value={form.role} disabled={busy} onChange={e => setForm({ ...form, role: e.target.value })}>{["SIGNED_PAYMENT_ORDER", "COMBINED_PAYMENT_EVIDENCE"].map(role => <option key={role} value={role}>{evidenceRole(role)}</option>)}</select></label>
      </>}
      <label>Reason<textarea required maxLength={1000} value={form.reason} disabled={busy} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
      {form.action === "remove" && <p>The file remains available in Documents. The removed association and its reason remain in history.</p>}
      {form.action === "replace" && <p>The old association is removed only if the new attachment succeeds. Both entries remain in history.</p>}
      {reviewRequired && <label><input type="checkbox" disabled={loading || !!error} onChange={e => { if (e.target.checked) setReviewRequired(false); }} /> I compared the refreshed collection and history and want to issue this command.</label>}
      <div className={styles.actions}><button type="submit" disabled={!allowed || busy || loading || editingLocked || reviewRequired || !form.reason.trim() || (selecting && (candidateLoading || !!candidateError || !selected))}>Save {form.action}</button><button type="button" disabled={busy} onClick={() => setForm(null)}>Cancel</button></div>
    </form>}
    <p className={styles.hint}>{hasAnyRole("ADMIN", "PROJECT_MANAGER") ? <a href="/documents" target="_blank" rel="noopener noreferrer">Open Documents to upload to the order’s project</a> : "Select a file already uploaded by an authorised uploader."} Uploading and attaching are separate actions; a failed attachment never deletes the uploaded file.</p>
    <h4>Late evidence decision history</h4>
    {history && <><ol>{history.content.map(decision => <li key={decision.id}><details><summary>{decision.action} · Decision #{decision.id} · Revision {decision.revision} · {uploadTimeLabel(decision.occurredAt)} · {actor(decision.actor)}</summary><p>Reason: {decision.reason}</p>{decision.entries.map(entry => <p key={entry.id}>Attachment #{entry.id} · {entry.state} · {evidenceRole(entry.role)} · {entry.capturedDocumentName || "Name unavailable"} · Document #{entry.documentId} · Version {entry.versionNumber ?? "Unknown"}{entry.replacesEntryId && ` · Replaces #${entry.replacesEntryId}`}{entry.replacementEntryId && ` · Replaced by #${entry.replacementEntryId}`}</p>)}</details></li>)}</ol><div className={styles.actions}><button disabled={loading || busy || page === 0} onClick={() => setPage(n => n - 1)}>Previous evidence history</button><span>{history.totalElements} decisions · Page {page + 1}</span><button disabled={loading || busy || (page + 1) * 20 >= history.totalElements} onClick={() => setPage(n => n + 1)}>Next evidence history</button></div></>}
  </div>;
}

export default function PaymentOrderFinalEvidence(props) {
  const [open, setOpen] = useState(false);
  return <details className={styles.section} onToggle={event => { if (event.target === event.currentTarget) setOpen(event.currentTarget.open); }}><summary>Late payment evidence · Payment order #{props.paymentOrderId}</summary>{open && <FinalEvidencePanel key={props.paymentOrderId} {...props} />}</details>;
}
