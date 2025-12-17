import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./TransactionAllocations.module.scss";

const BASE_URL = "http://localhost:8080";

const toNumOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

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

  // New row draft
  const [draft, setDraft] = useState({
    costDetailId: "",
    plannedAmount: "",
    note: "",
  });

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { plannedAmount: "...", costDetailId: "..." }

  const fetchRows = useCallback(async () => {
    if (!txId) return;
    setLoading(true);
    setFormError("");
    try {
      const res = await fetch(
        `${BASE_URL}/api/cost-allocations/transaction/${txId}`,
        {
          headers: authHeaders,
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to fetch allocations. ${txt}`);
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

  const costDetailLabel = (id) => {
    const n = typeof id === "string" ? Number(id) : id;
    const cd = costDetailOptions.find((x) => Number(x.costDetailId) === n);
    if (!cd) return `CostDetail #${id}`;
    // Pick a label that is human
    return `${cd.costDescription || "No description"} (CD#${cd.costDetailId})`;
  };

  const upsert = async ({ costDetailId, plannedAmount, note }) => {
    setFormError("");
    setFieldErrors({});
    const payload = {
      transactionId: Number(txId),
      costDetailId: Number(costDetailId),
      plannedAmount: plannedAmount, // BigDecimal friendly
      note: note || null,
    };

    const res = await fetch(`${BASE_URL}/api/cost-allocations`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore
      }
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors);
      throw new Error(data?.message || raw || "Failed to save allocation.");
    }
    return await res.json();
  };

  const onAdd = async () => {
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
      setFormError(e.message || "Failed to add allocation.");
    }
  };

  const onInlineUpdate = async (row, patch) => {
    // upsert by (txId, costDetailId) – keep costDetailId stable for that row
    const planned =
      patch.plannedAmount === "" || patch.plannedAmount == null
        ? null
        : Number(patch.plannedAmount);

    if (planned == null || !Number.isFinite(planned) || planned < 0) {
      setFormError("Planned amount must be a number >= 0.");
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
      setFormError(e.message || "Failed to update allocation.");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this allocation?")) return;
    setFormError("");
    try {
      const res = await fetch(`${BASE_URL}/api/cost-allocations/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw || "Failed to delete allocation.");
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
          className={styles.refreshBtn}
          onClick={fetchRows}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {formError && <div className={styles.errorBanner}>{formError}</div>}

      {/* Add new allocation */}
      <div className={styles.addRow}>
        <div className={styles.field}>
          <label>Cost detail</label>
          <select
            value={draft.costDetailId}
            onChange={(e) =>
              setDraft((p) => ({ ...p, costDetailId: e.target.value }))
            }
          >
            <option value="">Select…</option>
            {costDetailOptions.map((cd) => (
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
          <label>Planned amount</label>
          <input
            type="number"
            step="0.01"
            value={draft.plannedAmount}
            onChange={(e) =>
              setDraft((p) => ({ ...p, plannedAmount: e.target.value }))
            }
          />
          {fieldErrors.plannedAmount && (
            <div className={styles.fieldError}>{fieldErrors.plannedAmount}</div>
          )}
        </div>

        <div className={styles.field}>
          <label>Note</label>
          <input
            type="text"
            value={draft.note}
            onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
            placeholder="Optional…"
          />
        </div>

        <div className={styles.fieldActions}>
          <button className={styles.primary} onClick={onAdd} disabled={loading}>
            + Add / Update
          </button>
        </div>
      </div>

      {/* Existing allocations */}
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
              label={costDetailLabel(r.costDetailId)}
              onSave={(patch) => onInlineUpdate(r, patch)}
              onDelete={() => onDelete(r.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const AllocationRow = ({ row, label, onSave, onDelete }) => {
  const [plannedAmount, setPlannedAmount] = useState(row.plannedAmount ?? "");
  const [note, setNote] = useState(row.note ?? "");

  useEffect(() => {
    setPlannedAmount(row.plannedAmount ?? "");
    setNote(row.note ?? "");
  }, [row.id, row.plannedAmount, row.note]);

  return (
    <div className={styles.trow}>
      <div className={styles.cdLabel}>{label}</div>

      <div>
        <input
          type="number"
          step="0.01"
          value={plannedAmount}
          onChange={(e) => setPlannedAmount(e.target.value)}
        />
      </div>

      <div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className={styles.rowActions}>
        <button
          className={styles.secondary}
          onClick={() => onSave({ plannedAmount, note })}
        >
          Save
        </button>
        <button className={styles.danger} onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default TransactionAllocations;
