import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { receiptAmountError, receiptCommandStore, receiptCurrency, receiptMoney, receiptStatus, stockholmToday } from "../../utils/fundingReceipts";
import styles from "./FundingReceipts.module.scss";

const stamp = value => value ? new Date(value).toLocaleString() : "Unknown";
const actor = value => value?.username || (value?.userId ? `User #${value.userId}` : "Unknown");

export function ReceiptsPanel({ transactionId, projectId, refreshKey, editingLocked, onChanged }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { user } = useAuth();
  const store = useMemo(() => receiptCommandStore(user?.id ?? user?.username ?? "current", transactionId), [user?.id, user?.username, transactionId]);
  const [pending, setPending] = useState(() => store.read());
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentError, setDocumentError] = useState("");
  const [historical, setHistorical] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [related, setRelated] = useState(null);
  const alive = useRef(true);
  const submitting = useRef(false);
  const refresh = () => setRevision(value => value + 1);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/transactions/${transactionId}/funding-receipts?page=${page}&size=20`, { signal: controller.signal, cache: "no-store" });
        const result = await safeReadJson(response);
        if (!response.ok || !Array.isArray(result?.content) || !result.summary || !result.eligibility) throw new Error(result?.message || "Could not load funding receipts.");
        if (!controller.signal.aborted) setData(result);
      } catch (err) { if (!controller.signal.aborted) { setData(null); setLoadError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, transactionId, page, revision, refreshKey]);

  const formKind = form?.kind;
  useEffect(() => {
    const controller = new AbortController();
    setDocuments([]); setDocumentError("");
    if (!["create", "correct", "add"].includes(formKind) || !projectId) return undefined;
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/documents/project/${projectId}${historical ? "" : "?currentOnly=true"}`, { signal: controller.signal, cache: "no-store" });
        const result = await safeReadJson(response);
        if (!response.ok || !Array.isArray(result)) throw new Error(result?.message || "Could not load project documents.");
        if (!controller.signal.aborted) setDocuments(result.filter(doc => doc.isDeleted === false && String(doc.projectId) === String(projectId)));
      } catch (err) { if (!controller.signal.aborted) setDocumentError(err.message); }
    })();
    return () => controller.abort();
  }, [authFetch, projectId, formKind, historical, revision]); // Form values must not refetch the picker.

  const eligibility = data?.eligibility || {};
  const currency = data?.summary?.currentFundingCurrency?.currency;
  const can = kind => !editingLocked && !loading && !loadError && Boolean(eligibility[kind === "create" ? "canCreate" : kind === "correct" ? "canCorrect" : kind === "void" ? "canVoid" : "canManageEvidence"]);
  const open = (kind, receipt = null, document = null) => {
    setError(""); setHistorical(false);
    setForm({ kind, receipt, document, currency, confirmRequired: eligibility.requiresDenominationConfirmation, amount: kind === "correct" ? receipt.amount : "", receivedDate: kind === "correct" ? receipt.receivedDate : stockholmToday(), externalReference: kind === "correct" ? receipt.externalReference || "" : "", note: kind === "correct" ? receipt.note || "" : "", reason: "", documentIds: [], documentId: "", confirmation: false });
  };
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const send = async command => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      // Persist before sending; without storage, do not risk an unrecoverable retry.
      store.save(command); setPending(command);
      const response = await authFetch(`${BASE_URL}${command.path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: command.body });
      const result = await safeReadJson(response);
      if (!response.ok) {
        const detail = [result?.message, ...Object.values(result?.fieldErrors || {})].filter(Boolean);
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          store.clear(); if (alive.current) { setPending(null); setForm(command.form); }
        }
        throw new Error([...new Set(detail)].join(" ") || "The request could not be confirmed. Retry the same request to check its outcome.");
      }
      if (!result?.id && !result?.receipt?.id) throw new Error("The server response was incomplete. Retry the same request to confirm the outcome.");
      store.clear();
      if (alive.current) { setPending(null); setForm(null); setPage(0); }
    } catch (err) { if (alive.current) setError(err.message); }
    finally {
      submitting.current = false;
      if (alive.current) { setBusy(false); refresh(); onChanged?.(); }
    }
  };
  const submit = event => {
    event.preventDefault();
    if (!form || pending || !can(form.kind)) return;
    const financial = ["create", "correct"].includes(form.kind);
    if (financial && receiptAmountError(form.amount)) { setError(receiptAmountError(form.amount)); return; }
    if (!window.crypto?.randomUUID) { setError("A secure browser connection is required to generate a receipt request ID. Use HTTPS or localhost."); return; }
    const body = { requestId: window.crypto.randomUUID() };
    let path = `/api/transactions/${transactionId}/funding-receipts`;
    if (form.kind !== "create") {
      body.expectedRevision = form.receipt.revision;
      path = `/api/funding-receipts/${form.receipt.id}/${{ correct: "corrections", void: "void", add: "documents", remove: "documents/remove" }[form.kind]}`;
    }
    if (financial) Object.assign(body, { amount: form.amount.trim(), currencyId: form.currency?.id, receivedDate: form.receivedDate, externalReference: form.externalReference.trim() || null, note: form.note.trim() || null, documentIds: form.documentIds.map(Number) });
    if (form.kind === "create" && form.confirmRequired) body.confirmApprovedFundingCurrency = form.confirmation;
    if (["void", "correct", "remove"].includes(form.kind)) body.reason = form.reason.trim();
    if (form.kind === "add") body.documentId = Number(form.documentId);
    if (form.kind === "remove") body.documentId = form.document.documentId;
    send({ path, body: JSON.stringify(body), form });
  };
  const download = async id => {
    setDownloading(id); setError("");
    try { await downloadDocument(id, authFetch); }
    catch (err) { if (alive.current) setError(err.message); }
    finally { if (alive.current) setDownloading(null); }
  };
  const showRelated = async id => {
    setError(""); setRelated(null);
    try {
      const response = await authFetch(`${BASE_URL}/api/funding-receipts/${id}`, { cache: "no-store" });
      const result = await safeReadJson(response);
      if (!response.ok || !result?.id) throw new Error(result?.message || "Could not load the related receipt.");
      if (alive.current) setRelated(result);
    } catch (err) { if (alive.current) setError(err.message); }
  };
  const summary = data?.summary;
  const binding = data?.denominationConfirmation;
  const financialForm = form && ["create", "correct"].includes(form.kind);
  const evidenceForm = form && ["create", "correct", "add"].includes(form.kind);
  return <div className={styles.panel}>
    <p className={styles.hint}>Record incoming money against approved funding. These entries do not increase spending capacity and are not bank reconciliation. Voiding corrects an entry; it does not record a refund.</p>
    <div className={styles.actions}><button type="button" disabled={busy || loading} onClick={refresh}>Refresh receipts</button>{can("create") && !form && !pending && <button type="button" onClick={() => open("create")}>Record funding receipt</button>}</div>
    {loading && <p role="status">Loading receipts…</p>}
    {loadError && <p role="alert">{loadError}</p>}
    {error && <p role="alert">{error}{(form || pending) && " Your input has been retained. Reload and review before making a new attempt."}</p>}
    {pending && <div role="alert"><p>A receipt request needs confirmation. Retry sends the exact same request and cannot create a duplicate for this request key. Do not enter it again as a new receipt.</p><button type="button" disabled={busy} onClick={() => send(pending)}>Retry same request</button></div>}
    {related && <aside className={styles.entry} aria-label="Related receipt">
      <h4>Related receipt #{related.id} · {related.status}</h4>
      <p>{receiptMoney(related.amount)} {receiptCurrency(related.currency)} · Arrived {related.receivedDate}</p>
      <p>Entered {stamp(related.createdAt)} by {actor(related.createdBy)}</p>
      {related.voidReason && <p>Void reason: {related.voidReason}</p>}
      {related.note && <p>{related.note}</p>}
      <ul>{related.documents?.map(doc => <li key={doc.documentId}>{doc.documentName} · Version {doc.versionNumber} <button type="button" disabled={!doc.downloadEligible || downloading != null} onClick={() => download(doc.documentId)}>Download related evidence #{doc.documentId}</button></li>)}</ul>
      <button type="button" onClick={() => setRelated(null)}>Close related receipt</button>
    </aside>}
    {summary && <>
      <h4>{receiptStatus(summary.status)}</h4>
      <p className={styles.hint}>Current funding currency: {receiptCurrency(currency)}. Totals include all pages and exclude voided entries.</p>
      <dl className={styles.totals}>{[["Approved funding", summary.approvedFunding], ["Received", summary.receivedTotal], ["Remaining to receive", summary.remainingToReceive], ["Excess received", summary.excessReceived]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{receiptMoney(value)}</dd></div>)}</dl>
      {summary.status === "OVER_RECEIVED" && <p role="status">Receipts exceed approved funding. The excess does not increase spending capacity.</p>}
      {summary.totalsByCurrency?.map(total => <p key={total.currencyId}>Recorded {total.recordedLabel} (#{total.currencyId}): {receiptMoney(total.amount)}</p>)}
      {[...(summary.issues || []), ...(eligibility.issues || [])].filter((issue, index, all) => all.findIndex(item => item.code === issue.code) === index).map(issue => <p key={issue.code} role="status">{issue.message}</p>)}
      {editingLocked && <p>Finish editing the transaction before changing receipts.</p>}
      {binding && <p className={styles.hint}>Currency interpretation adopted: {binding.capturedName} (#{binding.currencyId}), approved amount {receiptMoney(binding.approvedAmountAtConfirmation)}, by {actor(binding.confirmedBy)} on {stamp(binding.confirmedAt)}. This is not historical verification.{binding.labelChanged && ` Current label: ${binding.currentName}.`}</p>}
    </>}
    {form && !pending && <form className={styles.form} onSubmit={submit}>
      <h4>{{ create: "Record funding receipt", correct: `Correct receipt #${form.receipt?.id}`, void: `Void receipt #${form.receipt?.id}`, add: `Add evidence to receipt #${form.receipt?.id}`, remove: `Remove evidence from receipt #${form.receipt?.id}` }[form.kind]}</h4>
      <fieldset disabled={busy || !can(form.kind)}>
        {financialForm && <>
          <p>Receipt currency: <strong>{receiptCurrency(form.currency)}</strong></p>
          <div className={styles.grid}><label>Amount received<input required inputMode="decimal" value={form.amount} onChange={event => change("amount", event.target.value)} /></label><label>Arrival date<input required type="date" min="1000-01-01" max={stockholmToday()} value={form.receivedDate} onChange={event => change("receivedDate", event.target.value)} /></label></div>
          <label>External reference (optional)<input maxLength={150} value={form.externalReference} onChange={event => change("externalReference", event.target.value)} /></label>
          <label>Note (optional)<textarea maxLength={1000} value={form.note} onChange={event => change("note", event.target.value)} /></label>
          {form.kind === "create" && form.confirmRequired && <label><input required type="checkbox" checked={form.confirmation} onChange={event => change("confirmation", event.target.checked)} /> I adopt {receiptCurrency(form.currency)} as the denomination of this transaction’s approved funding. This confirms an interpretation now, not historical verification.</label>}
          {form.kind === "correct" && <p className={styles.hint}>This will void the original and create a new receipt. Original evidence stays with the original; select evidence explicitly for the replacement.</p>}
        </>}
        {["void", "correct", "remove"].includes(form.kind) && <label>Reason (required)<textarea required maxLength={1000} value={form.reason} onChange={event => change("reason", event.target.value)} /></label>}
        {form.kind === "remove" && <p>Remove the association to {form.document.documentName}? The file and historical audit evidence remain.</p>}
        {evidenceForm && <>
          <label><input type="checkbox" checked={historical} onChange={event => { setHistorical(event.target.checked); setForm(current => ({ ...current, documentIds: [], documentId: "" })); }} /> Include active historical document versions</label>
          {documentError && <p role="alert">{documentError}</p>}
          <label>{form.kind === "add" ? "Exact document version" : "Evidence versions (optional; select one or more)"}<select multiple={form.kind !== "add"} required={form.kind === "add"} value={form.kind === "add" ? form.documentId : form.documentIds} onChange={event => form.kind === "add" ? change("documentId", event.target.value) : change("documentIds", Array.from(event.target.selectedOptions, option => option.value))}>
            {form.kind === "add" && <option value="">Select a document version</option>}
            {documents.filter(doc => form.kind !== "add" || !form.receipt.documents?.some(link => link.documentId === doc.id)).map(doc => <option key={doc.id} value={doc.id}>{doc.documentName} · v{doc.versionNumber} · {doc.status || "Unknown status"} · {doc.isCurrent ? "Current" : "Historical"} (#{doc.id})</option>)}
          </select></label>
          <p className={styles.hint}>Links retain the exact selected version. Upload new files in Documents. Draft/Final does not mean evidence has been verified.</p>
        </>}
        <button type="submit">{busy ? "Saving…" : "Confirm"}</button>
      </fieldset>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setForm(null); setError(""); }}>Cancel</button><button type="button" disabled={busy || loading} onClick={refresh}>Reload for review (keep input)</button></div>
      {form.receipt && data && !data.content.some(row => row.id === form.receipt.id && row.revision === form.receipt.revision) && <p role="status">This draft keeps the original revision. Cancel and reopen the action after reviewing current receipts to use a new revision.</p>}
    </form>}
    {!loading && data?.content.length === 0 && <p>No receipts on this page.</p>}
    {data?.content.map(receipt => <article key={receipt.id} className={`${styles.entry} ${receipt.status === "VOIDED" ? styles.voided : ""}`} aria-label={`Receipt ${receipt.id}`}>
      <h4>Receipt #{receipt.id} · {receipt.status === "VOIDED" ? "Voided" : "Recorded"}</h4>
      <p><strong>{receiptMoney(receipt.amount)} {receiptCurrency(receipt.currency)}</strong> · Arrived {receipt.receivedDate}</p>
      {receipt.currency?.labelChanged && <p className={styles.hint}>Current currency label: {receipt.currency.currentName}. The recorded label above is retained.</p>}
      <p>Financier: {receipt.financier?.name || "Unknown"} · Entered {stamp(receipt.createdAt)} by {actor(receipt.createdBy)}</p>
      {receipt.externalReference && <p>Reference: {receipt.externalReference}</p>}{receipt.note && <p>Note: {receipt.note}</p>}
      {receipt.status === "VOIDED" && <p>Voided {stamp(receipt.voidedAt)} by {actor(receipt.voidedBy)} · {receipt.voidReason}</p>}
      {receipt.replacesReceiptId && <p>Corrects <button type="button" onClick={() => showRelated(receipt.replacesReceiptId)}>receipt #{receipt.replacesReceiptId}</button>.</p>}
      {receipt.replacementReceiptId && <p>Replaced by <button type="button" onClick={() => showRelated(receipt.replacementReceiptId)}>receipt #{receipt.replacementReceiptId}</button>.</p>}
      <ul className={styles.evidence}>{receipt.documents?.map(doc => <li key={doc.documentId}>{doc.documentName} · v{doc.versionNumber} · {doc.status || "Unknown status"}{doc.hasNewerVersion && " · Newer version exists; this evidence retains its version"}{!doc.downloadEligible && " · Unavailable for download"}<div className={styles.actions}><button type="button" disabled={!doc.downloadEligible || downloading != null} onClick={() => download(doc.documentId)}>Download evidence #{doc.documentId}</button>{receipt.status === "RECORDED" && can("remove") && <button type="button" disabled={busy || !!form || !!pending} onClick={() => open("remove", receipt, doc)}>Remove evidence #{doc.documentId}</button>}</div></li>)}</ul>
      {!receipt.documents?.length && <p className={styles.hint}>No evidence linked.</p>}
      {receipt.status === "RECORDED" && <div className={styles.actions}>{[["add", "Add evidence"], ["correct", "Correct receipt"], ["void", "Void receipt"]].map(([kind, label]) => can(kind) && <button key={kind} type="button" disabled={busy || !!form || !!pending} onClick={() => open(kind, receipt)}>{label} #{receipt.id}</button>)}</div>}
    </article>)}
    {data && <div className={styles.actions}><span>{data.totalElements} receipts · Page {page + 1} of {Math.max(1, Math.ceil(data.totalElements / 20))}</span><button type="button" disabled={busy || loading || !!form || !!pending || page === 0} onClick={() => setPage(value => value - 1)}>Previous receipts</button><button type="button" disabled={busy || loading || !!form || !!pending || (page + 1) * 20 >= data.totalElements} onClick={() => setPage(value => value + 1)}>Next receipts</button></div>}
  </div>;
}

export default function FundingReceipts(props) {
  const [opened, setOpened] = useState(false);
  if (!Number.isSafeInteger(Number(props.transactionId)) || Number(props.transactionId) <= 0) return null;
  return <details className={styles.section} onToggle={event => { if (event.currentTarget === event.target && event.currentTarget.open) setOpened(true); }}><summary>Funding receipts · Transaction #{props.transactionId}</summary>{opened && <ReceiptsPanel key={props.transactionId} {...props} />}</details>;
}
