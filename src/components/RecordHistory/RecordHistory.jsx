import useAutomaticRefresh from "../../hooks/useAutomaticRefresh";
import { HistoryPagination, HistoryTimeline, HistoryEntry } from "../ActivityHistory/ActivityHistory";
import RecipientReturnAuditDetails from "../RecipientReturns/RecipientReturnAuditDetails";
import FundingReturnAuditDetails from "../FundingReturns/FundingReturnAuditDetails";
import OutgoingPaymentAuditDetails from "../OutgoingPayments/OutgoingPaymentAuditDetails";
import FundingReceiptAuditDetails from "../FundingReceipts/FundingReceiptAuditDetails";
import PaymentCurrencyContext from "../PaymentCurrencyContext/PaymentCurrencyContext";
import TransactionCurrencyContext from "../TransactionCurrencyContext/TransactionCurrencyContext";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import styles from "./RecordHistory.module.scss";
import ReturnReason from "../ReturnReason/ReturnReason";
import AuditFieldChanges from "../AuditFieldChanges/AuditFieldChanges";
import { auditActionLabel, hasAuditTransition, uniqueAuditEvents } from "../../utils/auditEvents";
import RecipientAuditDetails from "../RecipientAuditDetails/RecipientAuditDetails";
import SignatureAuditDetails from "../SignatureAuditDetails/SignatureAuditDetails";
import CostDetailAuditDetails from "../CostDetailAuditDetails/CostDetailAuditDetails";
import AllocationAuditDetails from "../AllocationAuditDetails/AllocationAuditDetails";
import LineAuditDetails from "../LineAuditDetails/LineAuditDetails";

const labels = { BUDGET: "Budget", TRANSACTION: "Transaction", PAYMENT_ORDER: "Payment order" };
const readable = (value) => value ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ") : "—";

function HistoryPage({ entityType, entityId, includeChildren }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    const load = async () => {
      try {
        const query = new URLSearchParams({ entityType, entityId: String(entityId), page: String(page), size: "20" });
        if (["BUDGET", "PAYMENT_ORDER", "TRANSACTION"].includes(entityType) && includeChildren) query.set("includeChildren", "true");
        const response = await authFetch(`${BASE_URL}/api/audit-events?${query}`, { signal: controller.signal });
        const body = await safeReadJson(response);
        if (!response.ok) {
          const message = response.status === 403 ? "You do not have permission to view this record’s history."
            : response.status === 404 ? "This record is unavailable."
            : body?.message || "Lifecycle history could not be loaded. Please try again.";
          throw new Error(message);
        }
        if (!Array.isArray(body?.content)) throw new Error("Lifecycle history could not be loaded. Please try again.");
        if (!controller.signal.aborted) setState({ loading: false, result: { ...body, content: uniqueAuditEvents(body.content) } });
      } catch (error) {
        if (!controller.signal.aborted) setState({ loading: false, error: error.message });
      }
    };
    load();
    return () => controller.abort();
  }, [authFetch, entityType, entityId, includeChildren, page, refresh]);

  const { loading, error, result } = state;
  useAutomaticRefresh(() => setRefresh(v => v + 1), loading);
  return <div className={styles.panel}>
    <p>Review the recorded changes to this record. Each entry identifies the action, actor and saved changes; before and after values describe that event, not the current record. History records activity, not completion of a workflow.</p>
    <div className={styles.toolbar}>
      <span>Activity history · newest first</span>
      {(error) && <button type="button" disabled={loading} onClick={() => { setPage(0); setRefresh((value) => value + 1); }}>Retry history</button>}
    </div>
    {loading && <p role="status">Loading record history…</p>}
    {error && <p role="alert">{error}</p>}
    {result && <>
      {result.content.length === 0 ? <p role="status">No record history yet.</p> :
        <HistoryTimeline aria-label={`${labels[entityType]} #${entityId} history`}>{result.content.map(event => <HistoryEntry key={event.id} title={auditActionLabel(event)} at={event.occurredAt} actor={event.performedByDisplay || (event.performedBy ? `User #${event.performedBy}` : "Unknown user")} references={<p>Entry #{event.id} · {event.entityType || entityType} #{event.entityId || entityId}{event.performedBy != null && <> · User #{event.performedBy}</>}</p>}>
{event.entityType === "RECIPIENT_RETURN" ? <RecipientReturnAuditDetails event={event} /> : event.entityType === "FUNDING_RETURN" ? <FundingReturnAuditDetails event={event} /> : event.entityType === "OUTGOING_PAYMENT" ? <OutgoingPaymentAuditDetails event={event} /> : event.entityType === "FUNDING_RECEIPT" ? <FundingReceiptAuditDetails event={event} /> : event.entityType === "RECIPIENT" ? <RecipientAuditDetails event={event} /> : event.entityType === "SIGNATURE" ? <SignatureAuditDetails event={event} /> : event.entityType === "COST_DETAIL" ? <CostDetailAuditDetails event={event} /> : event.entityType === "COST_DETAIL_ALLOCATION" ? <AllocationAuditDetails event={event} /> : event.entityType === "PAYMENT_ORDER_LINE" ? <LineAuditDetails event={event} /> : event.action === "UPDATE" ? <AuditFieldChanges event={event} /> : hasAuditTransition(event) ? <>{readable(event.previousState)} → {readable(event.newState)}</> : "—"}<TransactionCurrencyContext event={event} /><PaymentCurrencyContext event={event} /><ReturnReason event={event} /></HistoryEntry>)}</HistoryTimeline>}
      <HistoryPagination page={page} totalPages={result.totalPages} totalElements={result.totalElements} onPage={setPage} disabled={loading} />
    </>}
  </div>;
}

function HistoryDisclosure({ entityType, entityId, lifecycleStatus, refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  const [includeChildren, setIncludeChildren] = useState(true);
  return <details data-entity-type={entityType} className={styles.history} onToggle={(event) => { if (event.target === event.currentTarget) setOpen(event.currentTarget.open); }}>
    <summary>History · {labels[entityType]} #{entityId}</summary>
    {open && ["BUDGET", "PAYMENT_ORDER", "TRANSACTION"].includes(entityType) && <label style={{ display: "block", padding: "0 1rem 0.5rem" }}>
      <input type="checkbox" checked={includeChildren} onChange={(event) => setIncludeChildren(event.target.checked)} /> {entityType === "BUDGET" ? "Include cost-detail activity" : entityType === "TRANSACTION" ? "Include allocation, funding-receipt and financier-return activity" : "Include line, signature, recipient, outgoing-payment and recipient-return activity"}
    </label>}
    {open && <HistoryPage key={`${lifecycleStatus}:${refreshKey}:${includeChildren}`} entityType={entityType} entityId={entityId} includeChildren={includeChildren} />}
  </details>;
}

export default function RecordHistory(props) {
  if (!labels[props.entityType] || !Number.isSafeInteger(Number(props.entityId)) || Number(props.entityId) <= 0) return null;
  return <HistoryDisclosure key={`${props.entityType}:${props.entityId}`} {...props} />;
}
