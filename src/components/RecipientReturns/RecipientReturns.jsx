import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { paymentAmountError, paymentCurrency, paymentMoney, stockholmToday } from "../../utils/outgoingPayments";
import RecipientReturnSummary from "./RecipientReturnSummary";
import styles from "../FundingReceipts/FundingReceipts.module.scss";

const permission = kind => ({ create: "canRecord", correct: "canCorrect", void: "canVoid", add: "canManageEvidence", remove: "canManageEvidence" }[kind]);
const stamp = date => date ? new Date(date).toLocaleString() : "Unknown";
const actor = person => person?.username || "Unknown";
const summaryIssues = eligibility => ["recordingIssues", "correctionIssues", "voidIssues", "evidenceIssues"].flatMap(key => eligibility?.[key] || []).filter((item, index, all) => all.findIndex(other => other.code === item.code) === index);

export function RecipientReturnsPanel({ payment, refreshKey, editingLocked, onChanged }) {
  const navigate = useNavigate(), { user } = useAuth();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const storageKey = `recipient-return-command:${user?.id ?? user?.username ?? "current"}:${payment.id}`;
  const [pending, setPending] = useState(() => { try { return JSON.parse(sessionStorage.getItem(storageKey)) || null; } catch { return null; } });
  const [data, setData] = useState(null), [page, setPage] = useState(0), [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [error, setError] = useState("");
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [reviewRequired, setReviewRequired] = useState(false);
  const [documents, setDocuments] = useState([]), [documentError, setDocumentError] = useState(""), [related, setRelated] = useState(null), [downloading, setDownloading] = useState(null);
  const alive = useRef(true), submitting = useRef(false);
  const refresh = () => setTick(n => n + 1);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError("");
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/outgoing-payments/${payment.id}/returns?page=${page}&size=20`, { cache: "no-store", signal: controller.signal });
        const body = await safeReadJson(response);
        if (!response.ok || !Array.isArray(body?.content) || !Number.isSafeInteger(body.returnsRevision) || !Number.isSafeInteger(body.sourceRevision) || !body.summary || !body.eligibility) throw new Error(body?.message || "Return information unavailable. Check the deployed backend; this does not mean zero returns.");
        if (!controller.signal.aborted) setData(body);
      } catch (e) { if (!controller.signal.aborted) { setData(null); setLoadError(e.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, payment.id, page, tick, refreshKey]);
  const kind = form?.kind;
  useEffect(() => {
    const controller = new AbortController(); setDocuments([]); setDocumentError("");
    if (!["create", "correct", "add"].includes(kind)) return;
    (async () => {
      try {
        // Resolve retained ownership from the source rather than the selected project.
        const response = await authFetch(`${BASE_URL}/api/outgoing-payments/${payment.id}`, { signal: controller.signal, cache: "no-store" });
        const source = await safeReadJson(response);
        if (!response.ok || !source?.projectId) throw new Error("Source project unavailable; evidence cannot be selected.");
        const list = await authFetch(`${BASE_URL}/api/documents/project/${source.projectId}`, { signal: controller.signal, cache: "no-store" });
        const docs = await safeReadJson(list);
        if (!list.ok || !Array.isArray(docs)) throw new Error("Could not load exact document versions.");
        if (!controller.signal.aborted) setDocuments(docs.filter(doc => doc.isDeleted === false && String(doc.projectId) === String(source.projectId)));
      } catch (e) { if (!controller.signal.aborted) setDocumentError(e.message); }
    })();
    return () => controller.abort();
  }, [authFetch, payment.id, kind, tick]);

  const can = (action, row) => !editingLocked && !loading && !loadError && Boolean((action === "create" ? data?.eligibility : row?.eligibility)?.[permission(action)]);
  const currentRow = form && data?.content.find(row => row.id === form.row?.id);
  const open = (action, row, document) => {
    setError(""); setReviewRequired(false);
    setForm({ kind: action, row, document, expectedSourceRevision: data.sourceRevision, expectedReturnsRevision: data.returnsRevision, amount: action === "correct" ? row.amount : "", returnedDate: action === "correct" ? row.returnedDate : stockholmToday(), externalReference: action === "correct" ? row.externalReference || "" : "", reason: action === "correct" ? row.reason : "", correctionReason: "", note: action === "correct" ? row.note || "" : "", documentIds: [], documentId: "" });
  };
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  async function send(command) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(command)); setPending(command);
      const response = await authFetch(`${BASE_URL}${command.path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: command.body });
      const result = await safeReadJson(response);
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          sessionStorage.removeItem(storageKey);
          if (alive.current) { setPending(null); setForm(command.form); setReviewRequired(true); }
        }
        throw new Error([result?.message, ...Object.values(result?.fieldErrors || {}).flat()].filter(Boolean).join(" ") || "Return command was not confirmed. Retry the same request to check the outcome.");
      }
      if (!result?.return?.id || !Number.isSafeInteger(result.returnsRevision)) throw new Error("Incomplete response. Retry the same request to confirm its outcome.");
      sessionStorage.removeItem(storageKey);
      if (alive.current) { setPending(null); setForm(null); setPage(0); }
      window.dispatchEvent(new CustomEvent("payment-order-evidence-changed", { detail: { paymentOrderId: payment.paymentOrderId } }));
      try { localStorage.setItem("payment-order-evidence-changed", JSON.stringify({ paymentOrderId: payment.paymentOrderId, at: Date.now() })); } catch (_) { /* Report remains manually refreshable. */ }
    } catch (e) { if (alive.current) setError(e.message); }
    finally { submitting.current = false; if (alive.current) { setBusy(false); refresh(); onChanged?.(); } }
  }
  function submit(event) {
    event.preventDefault();
    if (!form || pending || reviewRequired || !can(form.kind, currentRow)) return;
    const financial = ["create", "correct"].includes(form.kind);
    if (financial && paymentAmountError(form.amount)) { setError(paymentAmountError(form.amount)); return; }
    if (!window.crypto?.randomUUID) { setError("HTTPS or localhost is required for a secure request ID."); return; }
    const body = { requestId: window.crypto.randomUUID(), expectedReturnsRevision: form.expectedReturnsRevision };
    let path = `/api/outgoing-payments/${payment.id}/returns`;
    if (form.kind !== "create") path = `/api/recipient-returns/${form.row.id}/${{ correct: "corrections", void: "void", add: "documents", remove: "documents/remove" }[form.kind]}`;
    if (financial) Object.assign(body, { expectedSourceRevision: form.expectedSourceRevision, amount: form.amount.trim(), currencyId: payment.currency?.id, returnedDate: form.returnedDate, externalReference: form.externalReference.trim() || null, reason: form.reason.trim(), note: form.note.trim() || null, documentIds: form.documentIds.map(Number) });
    if (form.kind === "correct") body.correctionReason = form.correctionReason.trim();
    if (["void", "remove"].includes(form.kind)) body.reason = form.reason.trim();
    if (form.kind === "add") body.documentId = Number(form.documentId);
    if (form.kind === "remove") body.documentId = form.document.documentId;
    send({ path, body: JSON.stringify(body), form });
  }
  async function showRelated(id) {
    setRelated(null); setError("");
    try {
      const response = await authFetch(`${BASE_URL}/api/recipient-returns/${id}`, { cache: "no-store" });
      const body = await safeReadJson(response);
      if (!response.ok || !body?.id) throw new Error(body?.message || "Related return unavailable.");
      if (alive.current) setRelated(body);
    } catch (e) { if (alive.current) setError(e.message); }
  }
  async function download(id) {
    setDownloading(id); setError("");
    try { await downloadDocument(id, authFetch); } catch (e) { if (alive.current) setError(e.message); } finally { if (alive.current) setDownloading(null); }
  }
  function entry(row, relatedView = false) {
    return <article key={row.id} className={styles.entry} aria-label={`Recipient return ${row.id}`}>
      <h4>Return from recipient #{row.id} · {row.status === "VOIDED" ? "Voided erroneous entry" : "Recorded"}</h4>
      <p><strong>{paymentMoney(row.amount)} {paymentCurrency(row.currency)}</strong> · Returned {row.returnedDate}</p>
      <p>Recipient organisation: {row.organization?.name || "Unknown"} · Original payment #{row.originalPaymentId}</p>
      {row.currency?.labelChanged && <p>Current currency label: {row.currency.currentName}; the recorded label is retained above.</p>}
      <p>Entered {stamp(row.createdAt)} by {actor(row.createdBy)} · Reason: {row.reason}</p>
      {row.externalReference && <p>Reference: {row.externalReference}</p>}{row.note && <p>Note: {row.note}</p>}
      {row.voidedAt && <p>Voided {stamp(row.voidedAt)} by {actor(row.voidedBy)} · {row.voidReason}</p>}
      {row.replacesReturnId && <button type="button" onClick={() => showRelated(row.replacesReturnId)}>View original return #{row.replacesReturnId}</button>}
      {row.replacementReturnId && <button type="button" onClick={() => showRelated(row.replacementReturnId)}>View replacement return #{row.replacementReturnId}</button>}
      <ul className={styles.evidence}>{row.documents?.map(doc => <li key={doc.documentId}>{doc.documentName || "Name unavailable"} · Version {doc.versionNumber ?? "Unknown"} · {doc.status || "Status unknown"}{doc.hasNewerVersion && " · Newer version exists; this link retains the selected version"}{!doc.downloadEligible && " · Download unavailable"}<div className={styles.actions}><button disabled={!doc.downloadEligible || downloading !== null} onClick={() => download(doc.documentId)}>Download return evidence #{doc.documentId}</button>{!relatedView && can("remove", row) && <button disabled={busy || !!form || !!pending} onClick={() => open("remove", row, doc)}>Remove return evidence #{doc.documentId}</button>}</div></li>)}</ul>
      {!row.documents?.length && <p>No evidence linked.</p>}
      {summaryIssues(row.eligibility).map(issue => <p key={issue.code}>{issue.message}</p>)}
      {!relatedView && <div className={styles.actions}>{[["add", "Add evidence"], ["correct", "Correct erroneous return"], ["void", "Void erroneous return"]].map(([action, label]) => can(action, row) && <button key={action} disabled={busy || !!form || !!pending} onClick={() => open(action, row)}>{label} #{row.id}</button>)}</div>}
    </article>;
  }
  const financial = ["create", "correct"].includes(kind), evidence = ["create", "correct", "add"].includes(kind);
  return <div className={styles.panel}>
    <p>Original payment #{payment.id} · Recipient #{payment.recipientId ?? "Unknown"} · {payment.organization?.name || "Organisation unavailable"} · Paid {payment.paidDate} · {paymentCurrency(payment.currency)}</p>
    <p className={styles.hint}>Record principal actually received back from this payment’s recipient. This keeps the original payment recorded and does not execute a transfer or increase spending capacity. Voiding is only for erroneous entries.</p>
    <button disabled={busy || loading} onClick={refresh}>Refresh returns</button>
    {loading && <p role="status">Loading returns…</p>}{loadError && <p role="alert">{loadError}</p>}{error && <p role="alert">{error} Your input is retained.</p>}
    {pending && <div role="alert"><p>A return command needs confirmation. Retry sends the identical request ID and body; do not enter the movement again.</p><button disabled={busy} onClick={() => send(pending)}>Retry same return request</button></div>}
    {data && <><RecipientReturnSummary summary={data.summary} /><p>Original amount not yet recorded as returned: <strong>{paymentMoney(data.remainingReturnable)} {paymentCurrency(payment.currency)}</strong>. This is a recording limit, not available spending.</p>{summaryIssues(data.eligibility).filter(issue => issue.code !== "SELECT_RETURN").map(issue => <p key={issue.code}>{issue.message}</p>)}</>}
    {can("create") && !form && !pending && <button onClick={() => open("create")}>Record money returned by recipient</button>}
    {form && !pending && <form className={styles.form} onSubmit={submit}>
      <h4>{{ create: "Record money returned by recipient", correct: "Correct erroneous return", void: "Void erroneous return", add: "Add exact return evidence", remove: "Remove return evidence" }[kind]}</h4>
      <fieldset disabled={busy || editingLocked}>
        {financial && <><p>Captured payment currency: {paymentCurrency(payment.currency)}. No conversion is performed.</p><div className={styles.grid}><label>Amount returned<input required inputMode="decimal" value={form.amount} onChange={e => change("amount", e.target.value)} /></label><label>Date returned<input required type="date" min={payment.paidDate || "1000-01-01"} max={stockholmToday()} value={form.returnedDate} onChange={e => change("returnedDate", e.target.value)} /></label></div><label>Reference (optional)<input maxLength={150} value={form.externalReference} onChange={e => change("externalReference", e.target.value)} /></label><label>Note (optional)<textarea maxLength={1000} value={form.note} onChange={e => change("note", e.target.value)} /></label></>}
        {kind !== "add" && <label>{financial ? "Reason for actual return" : "Reason for correction of records"}<textarea required maxLength={1000} value={form.reason} onChange={e => change("reason", e.target.value)} /></label>}
        {kind === "correct" && <><label>Correction explanation<textarea required maxLength={1000} value={form.correctionReason} onChange={e => change("correctionReason", e.target.value)} /></label><p>The erroneous return is voided and replaced atomically against the same payment. Select replacement evidence explicitly; nothing is inherited.</p></>}
        {kind === "void" && <p>Only invalidate an entry that was wrong. Do not void genuine returned money to unlock a payment correction.</p>}
        {kind === "remove" && <p>Remove the association to {form.document.documentName || `document #${form.document.documentId}`}? The file and audit history remain.</p>}
        {evidence && <>{documentError && <p role="alert">{documentError}</p>}<label>{kind === "add" ? "Exact document version" : "Evidence versions (optional)"}<select required={kind === "add"} multiple={kind !== "add"} value={kind === "add" ? form.documentId : form.documentIds} onChange={e => kind === "add" ? change("documentId", e.target.value) : change("documentIds", Array.from(e.target.selectedOptions, option => option.value))}>{kind === "add" && <option value="">Select a version</option>}{documents.filter(doc => kind !== "add" || !form.row.documents?.some(link => link.documentId === doc.id)).map(doc => <option key={doc.id} value={doc.id}>{doc.documentName || "Name unavailable"} · #{doc.id} · v{doc.versionNumber} · {doc.status || "Unknown status"} · {doc.isCurrent ? "Current" : "Historical"}</option>)}</select></label><p className={styles.hint}>Optional evidence links retain exact versions; they do not certify bank movement, signatures or completeness. Upload files through Documents separately.</p></>}
        <button disabled={reviewRequired || !can(kind, currentRow) || (kind === "add" && !!documentError)} type="submit">Confirm return action</button>
      </fieldset>
      {reviewRequired && <p>Review refreshed entries before preparing another command. No retry has been sent.</p>}
      {data && (reviewRequired || form.expectedReturnsRevision !== data.returnsRevision || form.expectedSourceRevision !== data.sourceRevision) && <button type="button" disabled={busy || loading || !!loadError} onClick={() => { setForm(current => ({ ...current, expectedReturnsRevision: data.returnsRevision, expectedSourceRevision: data.sourceRevision })); setReviewRequired(false); }}>Use refreshed revisions after review (keep input)</button>}
      <button type="button" disabled={busy} onClick={() => setForm(null)}>Cancel return action</button>
    </form>}
    {related && <aside><h4>Related return detail</h4>{entry(related, true)}<button onClick={() => setRelated(null)}>Close related return</button></aside>}
    {!loading && data?.content.length === 0 && <p>No returns on this page.</p>}
    {data?.content.map(row => entry(row))}
    {data && <div className={styles.actions}><span>{data.totalElements} returns · Page {page + 1}</span><button disabled={busy || loading || !!form || !!pending || page === 0} onClick={() => setPage(n => n - 1)}>Previous returns</button><button disabled={busy || loading || !!form || !!pending || (page + 1) * 20 >= data.totalElements} onClick={() => setPage(n => n + 1)}>Next returns</button></div>}
    <p className={styles.hint}>Retained return and evidence activity appears in this payment order’s History with child activity included.</p>
  </div>;
}

export default function RecipientReturns(props) {
  const [opened, setOpened] = useState(false);
  return <details className={styles.section} onToggle={e => { if (e.currentTarget === e.target && e.currentTarget.open) setOpened(true); }}><summary>Returned by recipient · Payment #{props.payment.id}</summary>{opened && <RecipientReturnsPanel key={props.payment.id} {...props} />}</details>;
}
