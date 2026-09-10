import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import styles from "./RecordHistory.module.scss";
import ReturnReason from "../ReturnReason/ReturnReason";
import AuditFieldChanges from "../AuditFieldChanges/AuditFieldChanges";
import { AUDIT_ACTION_LABELS, hasAuditTransition } from "../../utils/auditEvents";

const labels = { BUDGET: "Budget", TRANSACTION: "Transaction", PAYMENT_ORDER: "Payment order" };
const readable = (value) => value ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ") : "—";
const timestamp = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "—";
};

function HistoryPage({ entityType, entityId }) {
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
        const response = await authFetch(`${BASE_URL}/api/audit-events?${query}`, { signal: controller.signal });
        const body = await safeReadJson(response);
        if (!response.ok) {
          const message = response.status === 403 ? "You do not have permission to view this record’s history."
            : response.status === 404 ? "This record is unavailable."
            : body?.message || "Lifecycle history could not be loaded. Please try again.";
          throw new Error(message);
        }
        if (!Array.isArray(body?.content)) throw new Error("Lifecycle history could not be loaded. Please try again.");
        if (!controller.signal.aborted) setState({ loading: false, result: body });
      } catch (error) {
        if (!controller.signal.aborted) setState({ loading: false, error: error.message });
      }
    };
    load();
    return () => controller.abort();
  }, [authFetch, entityType, entityId, page, refresh]);

  const { loading, error, result } = state;
  return <div className={styles.panel}>
    <div className={styles.toolbar}>
      <span>Record activity · newest first</span>
      <button type="button" disabled={loading} onClick={() => { setPage(0); setRefresh((value) => value + 1); }}>Refresh history</button>
    </div>
    {loading && <p role="status">Loading record history…</p>}
    {error && <p role="alert">{error}</p>}
    {result && <>
      {result.content.length === 0 ? <p role="status">No record history yet.</p> :
        <div className={styles.tableWrap}><table>
          <caption className={styles.caption}>{labels[entityType]} #{entityId} history</caption>
          <thead><tr><th scope="col">Date and time</th><th scope="col">Action</th><th scope="col">Changes</th><th scope="col">Performed by</th></tr></thead>
          <tbody>{result.content.map((event) => <tr key={event.id}>
            <td><time dateTime={event.occurredAt}>{timestamp(event.occurredAt)}</time></td>
            <td>{AUDIT_ACTION_LABELS[event.action] || event.action || "—"}</td>
            <td>{event.action === "UPDATE" ? <AuditFieldChanges event={event} /> : hasAuditTransition(event) ? <>{readable(event.previousState)} → {readable(event.newState)}</> : "—"}<ReturnReason event={event} /></td>
            <td>{event.performedByDisplay || (event.performedBy ? `User #${event.performedBy}` : "Unknown user")}</td>
          </tr>)}</tbody>
        </table></div>}
      <div className={styles.toolbar}>
        <span>Page {result.totalPages ? result.number + 1 : 0} of {result.totalPages || 0} · {result.totalElements || 0} events</span>
        <div className={styles.buttons}>
          <button type="button" disabled={page <= 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button type="button" disabled={page + 1 >= (result.totalPages || 0)} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </>}
  </div>;
}

function HistoryDisclosure({ entityType, entityId, lifecycleStatus, refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  return <details className={styles.history} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>History · {labels[entityType]} #{entityId}</summary>
    {open && <HistoryPage key={`${lifecycleStatus}:${refreshKey}`} entityType={entityType} entityId={entityId} />}
  </details>;
}

export default function RecordHistory(props) {
  if (!labels[props.entityType] || !Number.isSafeInteger(Number(props.entityId)) || Number(props.entityId) <= 0) return null;
  return <HistoryDisclosure key={`${props.entityType}:${props.entityId}`} {...props} />;
}
