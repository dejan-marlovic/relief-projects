import RecipientConflicts from "./RecipientConflicts";
import PaymentAmount from "../../../../components/PaymentAmount/PaymentAmount";
import { paymentAmountError, decimalUnits } from "../../../../utils/paymentFunding";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./PaymentOrderLines.module.scss";
import {
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiPlus,
} from "react-icons/fi";

import { BASE_URL } from "../../../../config/api";
import ErrorBanner from "../../../../components/ErrorBanner/ErrorBanner"; // adjust path if needed
import { formatApiError } from "../../../../utils/apiErrors";
import { useUnsavedChange } from "../../../../context/UnsavedChangesContext";

const toNumOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const validatePaymentOrderLine = (payload) => {
  const fieldErrors = {};

  if (!payload.transactionId) {
    fieldErrors.transactionId = "Transaction is required.";
  }
  if (!payload.organizationId) {
    fieldErrors.organizationId = "Organization is required.";
  }
  if (!payload.costDetailId) {
    fieldErrors.costDetailId = "Cost detail is required.";
  }
  const amountError = paymentAmountError(payload.amount);
  if (amountError) fieldErrors.amount = amountError;

  return fieldErrors;
};

export const approvedTransactionOptions = (
  transactions = [],
  currentTransactionId = null,
) =>
  transactions.filter(
    (transaction) =>
      transaction.lifecycleStatus === "APPROVED" ||
      (currentTransactionId != null &&
        String(transaction.id) === String(currentTransactionId)),
  );

export const allocationCostDetailOptions = (
  allocations = [],
  costDetails = [],
) =>
  allocations
    .filter((allocation) => decimalUnits(allocation?.plannedAmount) > 0)
    .map((allocation) => {
      const costDetailId =
        allocation.costDetailId ??
        allocation.cost_detail_id ??
        allocation.costDetail?.costDetailId ??
        allocation.costDetail?.id;
      const detail = costDetails.find(
        (candidate) =>
          String(candidate.costDetailId) === String(costDetailId),
      );
      return costDetailId == null
        ? null
        : {
            ...(detail || {}),
            costDetailId,
            costDescription:
              detail?.costDescription ||
              allocation.costDescription ||
              allocation.costDetail?.costDescription ||
              `Cost detail ${costDetailId}`,
          };
    })
    .filter(Boolean);

async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isLockedResponse(res, data) {
  const msg = (data?.message || "").toLowerCase();
  return (
    msg.includes("locked") || msg.includes("booked") || msg.includes("final")
  );
}

function normalizeLine(r) {
  if (!r || typeof r !== "object") return null;

  const id = r.id ?? r.lineId ?? r.line_id ?? null;

  const transactionId =
    r.transactionId ?? r.transaction_id ?? r.transaction?.id ?? null;

  const organizationId =
    r.organizationId ?? r.organization_id ?? r.organization?.id ?? null;

  const costDetailId =
    r.costDetailId ??
    r.cost_detail_id ??
    r.costDetail?.costDetailId ??
    r.costDetail?.id ??
    null;

  return {
    id,
    transactionId,
    organizationId,
    costDetailId,
    amount: r.amount ?? null,
    amountCurrency: r.amountCurrency ?? null,
    memo: r.memo ?? "",
  };
}

/**
 * Creates an Error that also carries fieldErrors for UI placement.
 */
function makeApiError(message, fieldErrors = null, status = null, recipientConflicts = []) {
  const err = new Error(message || "Request failed.");
  err.fieldErrors = fieldErrors;
  err.status = status;
  err.recipientConflicts = Array.isArray(recipientConflicts) ? recipientConflicts : [];
  return err;
}

