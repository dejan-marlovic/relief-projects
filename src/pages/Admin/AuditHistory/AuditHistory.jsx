import SearchableSelect from "../../../components/SearchableSelect/SearchableSelect";
import RecordReference from "../../../components/RecordReference/RecordReference";
import { HistoryPagination, HistoryTimeline, HistoryEntry } from "../../../components/ActivityHistory/ActivityHistory";
import RecipientReturnAuditDetails from "../../../components/RecipientReturns/RecipientReturnAuditDetails";
import FundingReturnAuditDetails from "../../../components/FundingReturns/FundingReturnAuditDetails";
import OutgoingPaymentAuditDetails from "../../../components/OutgoingPayments/OutgoingPaymentAuditDetails";
import FundingReceiptAuditDetails from "../../../components/FundingReceipts/FundingReceiptAuditDetails";
import PaymentCurrencyContext from "../../../components/PaymentCurrencyContext/PaymentCurrencyContext";
import TransactionCurrencyContext from "../../../components/TransactionCurrencyContext/TransactionCurrencyContext";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import ErrorBanner from "../../../components/ErrorBanner/ErrorBanner";
import { BASE_URL } from "../../../config/api";
import { ProjectContext } from "../../../context/ProjectContext";
import { createAuthFetch, safeReadJson } from "../../../utils/http";
import styles from "./AuditHistory.module.scss";
import ReturnReason from "../../../components/ReturnReason/ReturnReason";
import AuditFieldChanges from "../../../components/AuditFieldChanges/AuditFieldChanges";
import { auditActionLabel, hasAuditTransition, uniqueAuditEvents } from "../../../utils/auditEvents";
import RecipientAuditDetails from "../../../components/RecipientAuditDetails/RecipientAuditDetails";
import SignatureAuditDetails from "../../../components/SignatureAuditDetails/SignatureAuditDetails";
import CostDetailAuditDetails from "../../../components/CostDetailAuditDetails/CostDetailAuditDetails";
import AllocationAuditDetails from "../../../components/AllocationAuditDetails/AllocationAuditDetails";
import LineAuditDetails from "../../../components/LineAuditDetails/LineAuditDetails";

const EMPTY_FILTERS = {
  entityType: "",
  entityId: "",
  projectId: "",
  action: "",
  performedBy: "",
  occurredFrom: "",
  occurredTo: "",
};

const ENTITY_LABELS = {
  BUDGET: "Budget",
  TRANSACTION: "Transaction",
  PAYMENT_ORDER: "Payment order",
  OUTGOING_PAYMENT: "Outgoing payment",
  FUNDING_RECEIPT: "Funding receipt", FUNDING_RETURN: "Return to financier", RECIPIENT_RETURN: "Return from recipient",
  RECIPIENT: "Recipient",
  SIGNATURE: "Signature",
  COST_DETAIL: "Budget cost detail",
  COST_DETAIL_ALLOCATION: "Transaction allocation",
  PAYMENT_ORDER_LINE: "Payment-order line",
};

const toInstant = (value) => (value ? new Date(value).toISOString() : "");

export const buildAuditQuery = (filters, page = 0, size = 20) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value === "" || value == null) return;
    params.set(key, key === "occurredFrom" || key === "occurredTo" ? toInstant(value) : String(value).trim());
  });
  return params.toString();
};

