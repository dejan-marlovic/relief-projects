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

const TransactionAllocations = ({ txId, costDetailOptions = [] }) => {
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

  // ✅ ONLY for Add form
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ✅ NEW: row-scoped errors for inline save
  // { [allocationId]: { message: string, fieldErrors?: {...} } }
  const [rowErrorsById, setRowErrorsById] = useState({});

  const fetchRows = useCallback(async () => {
    if (!txId) return;
    setLoading(true);

    // keep add-form errors separate
    setFormError("");
    setFieldErrors({});

    // optional: clear row errors on reload
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
    fetchRows();
  }, [fetchRows]);

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
    } catch (e) {
      console.error(e);
      // Add-form: show errors here
      if (e.fieldErrors) setFieldErrors(e.fieldErrors);
      setFormError(e.message || "Failed to add allocation.");
    }
  };

  const onInlineUpdate = async (row, patch) => {
    // clear only this row's error
    setRowErrorsById((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });

    const planned =
      patch.plannedAmount === "" || patch.plannedAmount == null
        ? null
        : Number(patch.plannedAmount);

    // local row validation -> row error (not global banner)
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
    } catch (e) {
      console.error(e);
      // ✅ Inline row: put backend error inside the row
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

    // clear row error if any
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
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to delete allocation.");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Planned allocations</div>
          <div className={styles.sub}>
            Transaction #{txId} → split planned amounts by cost line
          </div>
        </div>

        <button
          type="button"
          className={styles.iconPillBtn}
          onClick={fetchRows}
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
            <label>Planned amount</label>
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
          <div>Planned</div>
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
