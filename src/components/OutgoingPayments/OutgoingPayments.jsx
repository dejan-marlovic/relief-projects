import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { paymentAmountError, paymentCommandStore, paymentCurrency, paymentMoney, paymentStatus, stockholmToday } from "../../utils/outgoingPayments";
import styles from "../FundingReceipts/FundingReceipts.module.scss";

const stamp = value => value ? new Date(value).toLocaleString() : "Unknown";
const actor = value => value?.username || (value?.userId ? `User #${value.userId}` : "Unknown");

export function PaymentsPanel({ paymentOrderId, refreshKey, editingLocked, onChanged }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { user } = useAuth();
  const store = useMemo(() => paymentCommandStore(user?.id ?? user?.username ?? "current", paymentOrderId), [user?.id, user?.username, paymentOrderId]);
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
  useEffect(() => { alive.current = true; const onFocus = () => setRevision(value => value + 1); window.addEventListener("focus", onFocus); return () => { alive.current = false; window.removeEventListener("focus", onFocus); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(""); setRelated(null);
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/payment-orders/${paymentOrderId}/payments?page=${page}&size=20`, { signal: controller.signal, cache: "no-store" });
        const result = await safeReadJson(response);
        if (!response.ok || !Array.isArray(result?.content) || !result.summary || !result.eligibility) throw new Error(result?.message || "Could not load outgoing payments.");
        if (!controller.signal.aborted) setData(result);
      } catch (err) { if (!controller.signal.aborted) { setData(null); setLoadError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, paymentOrderId, page, revision, refreshKey]);

  const projectId = data?.summary?.currentOrderConfiguration?.projectId;
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
  const currency = data?.summary?.currentOrderConfiguration?.currency;
  const can = (kind, row = null) => !editingLocked && !loading && !loadError && Boolean((kind === "create" ? eligibility : row?.eligibility || {})[kind === "create" ? "canRecord" : kind === "correct" ? "canCorrect" : kind === "void" ? "canVoid" : "canManageEvidence"]);
  const open = (kind, payment = null, document = null) => {
    setError(""); setHistorical(false);
    setForm({ kind, payment, document, recipient: kind === "correct" ? { id: payment.recipientId, organizationName: payment.organization?.name } : eligibility.recipient, currency: kind === "correct" ? payment.currency : currency, confirmRequired: eligibility.requiresDenominationConfirmation, amount: kind === "correct" ? payment.amount : "", paidDate: kind === "correct" ? payment.paidDate : stockholmToday(), externalReference: kind === "correct" ? payment.externalReference || "" : "", note: kind === "correct" ? payment.note || "" : "", reason: "", documentIds: [], documentId: "", confirmation: false });
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
      if (!result?.id && !result?.payment?.id) throw new Error("The server response was incomplete. Retry the same request to confirm the outcome.");
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
    if (!form || pending || !can(form.kind, data?.content.find(row => row.id === form.payment?.id))) return;
    const financial = ["create", "correct"].includes(form.kind);
    if (financial && paymentAmountError(form.amount)) { setError(paymentAmountError(form.amount)); return; }
    if (!window.crypto?.randomUUID) { setError("A secure browser connection is required to generate a payment request ID. Use HTTPS or localhost."); return; }
    const body = { requestId: window.crypto.randomUUID() };
    let path = `/api/payment-orders/${paymentOrderId}/payments`;
    if (form.kind !== "create") {
      body.expectedRevision = form.payment.revision;
      path = `/api/outgoing-payments/${form.payment.id}/${{ correct: "corrections", void: "void", add: "documents", remove: "documents/remove" }[form.kind]}`;
    }
    if (financial) Object.assign(body, { amount: form.amount.trim(), recipientId: form.recipient?.id, currencyId: form.currency?.id, paidDate: form.paidDate, externalReference: form.externalReference.trim() || null, note: form.note.trim() || null, documentIds: form.documentIds.map(Number) });
    if (form.kind === "create" && form.confirmRequired) body.confirmCommitmentDenomination = form.confirmation;
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
      const response = await authFetch(`${BASE_URL}/api/outgoing-payments/${id}`, { cache: "no-store" });
      const result = await safeReadJson(response);
      if (!response.ok || !result?.id) throw new Error(result?.message || "Could not load the related payment.");
      if (alive.current) setRelated(result);
    } catch (err) { if (alive.current) setError(err.message); }
  };
  const summary = data?.summary;
  const binding = data?.denominationConfirmation;
  const financialForm = form && ["create", "correct"].includes(form.kind);
  const evidenceForm = form && ["create", "correct", "add"].includes(form.kind);
  return <div className={styles.panel}>
    <p className={styles.hint}>Record money paid to the recipient. This records a user-entered fact; it does not execute a bank payment or change commitments, signatures or Booked status. These entries do not increase spending capacity and are not bank reconciliation. Voiding corrects an entry; it does not record a refund.</p>
    <div className={styles.actions}><button type="button" disabled={busy || loading} onClick={refresh}>Refresh payments</button>{can("create") && !form && !pending && <button type="button" onClick={() => open("create")}>Record outgoing payment</button>}</div>
    {loading && <p role="status">Loading payments…</p>}
    {loadError && <p role="alert">{loadError}</p>}
    {error && <p role="alert">{error}{(form || pending) && " Your input has been retained. Reload and review before making a new attempt."}</p>}
    {pending && <div role="alert"><p>A payment request needs confirmation. Retry sends the exact same request and cannot create a duplicate for this request key. Do not enter it again as a new payment.</p><button type="button" disabled={busy} onClick={() => send(pending)}>Retry same request</button></div>}
    {related && <aside className={styles.entry} aria-label="Related payment">
      <h4>Related payment #{related.id} · {related.status}</h4>
      <p>{paymentMoney(related.amount)} {paymentCurrency(related.currency)} · Paid on {related.paidDate}</p>
      <p>Entered {stamp(related.createdAt)} by {actor(related.createdBy)}</p>
      {related.voidReason && <p>Void reason: {related.voidReason}</p>}
      {related.note && <p>{related.note}</p>}
      <ul>{related.documents?.map(doc => <li key={doc.documentId}>{doc.documentName} · Version {doc.versionNumber} <button type="button" disabled={!doc.downloadEligible || downloading != null} onClick={() => download(doc.documentId)}>Download related evidence #{doc.documentId}</button></li>)}</ul>
      <button type="button" onClick={() => setRelated(null)}>Close related payment</button>
    </aside>}
    {summary && <>
      <h4>{paymentStatus(summary.status)}</h4>
      <p className={styles.hint}>Current order currency: {paymentCurrency(currency)}. Totals include all pages and exclude voided entries.</p>
      <p>Recipient: <strong>{eligibility.recipient?.organizationName || binding?.organization?.name || "Unavailable"}</strong>{eligibility.recipient?.id && ` (#${eligibility.recipient.id})`}</p>
      <dl className={styles.totals}>{[["Paid", summary.paidTotal], ["Recipient commitments", summary.recipientCommitment], ["Recipient remaining", summary.recipientRemaining], ["Recipient excess", summary.recipientExcess]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{paymentMoney(value)}</dd></div>)}</dl>
      {summary.status === "OVER_PAID" && <p role="status">Payments exceed this recipient’s commitments. The excess does not increase spending capacity.</p>}
      <details><summary>Whole-order comparison</summary><p className={styles.hint}>Order remaining is not authorization to pay that amount to this recipient. The order can include other organizations’ commitments. These totals describe the same payments; do not add them to recipient totals.</p><dl className={styles.totals}>{[["Order commitments", summary.orderCommitment], ["Order remaining", summary.orderRemaining], ["Order excess", summary.orderExcess]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{paymentMoney(value)}</dd></div>)}</dl></details>
      <p className={styles.hint}>Comparison: {summary.comparisonStatus === "AVAILABLE" ? "Available" : summary.comparisonStatus === "UNCONFIRMED" ? "Awaiting explicit denomination confirmation" : "Unavailable; unknown amounts are not zero"}.</p>
      {summary.totalsByCurrency?.map(total => <p key={total.currencyId}>Recorded {total.recordedLabel} (#{total.currencyId}): {paymentMoney(total.amount)}</p>)}
      {[...(summary.issues || []), ...(eligibility.recordingIssues || [])].filter((issue, index, all) => all.findIndex(item => JSON.stringify(item) === JSON.stringify(issue)) === index).map((issue, index) => <p key={index} role="status">{issue.message}</p>)}
      {editingLocked && <p>Finish editing the payment order before changing payments.</p>}
      {binding && <p className={styles.hint}>Currency interpretation adopted: {binding.capturedName} (#{binding.currencyId}), recipient commitments {paymentMoney(binding.recipientCommitment)}; order commitments {paymentMoney(binding.orderCommitment)}, by {actor(binding.confirmedBy)} on {stamp(binding.confirmedAt)}. This is not historical verification.{binding.labelChanged && ` Current label: ${binding.currentName}.`}</p>}
    </>}
    {form && !pending && <form className={styles.form} onSubmit={submit}>
      <h4>{{ create: "Record outgoing payment", correct: `Correct payment #${form.payment?.id}`, void: `Void payment #${form.payment?.id}`, add: `Add evidence to payment #${form.payment?.id}`, remove: `Remove evidence from payment #${form.payment?.id}` }[form.kind]}</h4>
      <fieldset disabled={busy || !can(form.kind, data?.content.find(row => row.id === form.payment?.id))}>
        {financialForm && <>
          <p>Recipient: <strong>{form.recipient?.organizationName || "Unavailable"} (#{form.recipient?.id})</strong></p>
          <p>Payment currency: <strong>{paymentCurrency(form.currency)}</strong></p>
          <div className={styles.grid}><label>Amount paid<input required inputMode="decimal" value={form.amount} onChange={event => change("amount", event.target.value)} /></label><label>Payment date<input required type="date" min="1000-01-01" max={stockholmToday()} value={form.paidDate} onChange={event => change("paidDate", event.target.value)} /></label></div>
          <label>External reference (optional)<input maxLength={150} value={form.externalReference} onChange={event => change("externalReference", event.target.value)} /></label>
          <label>Note (optional)<textarea maxLength={1000} value={form.note} onChange={event => change("note", event.target.value)} /></label>
          {form.kind === "create" && form.confirmRequired && <label><input required type="checkbox" checked={form.confirmation} onChange={event => change("confirmation", event.target.checked)} /> I adopt {paymentCurrency(form.currency)} as the denomination of this order’s commitments for payment comparison. This confirms an interpretation now, not historical verification.</label>}
          {form.kind === "correct" && <p className={styles.hint}>This will void the original and create a new payment. Original evidence stays with the original; select evidence explicitly for the replacement.</p>}
        </>}
        {["void", "correct", "remove"].includes(form.kind) && <label>Reason (required)<textarea required maxLength={1000} value={form.reason} onChange={event => change("reason", event.target.value)} /></label>}
        {form.kind === "remove" && <p>Remove the association to {form.document.documentName}? The file and historical audit evidence remain.</p>}
        {evidenceForm && <>
          <label><input type="checkbox" checked={historical} onChange={event => { setHistorical(event.target.checked); setForm(current => ({ ...current, documentIds: [], documentId: "" })); }} /> Include active historical document versions</label>
          {documentError && <p role="alert">{documentError}</p>}
          <label>{form.kind === "add" ? "Exact document version" : "Evidence versions (optional; select one or more)"}<select multiple={form.kind !== "add"} required={form.kind === "add"} value={form.kind === "add" ? form.documentId : form.documentIds} onChange={event => form.kind === "add" ? change("documentId", event.target.value) : change("documentIds", Array.from(event.target.selectedOptions, option => option.value))}>
            {form.kind === "add" && <option value="">Select a document version</option>}
            {documents.filter(doc => form.kind !== "add" || !form.payment.documents?.some(link => link.documentId === doc.id)).map(doc => <option key={doc.id} value={doc.id}>{doc.documentName} · v{doc.versionNumber} · {doc.status || "Unknown status"} · {doc.isCurrent ? "Current" : "Historical"} (#{doc.id})</option>)}
          </select></label>
          <p className={styles.hint}>Links retain the exact selected version. Upload new files in Documents. Draft/Final does not mean evidence has been verified.</p>
        </>}
        <button type="submit">{busy ? "Saving…" : "Confirm"}</button>
      </fieldset>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setForm(null); setError(""); }}>Cancel</button><button type="button" disabled={busy || loading} onClick={refresh}>Reload for review (keep input)</button></div>
      {form.payment && data && !data.content.some(row => row.id === form.payment.id && row.revision === form.payment.revision) && <p role="status">This draft keeps the original revision. Cancel and reopen the action after reviewing current payments to use a new revision.</p>}
    </form>}
    {!loading && data?.content.length === 0 && <p>No payments on this page.</p>}
    {data?.content.map(payment => <article key={payment.id} className={`${styles.entry} ${payment.status === "VOIDED" ? styles.voided : ""}`} aria-label={`Payment ${payment.id}`}>
      <h4>Payment #{payment.id} · {payment.status === "VOIDED" ? "Voided" : "Recorded"}</h4>
      <p><strong>{paymentMoney(payment.amount)} {paymentCurrency(payment.currency)}</strong> · Paid on {payment.paidDate}</p>
      {payment.currency?.labelChanged && <p className={styles.hint}>Current currency label: {payment.currency.currentName}. The recorded label above is retained.</p>}
      <p>Recipient organization: {payment.organization?.name || "Unknown"} · Entered {stamp(payment.createdAt)} by {actor(payment.createdBy)}</p>
      {payment.externalReference && <p>Reference: {payment.externalReference}</p>}{payment.note && <p>Note: {payment.note}</p>}
      {payment.status === "VOIDED" && <p>Voided {stamp(payment.voidedAt)} by {actor(payment.voidedBy)} · {payment.voidReason}</p>}
      {payment.replacesPaymentId && <p>Corrects <button type="button" onClick={() => showRelated(payment.replacesPaymentId)}>payment #{payment.replacesPaymentId}</button>.</p>}
      {payment.replacementPaymentId && <p>Replaced by <button type="button" onClick={() => showRelated(payment.replacementPaymentId)}>payment #{payment.replacementPaymentId}</button>.</p>}
      <ul className={styles.evidence}>{payment.documents?.map(doc => <li key={doc.documentId}>{doc.documentName} · v{doc.versionNumber} · {doc.status || "Unknown status"}{doc.hasNewerVersion && " · Newer version exists; this evidence retains its version"}{!doc.downloadEligible && " · Unavailable for download"}<div className={styles.actions}><button type="button" disabled={!doc.downloadEligible || downloading != null} onClick={() => download(doc.documentId)}>Download evidence #{doc.documentId}</button>{payment.status === "RECORDED" && can("remove", payment) && <button type="button" disabled={busy || !!form || !!pending} onClick={() => open("remove", payment, doc)}>Remove evidence #{doc.documentId}</button>}</div></li>)}</ul>
      <details><summary>Payment action availability</summary>{[...(payment.eligibility?.voidIssues || []), ...(payment.eligibility?.correctionIssues || []), ...(payment.eligibility?.evidenceIssues || [])].filter((issue, index, all) => all.findIndex(item => item.code === issue.code && item.message === issue.message) === index).map((issue, index) => <p key={index}>{issue.message}</p>)}</details>
      {!payment.documents?.length && <p className={styles.hint}>No evidence linked.</p>}
      {payment.status === "RECORDED" && <div className={styles.actions}>{[["add", "Add evidence"], ["correct", "Correct payment"], ["void", "Void payment"]].map(([kind, label]) => can(kind, payment) && <button key={kind} type="button" disabled={busy || !!form || !!pending} onClick={() => open(kind, payment)}>{label} #{payment.id}</button>)}</div>}
    </article>)}
    {data && <div className={styles.actions}><span>{data.totalElements} payments · Page {page + 1} of {Math.max(1, Math.ceil(data.totalElements / 20))}</span><button type="button" disabled={busy || loading || !!form || !!pending || page === 0} onClick={() => setPage(value => value - 1)}>Previous payments</button><button type="button" disabled={busy || loading || !!form || !!pending || (page + 1) * 20 >= data.totalElements} onClick={() => setPage(value => value + 1)}>Next payments</button></div>}
  </div>;
}

export default function OutgoingPayments(props) {
  const [opened, setOpened] = useState(false);
  if (!Number.isSafeInteger(Number(props.paymentOrderId)) || Number(props.paymentOrderId) <= 0) return null;
  return <details className={styles.section} onToggle={event => { if (event.currentTarget === event.target && event.currentTarget.open) setOpened(true); }}><summary>Outgoing payments · Payment order #{props.paymentOrderId}</summary>{opened && <PaymentsPanel key={props.paymentOrderId} {...props} />}</details>;
}
