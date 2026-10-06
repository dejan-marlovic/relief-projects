import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { paymentCurrency, paymentMoney, paymentStatus } from "../../utils/outgoingPayments";
import styles from "./PaymentOrderReport.module.scss";

const value = text => text == null || text === "" ? "Unavailable" : String(text);
const identity = item => item ? `${item.name || "Name unavailable"} (#${item.id})` : "Unavailable";
const actor = item => item ? `${item.username || "Unknown user"} (#${item.userId})` : "Unavailable";
const flag = input => input === true ? "Yes" : input === false ? "No" : "Unknown";
const stamp = input => input ? `${new Date(input).toLocaleString()} (${input})` : "Unavailable";
const evidenceLabel = role => ({ SIGNED_PAYMENT_ORDER: "Signed payment order", COMBINED_PAYMENT_EVIDENCE: "Combined payment evidence" }[role] || value(role));
function Issues({ issues = [] }) { return issues.length > 0 && <ul className={styles.issues}>{issues.map((issue, i) => <li key={i}>{issue.code}: {issue.message}{issue.lineId != null && ` · Line #${issue.lineId}`}</li>)}</ul>; }
function Currency({ summary }) { return <><span>{value(summary?.status || summary?.availability)} · {paymentCurrency(summary?.currency)}</span><Issues issues={summary?.issues} /></>; }
function Table({ title, headers, rows }) { return <section><h2>{title}</h2>{rows.length ? <div className={styles.tableWrap}><table><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div> : <p>No current records in this section.</p>}</section>; }

export function validReport(data, id) {
  return data?.version === 1 && data.view === "CURRENT_STATE" && String(data.paymentOrderId) === String(id)
    && data.coverage?.metadataComplete === true && data.order && data.commitments && data.payments?.summary
    && data.recipientReturns?.summary && Array.isArray(data.recipientReturns.entries)
    && [data.lines, data.recipients, data.signatures, data.payments.entries, data.documents, data.issues].every(Array.isArray);
}