export const formatAuditTimestamp = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const AuditHistory = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { projects = [] } = useContext(ProjectContext);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], number: 0, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [
      String(project.id ?? project.projectId),
      project.projectName || project.name || `Project #${project.id ?? project.projectId}`,
    ])),
    [projects]
  );

  const loadEvents = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const query = buildAuditQuery(filters, page, 20);
      const response = await authFetch(`${BASE_URL}/api/audit-events?${query}`, {
        headers: { Accept: "application/json" },
        signal,
      });
      const body = await safeReadJson(response);
      if (!response.ok) {
        throw new Error(body?.message || "Lifecycle audit history could not be loaded.");
      }
      if (signal.aborted) return;
      if (!Array.isArray(body?.content)) throw new Error("Audit history returned an invalid response. Please try again.");
      setResult({
        content: Array.isArray(body?.content) ? uniqueAuditEvents(body.content) : [],
        number: Number(body?.number) || 0,
        totalElements: Number(body?.totalElements) || 0,
        totalPages: Number(body?.totalPages) || 0,
      });
    } catch (loadError) {
      if (!signal.aborted && loadError.name !== "AbortError") {
        setError(loadError.message || "Lifecycle audit history could not be loaded.");
        setResult({ content: [], number: 0, totalElements: 0, totalPages: 0 });
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [authFetch, filters, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents, refreshKey]);

  const updateDraft = (event) => {
    const { name, value } = event.target;
    setDraftFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(0);
    setFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const projectLabel = (projectId) => {
    if (projectId == null) return "Not recorded";
    return projectNames.get(String(projectId)) || `Project #${projectId}`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3>Record audit history</h3>
          <p>Record activity for budgets, transactions, payment orders, payment-order lines, transaction allocations, budget cost details, signatures, and recipients.</p>
        </div>
        <button type="button" className={styles.refreshButton} onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
          <FiRefreshCw aria-hidden="true" /> Refresh
        </button>
      </div>

      <form className={styles.filters} onSubmit={applyFilters}>
        <label>
          <span>Record type</span>
          <SearchableSelect name="entityType" value={draftFilters.entityType} onChange={updateDraft}>
            <option value="">All types</option>
            <option value="BUDGET">Budget</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="PAYMENT_ORDER">Payment order</option>
            <option value="OUTGOING_PAYMENT">Outgoing payment</option>
            <option value="FUNDING_RECEIPT">Funding receipt</option><option value="FUNDING_RETURN">Return to financier</option><option value="RECIPIENT_RETURN">Return from recipient</option>
            <option value="RECIPIENT">Recipient</option>
            <option value="SIGNATURE">Signature</option>
            <option value="COST_DETAIL">Budget cost detail</option>
            <option value="COST_DETAIL_ALLOCATION">Transaction allocation</option>
            <option value="PAYMENT_ORDER_LINE">Payment-order line</option>
          </SearchableSelect>
        </label>
        <label>
          <span>Action</span>
          <SearchableSelect name="action" value={draftFilters.action} onChange={updateDraft}>
            <option value="">All actions</option>
            <option value="CREATE">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="SUBMIT">Submit</option>
            <option value="APPROVE">Approve</option>
            <option value="RETURN">Return</option>
            <option value="DELETE">Deleted</option>
            <option value="RESTORE">Restored</option>
            <option value="VOID">Voided</option>
          </SearchableSelect>
        </label>
        <label>
          <span>Project</span>
          <SearchableSelect name="projectId" value={draftFilters.projectId} onChange={updateDraft}>
            <option value="">All projects</option>
            {projects.map((project) => {
              const id = project.id ?? project.projectId;
              return <option key={id} value={id}>{project.projectName || project.name || `Project #${id}`}</option>;
            })}
          </SearchableSelect>
        </label>
        <label>
          <span>Record ID</span>
          <input type="number" min="1" name="entityId" value={draftFilters.entityId} onChange={updateDraft} placeholder="Any ID" />
        </label>
        <label>
          <span>Actor user ID</span>
          <input type="text" name="performedBy" value={draftFilters.performedBy} onChange={updateDraft} placeholder="Any user" />
        </label>
        <label>
          <span>From</span>
          <input type="datetime-local" name="occurredFrom" value={draftFilters.occurredFrom} onChange={updateDraft} />
        </label>
        <label>
          <span>To</span>
          <input type="datetime-local" name="occurredTo" value={draftFilters.occurredTo} onChange={updateDraft} />
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className={styles.primaryButton}><FiSearch aria-hidden="true" /> Apply filters</button>
          <button type="button" className={styles.secondaryButton} onClick={clearFilters}><FiX aria-hidden="true" /> Clear</button>
        </div>
      </form>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className={styles.summary} aria-live="polite">
        {loading ? "Loading audit events…" : `${result.totalElements} audit event${result.totalElements === 1 ? "" : "s"}`}
      </div>

      <p>Newest changes first. Expand an entry to see what changed.</p>
      {!loading && !result.content.length && <p className={styles.empty}>No audit events match these filters.</p>}
      <HistoryTimeline aria-label="Audit events">{result.content.map(event => <HistoryEntry key={event.id} title={auditActionLabel(event)} at={event.occurredAt} actor={event.performedByDisplay || "Unknown user"} context={<>{ENTITY_LABELS[event.entityType] || event.entityType} #{event.entityId} · {projectLabel(event.projectId)}</>} references={<p>Entry #{event.id} · User #{event.performedBy ?? "not recorded"} · Project: <RecordReference field="projectId" value={event.projectId} record={event} currentProject={projects.find(p => String(p.id ?? p.projectId) === String(event.projectId))} /></p>}>
{event.entityType === "RECIPIENT_RETURN" ? <RecipientReturnAuditDetails event={event} /> : event.entityType === "FUNDING_RETURN" ? <FundingReturnAuditDetails event={event} /> : event.entityType === "OUTGOING_PAYMENT" ? <OutgoingPaymentAuditDetails event={event} /> : event.entityType === "FUNDING_RECEIPT" ? <FundingReceiptAuditDetails event={event} /> : event.entityType === "RECIPIENT" ? <RecipientAuditDetails event={event} /> : event.entityType === "SIGNATURE" ? <SignatureAuditDetails event={event} /> : event.entityType === "COST_DETAIL" ? <CostDetailAuditDetails event={event} /> : event.entityType === "COST_DETAIL_ALLOCATION" ? <AllocationAuditDetails event={event} /> : event.entityType === "PAYMENT_ORDER_LINE" ? <LineAuditDetails event={event} /> : event.action === "UPDATE" ? <AuditFieldChanges event={event} /> : hasAuditTransition(event) ? <><span className={styles.state}>{event.previousState}</span><span className={styles.arrow}>→</span><span className={styles.state}>{event.newState}</span></> : "—"}<TransactionCurrencyContext event={event} /><PaymentCurrencyContext event={event} /><ReturnReason event={event} /></HistoryEntry>)}</HistoryTimeline>

      <HistoryPagination page={page} totalPages={result.totalPages} totalElements={result.totalElements} onPage={setPage} disabled={loading} />

    </div>
  );
};

export default AuditHistory;
