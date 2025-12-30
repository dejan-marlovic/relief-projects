import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./TransactionAllocations.module.scss";
import {
  FiAlertCircle,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

const toNumOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  budgetOptions = [],
  fallbackCurrencyLabel = "",
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

  const [draft, setDraft] = useState({
    costDetailId: "",
    plannedAmount: "",
    note: "",
  });

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
            : Number(data.approvedAmount),
        budgetId: data.budgetId ?? null,
        projectId: data.projectId ?? null,
      });
    } catch (e) {
      // non-fatal
      console.warn("Failed to fetch transaction meta:", e);
    }
  }, [txId, authHeaders]);

  const currencyLabel = useMemo(() => {
    // 1) explicit fallback if provided
    if (fallbackCurrencyLabel) return fallbackCurrencyLabel;

    // 2) try from budgetOptions by txMeta.budgetId
    const bId =
      typeof txMeta.budgetId === "string"
        ? Number(txMeta.budgetId)
        : txMeta.budgetId;

    if (bId && Array.isArray(budgetOptions) && budgetOptions.length) {
      const b = budgetOptions.find((x) => Number(x.id) === Number(bId));
      if (b) {
        // be defensive: different DTOs might have different shapes
        const name =
          b?.localCurrency?.name ||
          b?.localCurrencyName ||
          b?.localCurrencyCode ||
          b?.localCurrencyId ||
          "";
        if (name) return String(name);
      }
    }

    return ""; // unknown is ok
  }, [fallbackCurrencyLabel, budgetOptions, txMeta.budgetId]);

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
        { headers: authHeaders }
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
  }, [fetchTxMeta, fetchRows]);

  const allocatedTotal = useMemo(() => {
    return rows.reduce((acc, r) => acc + (Number(r.plannedAmount) || 0), 0);
  }, [rows]);

  const approvedAmountNum =
    txMeta.approvedAmount == null || !Number.isFinite(txMeta.approvedAmount)
      ? null
      : Number(txMeta.approvedAmount);

  const upsert = async ({ costDetailId, plannedAmount, note }) => {
    const payload = {
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
    setFormError("");
    setFieldErrors({});

    const cdId = toNumOrNull(draft.costDetailId);
    const planned =
      draft.plannedAmount === "" ? null : Number(draft.plannedAmount);

    const fe = {};
    if (!cdId) fe.costDetailId = "Choose a cost detail.";
    if (planned == null || !Number.isFinite(planned) || planned < 0) {
      fe.plannedAmount = "Planned amount must be a number >= 0.";
    }
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }

    try {
      await upsert({
        costDetailId: cdId,
        plannedAmount: planned,
        note: draft.note,
      });

      setDraft({ costDetailId: "", plannedAmount: "", note: "" });
      await fetchRows();
      await fetchTxMeta();
    } catch (e) {
      console.error(e);
      if (e.fieldErrors) setFieldErrors(e.fieldErrors);
      setFormError(e.message || "Failed to add allocation.");
    }
  };

  const onInlineUpdate = async (row, patch) => {
    setRowErrorsById((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });

    const planned =
      patch.plannedAmount === "" || patch.plannedAmount == null
        ? null
        : Number(patch.plannedAmount);

    const localFe = {};
    if (planned == null || !Number.isFinite(planned) || planned < 0) {
      localFe.plannedAmount = "Planned amount must be a number >= 0.";
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
        costDetailId: row.costDetailId,
        plannedAmount: planned,
        note: patch.note ?? row.note ?? "",
      });
      await fetchRows();
      await fetchTxMeta();
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
        throw new Error(data?.message || "Failed to delete allocation.");
      }
      await fetchRows();
      await fetchTxMeta();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to delete allocation.");
    }
  };

  const capHint = useMemo(() => {
    if (approvedAmountNum == null) return null;
    const remaining = approvedAmountNum - allocatedTotal;
    const ok = remaining >= 0;

    const fmt = (n) => (Number.isFinite(n) ? Number(n).toFixed(2) : String(n));

    return {
      ok,
      text: `Allocated: ${fmt(
        allocatedTotal
      )}${currencySuffix} / Approved: ${fmt(
        approvedAmountNum
      )}${currencySuffix} (Remaining: ${fmt(remaining)}${currencySuffix})`,
    };
  }, [approvedAmountNum, allocatedTotal, currencySuffix]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Planned allocations</div>
          <div className={styles.sub}>
            Transaction #{txId} → split planned amounts by cost line
            {currencyLabel ? (
              <span>
                {" "}
                • Amounts in <strong>{currencyLabel}</strong>
              </span>
            ) : null}
          </div>

          {capHint ? (
            <div
              className={`${styles.sub} ${capHint.ok ? "" : styles.inputError}`}
              style={{ marginTop: 6 }}
            >
              {capHint.text}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.iconPillBtn}
          onClick={async () => {
            await fetchTxMeta();
            await fetchRows();
          }}
          disabled={loading}
          title="Refresh allocations"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {formError && (
        <div className={styles.errorBanner}>
          <FiAlertCircle />
          <span>{formError}</span>
        </div>
      )}

      <div className={styles.addCard}>
        <div className={styles.addGrid}>
          <div className={styles.field}>
            <label>Cost detail</label>
            <select
              value={draft.costDetailId}
              onChange={(e) =>
                setDraft((p) => ({ ...p, costDetailId: e.target.value }))
              }
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
              step="0.01"
              value={draft.plannedAmount}
              onChange={(e) =>
                setDraft((p) => ({ ...p, plannedAmount: e.target.value }))
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
      </div>

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
                  (x) => Number(x.costDetailId) === n
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
      <div className={styles.cdLabel}>{label}</div>

      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className={`${styles.textInput} ${
              plannedError ? styles.inputError : ""
            }`}
            type="number"
            step="0.01"
            value={plannedAmount}
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
        <input
          className={styles.textInput}
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            clearRowError?.();
          }}
        />
      </div>

      <div className={styles.rowActions}>
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
      </div>
    </div>
  );
};

export default TransactionAllocations;