export function ReportContent({ data, onDownload, downloading, downloadError }) {
  const summary = data.payments.summary, binding = data.payments.denominationConfirmation;
  return <article className={styles.report}>
    <header><h1>Payment order #{data.paymentOrderId}</h1><p><strong>Current-state report · Metadata only</strong></p><p>Observed: {stamp(data.observedAt)}</p><p>This is a database observation, not a retained approval snapshot. File contents were not checked. It does not certify signatures, settlement or complete payment evidence.</p></header>
    <section><h2>Order details</h2><dl>
      <dt>Project</dt><dd>{identity(data.project)}{data.project?.code && ` · ${data.project.code}`}</dd>
      <dt>Header transaction</dt><dd>{data.order.transactionId == null ? "No header transaction" : `#${data.order.transactionId}`}</dd>
      <dt>Description</dt><dd>{value(data.order.description)}</dd>
      <dt>Order date (local)</dt><dd>{value(data.order.date)}</dd>
      <dt>Lifecycle status</dt><dd>{value(data.order.lifecycleStatus)}</dd>
      <dt>Booked lock</dt><dd>{flag(data.order.locked)}</dd><dt>Deleted</dt><dd>{flag(data.order.deleted)}</dd>
      <dt>Order commitments</dt><dd>{paymentMoney(data.commitments.amount)} · <Currency summary={data.commitments.amountSummary} /></dd>
    </dl><p>Commitments are not money paid. Their currency reflects current budget configuration, not verified historical denomination. Unavailable amounts are unknown, not zero.</p><Issues issues={data.issues} /></section>
    <Table title="Payment lines" headers={["Line / transaction", "Cost budget / revision", "Cost detail", "Organisation", "Commitment", "Currency observation"]} rows={data.lines.map(line => [<span>#{line.id} · TX #{value(line.transactionId)}</span>, <span>{value(line.budgetName)} (#{value(line.budgetId)})<br />Family #{value(line.revisionFamilyId)} · Revision {value(line.revisionNumber)}</span>, <span>#{value(line.costDetailId)} · {value(line.costDescription)}</span>, identity(line.organization), paymentMoney(line.amount), <><Currency summary={line.amountSummary || line.amountCurrency} /><p>Funding budget #{value(line.amountCurrency?.budgetId)} · Project #{value(line.amountCurrency?.projectId)}</p></>])} />
    <Table title="Recipient commitments" headers={["Recipient", "Organisation", "Contributing subtotal", "Currency observation"]} rows={data.recipients.map(row => [`#${row.id}`, identity(row.organization), paymentMoney(row.amount), <Currency summary={row.amountSummary} />])} />
    <p>Recipient subtotals are part of the order commitments. Do not add them to the order total.</p>
    <section><h2>Recorded outgoing payments · {paymentStatus(summary.status)}</h2><p>Totals exclude voided entries and include all recorded entries. Voiding corrects an entry; it does not record a refund.</p>
      <p>Comparison: {value(summary.comparisonStatus)} · Current order currency: {paymentCurrency(summary.currentOrderConfiguration?.currency)}</p>
      <dl>{[["Recorded paid", summary.paidTotal], ["Recipient commitment", summary.recipientCommitment], ["Recipient remaining", summary.recipientRemaining], ["Recipient excess", summary.recipientExcess], ["Order commitment", summary.orderCommitment], ["Order remaining", summary.orderRemaining], ["Order excess", summary.orderExcess]].map(([label, amount]) => <React.Fragment key={label}><dt>{label}</dt><dd>{paymentMoney(amount)}</dd></React.Fragment>)}</dl>
      <p><strong>Order remaining is not authorization to pay that amount to this recipient.</strong> Recipient and order comparisons describe the same payments; do not add them together.</p>
      <p>Recorded entries: {value(summary.recordedCount)} · Voided entries: {value(summary.voidedCount)}</p>
      {summary.totalsByCurrency?.map(total => <p key={total.currencyId}>Recorded {value(total.recordedLabel)} (#{total.currencyId}): {paymentMoney(total.amount)}</p>)}
      <Issues issues={summary.issues} />
      {binding && <p>Denomination interpretation adopted: {binding.capturedName} (#{binding.currencyId}); recipient #{binding.recipientId} · {identity(binding.organization)}; captured recipient commitment {paymentMoney(binding.recipientCommitment)}, order commitment {paymentMoney(binding.orderCommitment)}. Recorded by {actor(binding.confirmedBy)} on {stamp(binding.confirmedAt)}. This is not historical verification.{binding.labelChanged && ` Current currency label: ${binding.currentName}.`}</p>}
    </section>
    <Table title="Payment entries, including voids and corrections" headers={["Entry / recipient", "Recorded amount / currency", "Paid date", "State / correction", "Attribution"]} rows={data.payments.entries.map(row => [`#${row.id} · Recipient #${row.recipientId} · ${identity(row.organization)}`, <>{paymentMoney(row.amount)} · {paymentCurrency(row.currency)}{row.currency?.labelChanged && <p>Current label: {row.currency.currentName}</p>}</>, row.paidDate, <>{row.status}{row.replacesPaymentId && <p>Corrects #{row.replacesPaymentId}</p>}{row.replacementPaymentId && <p>Replaced by #{row.replacementPaymentId}</p>}</>, <>Entered by {actor(row.createdBy)} · {stamp(row.createdAt)}{row.voidedAt && <p>Voided by {actor(row.voidedBy)} · {stamp(row.voidedAt)}</p>}</>])} />
    <section><h2>Money returned by recipients</h2><p>Gross paid and commitment comparisons above remain unchanged. Net paid is not spending capacity, a bank balance or permission to pay again. Figures cover all recorded entries and exclude voided returns.</p>
      <p>Return comparison: {value(data.recipientReturns.summary.status)}</p>
      <dl>{[["Gross paid", data.recipientReturns.summary.grossPaid], ["Returned from recipient", data.recipientReturns.summary.returnedFromRecipient], ["Net paid — not spending capacity", data.recipientReturns.summary.netPaid]].map(([label, amount]) => <React.Fragment key={label}><dt>{label}</dt><dd>{paymentMoney(amount)}</dd></React.Fragment>)}</dl>
      {data.recipientReturns.summary.totalsByCurrency?.map(group => <p key={group.currencyId}>{group.recordedLabel || "Currency"} (#{group.currencyId}): Gross {paymentMoney(group.grossPaid)} · Returned {paymentMoney(group.returnedFromRecipient)} · Net {paymentMoney(group.netPaid)}</p>)}
      <p>Recorded returns: {value(data.recipientReturns.summary.recordedCount)} · Voided returns: {value(data.recipientReturns.summary.voidedCount)}. No recorded returns does not prove no bank return occurred.</p>
      <Issues issues={data.recipientReturns.summary.issues} />
    </section>
    <Table title="Recipient return entries, including voids and corrections" headers={["Return / original payment", "Recipient", "Amount / recorded currency", "Date / reference / reason", "State / correction", "Attribution"]} rows={data.recipientReturns.entries.map(row => [`#${row.id} · Original payment #${row.originalPaymentId}`, `Recipient #${row.recipientId} · ${identity(row.organization)}`, <>{paymentMoney(row.amount)} · {paymentCurrency(row.currency)}{row.currency?.labelChanged && <p>Current label: {row.currency.currentName}</p>}</>, <>{row.returnedDate}<p>Reference: {value(row.externalReference)}</p><p>Reason: {value(row.reason)}</p></>, <>{row.status}{row.replacesReturnId && <p>Corrects return #{row.replacesReturnId}</p>}{row.replacementReturnId && <p>Replaced by return #{row.replacementReturnId}</p>}</>, <>Entered by {actor(row.createdBy)} · {stamp(row.createdAt)}{row.voidedAt && <p>Voided by {actor(row.voidedBy)} · {stamp(row.voidedAt)} · {value(row.voidReason)}</p>}</>])} />
    <Table title="Recorded signature metadata" headers={["Signature", "Named employee", "Recorded status", "Date (local)"]} rows={data.signatures.map(row => [`#${row.id}`, identity(row.employee), identity(row.status), value(row.signatureDate)])} />
    <p>Recorded signature metadata does not verify a signature on this report. The named employee is not necessarily the user who entered the record.</p>
    <section><h2>Exact-version supporting-document index</h2><p>Current associations only, including evidence on voided payments and recipient returns. Removed associations remain outside this report. FINAL is a document status, not proof of signing. Download permission and storage availability are checked again when requested.</p>
      {downloadError && <p role="alert" className={styles.noPrint}>{downloadError}</p>}
      {!data.documents.length && <p>No current supporting-document associations.</p>}
      {data.documents.map(({ document: doc, associations }) => <div className={styles.document} key={doc.documentId}>
        <h3>{doc.documentName || "Name unavailable"} · Document #{doc.documentId}</h3>
        <p>Root #{value(doc.rootDocumentId)} · Version {value(doc.versionNumber)} · {value(doc.status)} · {value(doc.category)} · Date: {value(doc.documentDate)}</p>
        <p>Current chain head: {flag(doc.isCurrent)} · Newer version: {flag(doc.hasNewerVersion)} · Document deleted: {flag(doc.documentDeleted)} · Project deleted: {flag(doc.projectDeleted)} · Target deleted: {flag(doc.targetDeleted)}</p>
        <ul>{associations.map((link, i) => <li key={i}>{link.entityType === "PAYMENT_ORDER_FINAL_EVIDENCE" ? <>Late payment evidence · Attachment #{link.entityId} · {evidenceLabel(link.role)}. Not part of the approval decision. Attached {stamp(link.attachedAt)} by {actor(link.attachedBy)}.</> : link.entityType === "RECIPIENT_RETURN" ? <>Recipient return #{link.entityId} · Original payment #{link.originalPaymentId} · {link.status}{link.status === "VOIDED" && " · Evidence retained for a voided return"}. Not approval-time evidence.</> : <>{link.entityType} #{link.entityId} · {link.status}{link.status === "VOIDED" && " — historical payment evidence"}{(link.entityType === "PAYMENT_ORDER" || link.meaning === "ORDINARY_SUPPORT_APPROVAL_TIME_NOT_RECORDED") && " · Ordinary supporting documents — approval-time inclusion not recorded"}</>}</li>)}</ul>
        <p>{doc.downloadEligible ? "Eligible for a protected download at observation time; file contents not checked." : "Download unavailable at observation time."}</p>
        <button type="button" className={styles.noPrint} disabled={!doc.downloadEligible || downloading != null} onClick={() => onDownload(doc.documentId)}>Download exact version #{doc.documentId}</button>
      </div>)}
    </section>
  </article>;
}

export default function PaymentOrderReport() {
  const { id } = useParams(), navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), [downloading, setDownloading] = useState(null), [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    const changed = event => { if (String(event.detail?.paymentOrderId) === String(id)) setRefresh(n => n + 1); };
    const stored = event => { if (event.key === "payment-order-evidence-changed") { try { changed({ detail: JSON.parse(event.newValue) }); } catch (_) { /* Ignore unrelated malformed storage values. */ } } };
    window.addEventListener("payment-order-evidence-changed", changed); window.addEventListener("storage", stored);
    return () => { window.removeEventListener("payment-order-evidence-changed", changed); window.removeEventListener("storage", stored); };
  }, [id]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null); setError(""); setDownloadError("");
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/payment-orders/${encodeURIComponent(id)}/documentation`, { signal: controller.signal, cache: "no-store" });
        const result = await safeReadJson(response);
        if (!response.ok) throw new Error(`${result?.code ? `${result.code}: ` : ""}${result?.message || "Unable to load the payment-order report. The endpoint may be unavailable; check that the backend has been restarted."}`);
        if (!validReport(result, id)) throw new Error("Unsupported or incomplete report response. No partial report will be printed.");
        if (!controller.signal.aborted) setData(result);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [id, authFetch, refresh]);
  useEffect(() => { const previous = document.title; document.title = `payment-order-${/^\d+$/.test(id) ? id : "report"}`; return () => { document.title = previous; }; }, [id]);
  async function download(documentId) { setDownloading(documentId); setDownloadError(""); try { await downloadDocument(documentId, authFetch); } catch (e) { setDownloadError(e.message); } finally { setDownloading(null); } }
  return <main className={styles.page}>
    <nav className={styles.noPrint} aria-label="Report actions"><a href="/payments">Payments</a><button disabled={loading} onClick={() => setRefresh(n => n + 1)}>Refresh whole report</button><button disabled={loading || !data || !!error} onClick={() => window.print()}>Print / Save as PDF</button></nav>
    {loading && <p>Loading payment-order report…</p>}{error && <p role="alert">{error}</p>}
    {data && !error && <ReportContent data={data} onDownload={download} downloading={downloading} downloadError={downloadError} />}
  </main>;
}