const PaymentOrderLines = ({
  order,
  refreshKey,
  paymentOrderId,
  txOptions = [],
  orgOptions = [],
  costDetailOptions = [],
  canManage = false,
  onMutationSuccess,
}) => {
  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token]
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eligibleCostDetailsByTransaction, setEligibleCostDetailsByTransaction] =
    useState({});

  // lock state
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");

  // create-row (draft) state
  const [draft, setDraft] = useState({
    transactionId: "",
    organizationId: "",
    costDetailId: "",
    amount: "",
    memo: "",
  });
  useUnsavedChange(
    `payment-order-lines-new-${paymentOrderId}`,
    Object.values(draft).some((value) => String(value ?? "").trim() !== ""),
  );

  // ✅ only for CREATE row
  const [formError, setFormError] = useState("");
  const [lockBannerDismissed, setLockBannerDismissed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateDraftField = (field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  // ✅ row-scoped errors for inline updates, keyed by rowId
  // { [rowId]: { message: string, fieldErrors: {amount?: string, ...} } }
  const [rowErrorsById, setRowErrorsById] = useState({});

  const loadEligibleCostDetails = useCallback(
    async (transactionId) => {
      if (!transactionId) return [];
      const res = await fetch(
        `${BASE_URL}/api/cost-allocations/transaction/${transactionId}`,
        { headers: authHeaders },
      );
      const data = await safeParseJsonResponse(res);
      if (!res.ok) {
        throw new Error(
          formatApiError(
            data,
            `Failed to load cost details for transaction ${transactionId}.`,
          ),
        );
      }

      const options = allocationCostDetailOptions(
        Array.isArray(data) ? data : [],
        costDetailOptions,
      );

      setEligibleCostDetailsByTransaction((current) => ({
        ...current,
        [String(transactionId)]: options,
      }));
      return options;
    },
    [authHeaders, costDetailOptions],
  );

  const eligibleCostDetails = useCallback(
    (transactionId, currentCostDetailId = null) => {
      const options =
        eligibleCostDetailsByTransaction[String(transactionId)] || [];
      if (
        currentCostDetailId == null ||
        options.some(
          (detail) =>
            String(detail.costDetailId) === String(currentCostDetailId),
        )
      ) {
        return options;
      }
      const historical = costDetailOptions.find(
        (detail) =>
          String(detail.costDetailId) === String(currentCostDetailId),
      );
      return [
        ...options,
        historical || {
          costDetailId: currentCostDetailId,
          costDescription: `Cost detail ${currentCostDetailId}`,
        },
      ];
    },
    [costDetailOptions, eligibleCostDetailsByTransaction],
  );

  const fetchRows = useCallback(async () => {
    if (!paymentOrderId) return;
    setLoading(true);

    // Only clear create errors globally
    setFormError("");
    setFieldErrors({});

    // Clear row errors when reloading (optional)
    setRowErrorsById({});

    setIsLocked(false);
    setLockMessage("");

    try {
      const res = await fetch(
        `${BASE_URL}/api/payment-order-lines/payment-order/${paymentOrderId}`,
        { headers: authHeaders }
      );

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        if (isLockedResponse(res, data)) {
          setIsLocked(true);
          setLockMessage(
            data?.message ||
              "This payment order is Booked (locked). Lines cannot be changed."
          );
        }

        throw new Error(
          data?.message || `Failed to fetch payment order lines.`
        );
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      const normalized = arr.map(normalizeLine).filter(Boolean);
      setRows((previous) => [
        ...normalized,
        ...previous.filter((old) => !normalized.some((fresh) => String(fresh.id) === String(old.id))).map((old) => ({ ...old, unavailable: true })),
      ]);
      const transactionIds = [
        ...new Set(normalized.map((row) => row.transactionId).filter(Boolean)),
      ];
      const results = await Promise.allSettled(
        transactionIds.map(loadEligibleCostDetails),
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        setFormError(
          failed.reason?.message || "Failed to load eligible cost details.",
        );
      }
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to fetch lines. Existing edits have been kept.");
    } finally {
      setLoading(false);
    }
  }, [paymentOrderId, authHeaders, loadEligibleCostDetails]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshKey]);

  useEffect(() => {
    if (!draft.transactionId) return;
    loadEligibleCostDetails(draft.transactionId).catch((error) => {
      console.error(error);
      setFormError(error.message || "Failed to load eligible cost details.");
    });
  }, [draft.transactionId, loadEligibleCostDetails]);

  const apiCreate = async (payload) => {
    const res = await fetch(`${BASE_URL}/api/payment-order-lines`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await safeParseJsonResponse(res);

      if (isLockedResponse(res, data)) {
        setIsLocked(true);
        setLockMessage(
          data?.message ||
            "This payment order is Booked (locked). Lines cannot be changed."
        );
      }

      // create form uses global fieldErrors
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors);

      const msg =
        data?.fieldErrors?.id || data?.fieldErrors?.paymentOrderId || data?.message ||
        (res.status === 409 ? "The line could not be changed. Refresh lines and try again." : null) ||
        "Failed to create line.";

      throw makeApiError(msg, data?.fieldErrors || null, res.status, data?.recipientConflicts);
    }

    return await res.json();
  };

  const apiUpdate = async (id, payload) => {
    const res = await fetch(`${BASE_URL}/api/payment-order-lines/${id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await safeParseJsonResponse(res);

      if (isLockedResponse(res, data)) {
        setIsLocked(true);
        setLockMessage(
          data?.message ||
            "This payment order is Booked (locked). Lines cannot be changed."
        );
      }

      const msg =
        data?.fieldErrors?.id || data?.fieldErrors?.paymentOrderId || data?.message ||
        (res.status === 409 ? "The line could not be changed. Refresh lines and try again." : null) ||
        "Failed to update line.";

      // IMPORTANT: don't set global fieldErrors here
      throw makeApiError(msg, data?.fieldErrors || null, res.status, data?.recipientConflicts);
    }

    return await res.json();
  };

  const apiDelete = async (id) => {
    const res = await fetch(`${BASE_URL}/api/payment-order-lines/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    if (!res.ok) {
      const data = await safeParseJsonResponse(res);

      if (isLockedResponse(res, data)) {
        setIsLocked(true);
        setLockMessage(
          data?.message ||
            "This payment order is Booked (locked). Lines cannot be changed."
        );
      }

      const msg = formatApiError(
        data,
        res.status === 409
          ? "The line could not be deleted. Refresh lines and try again."
          : "Failed to delete line.",
      );

      throw makeApiError(msg, data?.fieldErrors || null, res.status, data?.recipientConflicts);
    }
  };

  const onAdd = async () => {
    if (!canManage || isLocked) return;

    setFormError("");
    setFieldErrors({});

    const payload = {
      paymentOrderId: Number(paymentOrderId),
      transactionId: draft.transactionId ? Number(draft.transactionId) : null,
      organizationId: toNumOrNull(draft.organizationId),
      costDetailId: draft.costDetailId ? Number(draft.costDetailId) : null,
      amount: draft.amount === "" ? null : String(draft.amount),
      memo: draft.memo || null,
    };

    const fe = validatePaymentOrderLine(payload);
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    try {
      await apiCreate(payload);
      await onMutationSuccess?.();
      setDraft({
        transactionId: "",
        organizationId: "",
        costDetailId: "",
        amount: "",
        memo: "",
      });
      await fetchRows();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to create line.");
    }
  };

  const onInlineSave = async (rowId, patch) => {
    if (!canManage || isLocked) return;

    // clear only this row’s error
    setRowErrorsById((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

    const payload = {
      paymentOrderId: Number(paymentOrderId),
      transactionId:
        patch.transactionId === ""
          ? null
          : patch.transactionId
          ? Number(patch.transactionId)
          : null,
      organizationId: patch.organizationId
        ? Number(patch.organizationId)
        : null,
      costDetailId:
        patch.costDetailId === ""
          ? null
          : patch.costDetailId
          ? Number(patch.costDetailId)
          : null,
      amount: patch.amount === "" ? null : String(patch.amount),
      memo: patch.memo ?? null,
    };

    // simple client-side guards per-row (put them into row error too)
    const localFe = validatePaymentOrderLine(payload);
    if (Object.keys(localFe).length) {
      setRowErrorsById((prev) => ({
        ...prev,
        [rowId]: {
          message: "Please fix the highlighted fields.",
          fieldErrors: localFe,
        },
      }));
      return;
    }

    try {
      await apiUpdate(rowId, payload);
      await onMutationSuccess?.();
      await fetchRows();
    } catch (e) {
      console.error(e);

      // Put backend message onto this row
      setRowErrorsById((prev) => ({
        ...prev,
        [rowId]: {
          message: e.message || "Failed to update line.",
          fieldErrors: e.fieldErrors || null,
          recipientConflicts: e.recipientConflicts || [],
        },
      }));
    }
  };

  const onDelete = async (id) => {
    if (!canManage || isLocked) return;
    if (!window.confirm("Delete this payment order line?")) return;

    setFormError("");
    setFieldErrors({});

    // clear row error if any
    setRowErrorsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await apiDelete(id);
      setRows((previous) => previous.filter((row) => row.id !== id));
      await onMutationSuccess?.();
      await fetchRows();
    } catch (e) {
      console.error(e);
      setRowErrorsById((previous) => ({ ...previous, [id]: { message: e.message || "Failed to delete line.", recipientConflicts: e.recipientConflicts || [] } }));
    }
  };

  const lockedBanner =
    isLocked && (lockMessage || "This payment order is Booked (locked).");

  useEffect(() => {
    setLockBannerDismissed(false);
  }, [paymentOrderId, isLocked]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Payment lines</div>
          <div className={styles.sub}>
            Payment order #{paymentOrderId} · Calculated total
            <PaymentAmount record={order} />
            <small>Line amounts are commitments, not settled payments. Currency reflects current budget configuration.</small>
          </div>
        </div>

        <button
          className={styles.iconPillBtn}
          onClick={async () => { await onMutationSuccess?.(); await fetchRows(); }}
          disabled={loading}
          title="Refresh lines"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {lockedBanner && !lockBannerDismissed && (
        <ErrorBanner
          message={`${lockedBanner} (Editing disabled)`}
          onDismiss={() => setLockBannerDismissed(true)}
        />
      )}

      {/* page-level banner for fetch/create/delete errors */}
      {formError && (
        <ErrorBanner message={formError} onDismiss={() => setFormError("")} />
      )}

      {/* Add row */}
      {canManage && (
        <div className={styles.addRow}>
          <div className={styles.field}>
          <label htmlFor={`line-transaction-${paymentOrderId}`}>Transaction *</label>
          <select id={`line-transaction-${paymentOrderId}`}
            value={draft.transactionId}
            disabled={loading || isLocked}
            onChange={(e) => {
              updateDraftField("transactionId", e.target.value);
              updateDraftField("costDetailId", "");
            }}
            className={`${styles.input} ${
              fieldErrors.transactionId ? styles.inputError : ""
            }`}
          >
            <option value="">Select…</option>
            {approvedTransactionOptions(txOptions).map((t) => (
              <option key={t.id} value={t.id}>
                TX#{t.id}
              </option>
            ))}
          </select>
          {fieldErrors.transactionId && (
            <div className={styles.fieldError}>
              {fieldErrors.transactionId}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`line-organization-${paymentOrderId}`}>Organization *</label>
          <select id={`line-organization-${paymentOrderId}`}
            value={draft.organizationId}
            disabled={loading || isLocked}
            onChange={(e) => updateDraftField("organizationId", e.target.value)}
            className={`${styles.input} ${
              fieldErrors.organizationId ? styles.inputError : ""
            }`}
          >
            <option value="">Select…</option>
            {orgOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {fieldErrors.organizationId && (
            <div className={styles.fieldError}>
              {fieldErrors.organizationId}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`line-cost-detail-${paymentOrderId}`}>Cost detail *</label>
          <select id={`line-cost-detail-${paymentOrderId}`}
            value={draft.costDetailId}
            disabled={loading || isLocked}
            onChange={(e) => updateDraftField("costDetailId", e.target.value)}
            className={`${styles.input} ${
              fieldErrors.costDetailId ? styles.inputError : ""
            }`}
          >
            <option value="">Select…</option>
            {eligibleCostDetails(draft.transactionId).map((cd) => (
              <option key={cd.costDetailId} value={cd.costDetailId}>
                {cd.costDescription || "No description"} (CD#{cd.costDetailId})
              </option>
            ))}
          </select>
          {fieldErrors.costDetailId && (
            <div className={styles.fieldError}>{fieldErrors.costDetailId}</div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`line-amount-${paymentOrderId}`}>Amount *</label>
          <input id={`line-amount-${paymentOrderId}`}
            type="number"
            step="any" min="0.000001"
            value={draft.amount}
            disabled={loading || isLocked}
            onChange={(e) => updateDraftField("amount", e.target.value)}
            className={`${styles.input} ${
              fieldErrors.amount ? styles.inputError : ""
            }`}
          />
          {fieldErrors.amount && (
            <div className={styles.fieldError}>{fieldErrors.amount}</div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`line-memo-${paymentOrderId}`}>Memo</label>
          <input id={`line-memo-${paymentOrderId}`}
            type="text"
            value={draft.memo}
            disabled={loading || isLocked}
            onChange={(e) => setDraft((p) => ({ ...p, memo: e.target.value }))}
            placeholder="Optional…"
            className={styles.input}
          />
        </div>

        <div className={styles.fieldActions}>
          <button
            className={styles.primaryInlineBtn}
            onClick={onAdd}
            disabled={loading || isLocked}
            title={
              isLocked ? "This payment order is Booked (locked)." : "Add line"
            }
          >
            <FiPlus />
            Add
          </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.table}>
        <div className={styles.thead}>
          <div>Tx</div>
          <div>Org</div>
          <div>Cost detail</div>
          <div>Amount</div>
          <div>Memo</div>
          <div />
        </div>

        {loading && rows.length === 0 ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No lines yet.</div>
        ) : (
          rows.map((r) => (
            <LineRow
              key={r.id}
              row={r}
              txOptions={txOptions}
              orgOptions={orgOptions}
              costDetailOptions={eligibleCostDetails(
                r.transactionId,
                r.costDetailId,
              )}
              loadEligibleCostDetails={loadEligibleCostDetails}
              onEligibleLoadError={(error) =>
                setFormError(
                  error?.message || "Failed to load eligible cost details.",
                )
              }
              locked={isLocked || !canManage || r.unavailable}
              canManage={canManage}
              rowError={rowErrorsById[r.id] || null}
              clearRowError={() =>
                setRowErrorsById((prev) => {
                  const next = { ...prev };
                  delete next[r.id];
                  return next;
                })
              }
              onSave={(patch) => onInlineSave(r.id, patch)}
              onDelete={() => onDelete(r.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const LineRow = ({
  row,
  txOptions,
  orgOptions,
  costDetailOptions,
  loadEligibleCostDetails,
  onEligibleLoadError,
  locked = false,
  canManage = false,
  onSave,
  onDelete,
  rowError,
  clearRowError,
}) => {
  const [transactionId, setTransactionId] = useState(row.transactionId ?? "");
  const [organizationId, setOrganizationId] = useState(
    row.organizationId ?? ""
  );
  const [costDetailId, setCostDetailId] = useState(row.costDetailId ?? "");
  const [amount, setAmount] = useState(row.amount ?? "");
  const [memo, setMemo] = useState(row.memo ?? "");

  // Refresh untouched fields while preserving values the user has changed.
  const savedRow = useRef(row);
  useEffect(() => {
    const previous = savedRow.current;
    const retainEdit = (field) => (value) => String(value ?? "") === String(previous[field] ?? "") ? (row[field] ?? "") : value;
    setTransactionId(retainEdit("transactionId"));
    setOrganizationId(retainEdit("organizationId"));
    setCostDetailId(retainEdit("costDetailId"));
    setAmount(retainEdit("amount"));
    setMemo(retainEdit("memo"));
    savedRow.current = row;
  }, [row]);

  const amountError = rowError?.fieldErrors?.amount || "";
  const orgError = rowError?.fieldErrors?.organizationId || "";
  const transactionError = rowError?.fieldErrors?.transactionId || "";
  const costDetailError = rowError?.fieldErrors?.costDetailId || "";

  return (
    <div className={styles.trow}>
      <div>
        <span className={styles.fieldLabel}>Transaction</span>
        <select
          aria-label={`Transaction for line ${row.id}`}
          value={transactionId}
          disabled={locked}
          onChange={(e) => {
            setTransactionId(e.target.value);
            setCostDetailId("");
            loadEligibleCostDetails?.(e.target.value).catch((error) =>
              onEligibleLoadError?.(error),
            );
            clearRowError?.();
          }}
          className={`${styles.input} ${
            transactionError ? styles.inputError : ""
          }`}
        >
          <option value="">Select…</option>
          {approvedTransactionOptions(txOptions, row.transactionId).map((t) => (
            <option key={t.id} value={t.id}>
              TX#{t.id}
            </option>
          ))}
        </select>
        {transactionError ? (
          <div className={styles.fieldError}>{transactionError}</div>
        ) : null}
      </div>

      <div>
        <span className={styles.fieldLabel}>Organization</span>
        <select
          aria-label={`Organization for line ${row.id}`}
          value={organizationId}
          disabled={locked}
          onChange={(e) => {
            setOrganizationId(e.target.value);
            clearRowError?.();
          }}
          className={`${styles.input} ${orgError ? styles.inputError : ""}`}
        >
          <option value="">Select…</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {orgError ? <div className={styles.fieldError}>{orgError}</div> : null}
      </div>

      <div>
        <span className={styles.fieldLabel}>Cost detail</span>
        <select
          aria-label={`Cost detail for line ${row.id}`}
          value={costDetailId}
          disabled={locked}
          onChange={(e) => {
            setCostDetailId(e.target.value);
            clearRowError?.();
          }}
          className={`${styles.input} ${
            costDetailError ? styles.inputError : ""
          }`}
        >
          <option value="">Select…</option>
          {costDetailOptions.map((cd) => (
            <option key={cd.costDetailId} value={cd.costDetailId}>
              {cd.costDescription || "No description"} (CD#{cd.costDetailId})
            </option>
          ))}
        </select>
        {costDetailError ? (
          <div className={styles.fieldError}>{costDetailError}</div>
        ) : null}
      </div>

      <div>
        <span className={styles.fieldLabel}>Amount</span>
        <input
          type="number"
          step="any" min="0.000001"
          aria-label={`Amount for line ${row.id}`}
          value={amount}
          disabled={locked}
          onChange={(e) => {
            setAmount(e.target.value);
            clearRowError?.();
          }}
          className={`${styles.input} ${amountError ? styles.inputError : ""}`}
        />
        <PaymentAmount record={row} line showAmount={false} />
        {amountError ? (
          <div className={styles.fieldError}>{amountError}</div>
        ) : null}


      </div>

      <div>
        <span className={styles.fieldLabel}>Memo</span>
        <input
          type="text"
          aria-label={`Memo for line ${row.id}`}
          value={memo}
          disabled={locked}
          onChange={(e) => {
            setMemo(e.target.value);
            clearRowError?.();
          }}
          className={styles.input}
        />
      </div>

      {canManage && (
        <div className={styles.rowActions}>
          <button
          className={styles.iconCircleBtn}
          disabled={locked}
          title={
            row.unavailable ? "This line is no longer available." : locked ? "This payment order is Booked (locked)." : "Save line"
          }
          onClick={() =>
            onSave({
              transactionId,
              organizationId,
              costDetailId,
              amount,
              memo,
            })
          }
        >
          <FiSave />
          </button>

          <button
          className={styles.dangerIconBtn}
          disabled={locked}
          title={
            row.unavailable ? "This line is no longer available." : locked ? "This payment order is Booked (locked)." : "Delete line"
          }
          onClick={onDelete}
        >
          <FiTrash2 />
          </button>
        </div>
      )}
      {(row.unavailable || rowError?.message || rowError?.recipientConflicts?.length > 0) && <div className={styles.conflictPanel}>
        {row.unavailable && <p role="status">This line is no longer available on this order. Entered values are kept for review; saving is disabled. Close and reopen the lines to dismiss it.</p>}
        <RecipientConflicts conflicts={rowError?.recipientConflicts} />
        {rowError?.message ? (
          <div className={styles.rowError}>{rowError.message}</div>
        ) : null}
      </div>}
    </div>
  );
};

export default PaymentOrderLines;
