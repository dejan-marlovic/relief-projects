import { appFetch as fetch } from "../../../../utils/appFetch";
/* global BigInt */
import { decimalUnits, fundingCurrencyLabel, sumAmounts, remainingFunding } from "../../../../utils/transactionFunding";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./TransactionAllocations.module.scss";
import {
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTrash2,
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

export const getCostDetailPlannedAmount = (costDetail) => {
  const value = costDetail?.amountLocalCurrency;
  if (value === "" || value == null) return "";
  return decimalUnits(value) != null ? String(value) : "";
};

async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function makeApiError(message, fieldErrors = null, status = null) {
  const err = new Error(message || "Request failed.");
  err.fieldErrors = fieldErrors;
  err.status = status;
  return err;
}

/**
 * NEW optional props:
 * - budgetOptions: list of budgets for the selected project (from Transactions page)
 * - fallbackCurrencyLabel: optional string if you want to pass a label directly
 */
const TransactionAllocations = ({
  txId,
  costDetailOptions = [],
  refreshKey = 0,
  onMutationSuccess,
  canManage = false,
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
    [token],
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [draft, setDraft] = useState({
    costDetailId: "",
    plannedAmount: "",
    note: "",
  });
  useUnsavedChange(
    `transaction-allocations-new-${txId}`,
    Object.values(draft).some((value) => String(value ?? "").trim() !== ""),
  );
  const [plannedAmountEdited, setPlannedAmountEdited] = useState(false);

  // add-form errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // row-scoped errors
  const [rowErrorsById, setRowErrorsById] = useState({});

  // ✅ NEW: transaction context (for cap + budgetId)
  const [txMeta, setTxMeta] = useState({
    approvedAmount: null,
    budgetId: null,
    projectId: null,
  });

  const fetchTxMeta = useCallback(async () => {
    if (!txId) return;
    setTxMeta({ approvedAmount: null, budgetId: null, projectId: null, fundingCurrency: null });
    try {
      const res = await fetch(`${BASE_URL}/api/transactions/${txId}`, {
        headers: authHeaders,
      });
      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      if (!data) return;

      setTxMeta({
        approvedAmount:
          data.approvedAmount === "" || data.approvedAmount == null
            ? null
            : String(data.approvedAmount),
        fundingCurrency: data.fundingCurrency,
        budgetId: data.budgetId ?? null,
        projectId: data.projectId ?? null,
      });
    } catch (e) {
      // non-fatal
      console.warn("Failed to fetch transaction meta:", e);
    }
  }, [txId, authHeaders]);

  const currencyLabel = fundingCurrencyLabel(txMeta.fundingCurrency);

  const currencySuffix = currencyLabel ? ` ${currencyLabel}` : "";

  const fetchRows = useCallback(async () => {
    if (!txId) return;
    setLoading(true);

    setFormError("");
    setFieldErrors({});
    setRowErrorsById({});

    try {
      const res = await fetch(
        `${BASE_URL}/api/cost-allocations/transaction/${txId}`,
        { headers: authHeaders },
      );
      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        throw new Error(data?.message || "Failed to fetch allocations.");
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      setFormError(e.message || "Failed to fetch allocations.");
    } finally {
      setLoading(false);
    }
  }, [txId, authHeaders]);

  useEffect(() => {
    fetchTxMeta();
    fetchRows();
  }, [fetchTxMeta, fetchRows, refreshKey]);

  const allocatedTotal = useMemo(() => sumAmounts(rows.map((row) => row.plannedAmount)), [rows]);
  const approvedAmountValue = txMeta.approvedAmount;

  const upsert = async ({ id, costDetailId, plannedAmount, note }) => {
    const payload = {
      ...(id != null ? { id } : {}),
      transactionId: Number(txId),
      costDetailId: Number(costDetailId),
      plannedAmount,
      note: note || null,
    };

    const res = await fetch(`${BASE_URL}/api/cost-allocations`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await safeParseJsonResponse(res);
      const msg = data?.message || "Failed to save allocation.";
      throw makeApiError(msg, data?.fieldErrors || null, res.status);
    }

    return await res.json();
  };

  const onAdd = async () => {
    if (!canManage) return;
    setFormError("");
    setFieldErrors({});

    const cdId = toNumOrNull(draft.costDetailId);
    const planned =
      decimalUnits(draft.plannedAmount);

    const fe = {};
    if (!cdId) fe.costDetailId = "Choose a cost detail.";
    if (planned == null || planned < BigInt(0)) {
      fe.plannedAmount = "Planned amount must be nonnegative with at most six meaningful decimal places.";
    }
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }

    try {
      await upsert({
        costDetailId: cdId,
        plannedAmount: String(draft.plannedAmount),
        note: draft.note,
      });

      setDraft({ costDetailId: "", plannedAmount: "", note: "" });
      setPlannedAmountEdited(false);
      await fetchRows();
      await fetchTxMeta();
      await onMutationSuccess?.();
    } catch (e) {
      console.error(e);
      if (e.fieldErrors) setFieldErrors(e.fieldErrors);
      setFormError(e.message || "Failed to add allocation.");
    }
  };

  const onInlineUpdate = async (row, patch) => {
    if (!canManage) return;
    setRowErrorsById((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });

    const planned =
      decimalUnits(patch.plannedAmount);

    const localFe = {};
    if (planned == null || planned < BigInt(0)) {
      localFe.plannedAmount = "Planned amount must be nonnegative with at most six meaningful decimal places.";
    }
    if (Object.keys(localFe).length) {
      setRowErrorsById((prev) => ({
        ...prev,
        [row.id]: {
          message: "Please fix the highlighted fields.",
          fieldErrors: localFe,
        },
      }));
      return;
    }

    try {
      await upsert({
        id: row.id,
        costDetailId: row.costDetailId,
        plannedAmount: String(patch.plannedAmount),
        note: patch.note ?? row.note ?? "",
      });
      await fetchRows();
      await fetchTxMeta();
      await onMutationSuccess?.();
    } catch (e) {
      console.error(e);
      setRowErrorsById((prev) => ({
        ...prev,
        [row.id]: {
          message: e.message || "Failed to update allocation.",
          fieldErrors: e.fieldErrors || null,
        },
      }));
    }
  };

  const onDelete = async (id) => {
    if (!canManage) return;
    if (!window.confirm("Delete this allocation?")) return;

    setFormError("");

    setRowErrorsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const res = await fetch(`${BASE_URL}/api/cost-allocations/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        throw new Error(formatApiError(data, "Failed to delete allocation."));
      }
      await fetchRows();
      await fetchTxMeta();
      await onMutationSuccess?.();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to delete allocation.");
    }
  };

  const capHint = useMemo(() => {
    const approved = decimalUnits(approvedAmountValue), allocated = decimalUnits(allocatedTotal);
    if (approved == null || allocated == null) return null;
    const remaining = remainingFunding(approvedAmountValue, allocatedTotal);
    const rawPercent = approved > BigInt(0) ? Number(allocated * BigInt(1000) / approved) / 10 : allocated > BigInt(0) ? 100 : 0;
    return {
      ok: allocated <= approved,
      percent: rawPercent,
      progressPercent: Math.min(Math.max(rawPercent, 0), 100),
      text: `Allocated: ${allocatedTotal}${currencySuffix} / Approved funding: ${approvedAmountValue}${currencySuffix} (Remaining for allocation: ${remaining}${currencySuffix})`,
    };
  }, [approvedAmountValue, allocatedTotal, currencySuffix]);

  return (
    <div className={styles.wrap}>
      {!capHint && !loading && <p>Funding capacity unavailable: approved funding or allocation amounts are unknown.</p>}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Planned allocations</div>
          <div className={styles.sub}>
            Transaction #{txId} → split planned amounts by cost line. Currency is the current budget configuration, not verified historical denomination.
            {currencyLabel ? (
              <span>
                {" "}
                • Amounts in <strong>{currencyLabel}</strong>
              </span>
            ) : null}
          </div>

          {capHint ? (
            <div className={styles.allocationProgressWrap}>
              <div
                className={`${styles.sub} ${
                  capHint.ok ? "" : styles.allocationTextOver
                }`}
              >
                {capHint.text}
              </div>

              <div className={styles.progressMeta}>
                <span>Allocation progress</span>
                <strong>{capHint.percent.toFixed(1)}%</strong>
              </div>

              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="Allocation progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round(capHint.progressPercent)}
                aria-valuetext={`${capHint.percent.toFixed(1)}% allocated`}
              >
                <div
                  className={`${styles.progressFill} ${
                    capHint.ok ? "" : styles.progressFillOver
                  }`}
                  style={{ width: `${capHint.progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.iconPillBtn}
          onClick={async () => {
            await Promise.all([fetchTxMeta(), fetchRows()]);
          }}
          disabled={loading}
          title="Refresh allocations"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {formError && (
        <ErrorBanner message={formError} onDismiss={() => setFormError("")} />
      )}

      {canManage && <div className={styles.addCard}>
        <div className={styles.addGrid}>
          <div className={styles.field}>
            <label>Cost detail</label>
            <select
              value={draft.costDetailId}
              onChange={(e) => {
                const costDetailId = e.target.value;
                const selectedCostDetail = costDetailOptions.find(
                  (option) => String(option.costDetailId) === String(costDetailId)
                );
                setDraft((current) => ({
                  ...current,
                  costDetailId,
                  plannedAmount: plannedAmountEdited
                    ? current.plannedAmount
                    : getCostDetailPlannedAmount(selectedCostDetail),
                }));
                setFieldErrors((current) => ({
                  ...current,
                  costDetailId: undefined,
                  plannedAmount: undefined,
                }));
              }}
              className={styles.textInput}
            >
              <option value="">Select…</option>
              {costDetailOptions.map((cd) => (
                <option key={cd.costDetailId} value={cd.costDetailId}>
                  {cd.costDescription || "No description"} (CD#{cd.costDetailId}
                  )
                </option>
              ))}
            </select>
            {fieldErrors.costDetailId && (
              <div className={styles.fieldError}>
                {fieldErrors.costDetailId}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>
              Planned amount{currencyLabel ? ` (${currencyLabel})` : ""}
            </label>
            <input
              type="number"
              step="any"
              value={draft.plannedAmount}
              onChange={(e) =>
                {
                  setDraft((p) => ({ ...p, plannedAmount: e.target.value }));
                  setPlannedAmountEdited(true);
                  setFieldErrors((current) => ({
                    ...current,
                    plannedAmount: undefined,
                  }));
                }
              }
              className={styles.textInput}
            />
            {fieldErrors.plannedAmount && (
              <div className={styles.fieldError}>
                {fieldErrors.plannedAmount}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Note</label>
            <input
              type="text"
              value={draft.note}
              onChange={(e) =>
                setDraft((p) => ({ ...p, note: e.target.value }))
              }
              placeholder="Optional…"
              className={styles.textInput}
            />
          </div>

          <div className={styles.fieldActions}>
            <button
              type="button"
              className={styles.primaryInlineBtn}
              onClick={onAdd}
              disabled={loading}
              title="Add or update allocation"
            >
              <FiPlus />
              Add
            </button>
          </div>
        </div>
      </div>}

      <div className={styles.table}>
        <div className={styles.thead}>
          <div>Cost detail</div>
          <div>Planned{currencyLabel ? ` (${currencyLabel})` : ""}</div>
          <div>Note</div>
          <div />
        </div>

        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            No allocations yet for this transaction.
          </div>
        ) : (
          rows.map((r) => (
            <AllocationRow
              key={r.id}
              row={r}
              label={(() => {
                const n =
                  typeof r.costDetailId === "string"
                    ? Number(r.costDetailId)
                    : r.costDetailId;
                const cd = costDetailOptions.find(
                  (x) => Number(x.costDetailId) === n,
                );
                return cd
                  ? `${cd.costDescription || "No description"} (CD#${
                      cd.costDetailId
                    })`
                  : `CostDetail #${r.costDetailId}`;
              })()}
              currencyLabel={currencyLabel}
              rowError={rowErrorsById[r.id] || null}
              clearRowError={() =>
                setRowErrorsById((prev) => {
                  const next = { ...prev };
                  delete next[r.id];
                  return next;
                })
              }
              onSave={(patch) => onInlineUpdate(r, patch)}
              onDelete={() => onDelete(r.id)}
              canManage={canManage}
            />
          ))
        )}
      </div>
    </div>
  );
};

const AllocationRow = ({
  row,
  label,
  onSave,
  onDelete,
  rowError,
  clearRowError,
  currencyLabel = "",
  canManage = false,
}) => {
  const [plannedAmount, setPlannedAmount] = useState(row.plannedAmount ?? "");
  const [note, setNote] = useState(row.note ?? "");

  useEffect(() => {
    setPlannedAmount(row.plannedAmount ?? "");
    setNote(row.note ?? "");
  }, [row.id, row.plannedAmount, row.note]);

  const plannedError = rowError?.fieldErrors?.plannedAmount || "";

  return (
    <div className={styles.trow}>
      <div className={styles.cdLabel}><span className={styles.fieldLabel}>Cost detail</span>{label}</div>

      <div>
        <span className={styles.fieldLabel}>Planned amount</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className={`${styles.textInput} ${
              plannedError ? styles.inputError : ""
            }`}
            type="number"
            step="any"
          value={plannedAmount}
          disabled={!canManage}
            onChange={(e) => {
              setPlannedAmount(e.target.value);
              clearRowError?.();
            }}
          />
          {currencyLabel ? (
            <span style={{ opacity: 0.7, whiteSpace: "nowrap" }}>
              {currencyLabel}
            </span>
          ) : null}
        </div>

        {plannedError ? (
          <div className={styles.fieldError}>{plannedError}</div>
        ) : null}

        {rowError?.message ? (
          <div className={styles.rowError}>{rowError.message}</div>
        ) : null}
      </div>

      <div>
        <span className={styles.fieldLabel}>Note</span>
        <input
          className={styles.textInput}
          type="text"
          value={note}
          disabled={!canManage}
          onChange={(e) => {
            setNote(e.target.value);
            clearRowError?.();
          }}
        />
      </div>

      {canManage && <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.iconCircleBtn}
          onClick={() => onSave({ plannedAmount, note })}
          title="Save allocation"
          aria-label="Save allocation"
        >
          <FiSave />
        </button>

        <button
          type="button"
          className={styles.dangerIconBtn}
          onClick={onDelete}
          title="Delete allocation"
          aria-label="Delete allocation"
        >
          <FiTrash2 />
        </button>
      </div>}
    </div>
  );
};

export default TransactionAllocations;
