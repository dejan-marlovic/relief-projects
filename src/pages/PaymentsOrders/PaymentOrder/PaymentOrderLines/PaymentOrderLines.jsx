import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./PaymentOrderLines.module.scss";
import {
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiPlus,
  FiAlertCircle,
} from "react-icons/fi";

import { BASE_URL } from "../../../../config/api"; // adjust path if needed

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

function isLockedResponse(res, data) {
  if (res?.status === 409) return true;
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
    memo: r.memo ?? "",
  };
}

/**
 * Creates an Error that also carries fieldErrors for UI placement.
 */
function makeApiError(message, fieldErrors = null, status = null) {
  const err = new Error(message || "Request failed.");
  err.fieldErrors = fieldErrors;
  err.status = status;
  return err;
}

const PaymentOrderLines = ({
  paymentOrderId,
  txOptions = [],
  orgOptions = [],
  costDetailOptions = [],
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

  // ✅ only for CREATE row
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ✅ row-scoped errors for inline updates, keyed by rowId
  // { [rowId]: { message: string, fieldErrors: {amount?: string, ...} } }
  const [rowErrorsById, setRowErrorsById] = useState({});

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
      setRows(arr.map(normalizeLine).filter(Boolean));
    } catch (e) {
      console.error(e);
      setRows([]);
      setFormError(e.message || "Failed to fetch lines.");
    } finally {
      setLoading(false);
    }
  }, [paymentOrderId, authHeaders]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

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
        data?.message ||
        (res.status === 409 ? "Conflict: payment order is locked." : null) ||
        "Failed to create line.";

      throw makeApiError(msg, data?.fieldErrors || null, res.status);
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
        data?.message ||
        (res.status === 409 ? "Conflict: payment order is locked." : null) ||
        "Failed to update line.";

      // IMPORTANT: don't set global fieldErrors here
      throw makeApiError(msg, data?.fieldErrors || null, res.status);
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

      const msg =
        data?.message ||
        (res.status === 409 ? "Conflict: payment order is locked." : null) ||
        "Failed to delete line.";

      throw new Error(msg);
    }
  };

  const onAdd = async () => {
    if (isLocked) return;

    setFormError("");
    setFieldErrors({});

    const payload = {
      paymentOrderId: Number(paymentOrderId),
      transactionId: draft.transactionId ? Number(draft.transactionId) : null,
      organizationId: toNumOrNull(draft.organizationId),
      costDetailId: draft.costDetailId ? Number(draft.costDetailId) : null,
      amount: draft.amount === "" ? null : Number(draft.amount),
      memo: draft.memo || null,
    };

    const fe = {};
    if (!payload.organizationId)
      fe.organizationId = "Organization is required.";
    if (
      payload.amount == null ||
      !Number.isFinite(payload.amount) ||
      payload.amount <= 0
    ) {
      fe.amount = "Amount must be a number > 0.";
    }
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    try {
      await apiCreate(payload);
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
    if (isLocked) return;

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
      amount: patch.amount === "" ? null : Number(patch.amount),
      memo: patch.memo ?? null,
    };

    // simple client-side guards per-row (put them into row error too)
    const localFe = {};
    if (
      payload.amount == null ||
      !Number.isFinite(payload.amount) ||
      payload.amount <= 0
    ) {
      localFe.amount = "Amount must be a number > 0.";
    }
    if (!payload.organizationId) {
      localFe.organizationId = "Organization is required.";
    }
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
      await fetchRows();
    } catch (e) {
      console.error(e);

      // Put backend message onto this row
      setRowErrorsById((prev) => ({
        ...prev,
        [rowId]: {
          message: e.message || "Failed to update line.",
          fieldErrors: e.fieldErrors || null,
        },
      }));
    }
  };

  const onDelete = async (id) => {
    if (isLocked) return;
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
      await fetchRows();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to delete line.");
    }
  };

  const total = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const lockedBanner =
    isLocked && (lockMessage || "This payment order is Booked (locked).");

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Payment lines</div>
          <div className={styles.sub}>
            PaymentOrder #{paymentOrderId} • Lines total: {total.toFixed(2)}
          </div>
        </div>

        <button
          className={styles.iconPillBtn}
          onClick={fetchRows}
          disabled={loading}
          title="Refresh lines"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {lockedBanner && (
        <div className={styles.errorBanner}>
          <FiAlertCircle />
          <span>{lockedBanner} (Editing disabled)</span>
        </div>
      )}

      {/* page-level banner for fetch/create/delete errors */}
      {formError && (
        <div className={styles.errorBanner}>
          <FiAlertCircle />
          <span>{formError}</span>
        </div>
      )}

      {/* Add row */}
      <div className={styles.addRow}>
        <div className={styles.field}>
          <label>Transaction override</label>
          <select
            value={draft.transactionId}
            disabled={loading || isLocked}
            onChange={(e) =>
              setDraft((p) => ({ ...p, transactionId: e.target.value }))
            }
            className={styles.input}
          >
            <option value="">(use header)</option>
            {txOptions.map((t) => (
              <option key={t.id} value={t.id}>
                TX#{t.id}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Organization *</label>
          <select
            value={draft.organizationId}
            disabled={loading || isLocked}
            onChange={(e) =>
              setDraft((p) => ({ ...p, organizationId: e.target.value }))
            }
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
          <label>Cost detail</label>
          <select
            value={draft.costDetailId}
            disabled={loading || isLocked}
            onChange={(e) =>
              setDraft((p) => ({ ...p, costDetailId: e.target.value }))
            }
            className={styles.input}
          >
            <option value="">(none)</option>
            {costDetailOptions.map((cd) => (
              <option key={cd.costDetailId} value={cd.costDetailId}>
                {cd.costDescription || "No description"} (CD#{cd.costDetailId})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Amount *</label>
          <input
            type="number"
            step="0.01"
            value={draft.amount}
            disabled={loading || isLocked}
            onChange={(e) =>
              setDraft((p) => ({ ...p, amount: e.target.value }))
            }
            className={`${styles.input} ${
              fieldErrors.amount ? styles.inputError : ""
            }`}
          />
          {fieldErrors.amount && (
            <div className={styles.fieldError}>{fieldErrors.amount}</div>
          )}
        </div>

        <div className={styles.field}>
          <label>Memo</label>
          <input
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

        {loading ? (
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
              costDetailOptions={costDetailOptions}
              locked={isLocked}
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
  locked = false,
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

  useEffect(() => {
    setTransactionId(row.transactionId ?? "");
    setOrganizationId(row.organizationId ?? "");
    setCostDetailId(row.costDetailId ?? "");
    setAmount(row.amount ?? "");
    setMemo(row.memo ?? "");
  }, [
    row.id,
    row.transactionId,
    row.organizationId,
    row.costDetailId,
    row.amount,
    row.memo,
  ]);

  const amountError = rowError?.fieldErrors?.amount || "";
  const orgError = rowError?.fieldErrors?.organizationId || "";

  return (
    <div className={styles.trow}>
      <div>
        <select
          value={transactionId}
          disabled={locked}
          onChange={(e) => {
            setTransactionId(e.target.value);
            clearRowError?.();
          }}
          className={styles.input}
        >
          <option value="">(header)</option>
          {txOptions.map((t) => (
            <option key={t.id} value={t.id}>
              TX#{t.id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <select
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
        <select
          value={costDetailId}
          disabled={locked}
          onChange={(e) => {
            setCostDetailId(e.target.value);
            clearRowError?.();
          }}
          className={styles.input}
        >
          <option value="">(none)</option>
          {costDetailOptions.map((cd) => (
            <option key={cd.costDetailId} value={cd.costDetailId}>
              {cd.costDescription || "No description"} (CD#{cd.costDetailId})
            </option>
          ))}
        </select>
      </div>

      <div>
        <input
          type="number"
          step="0.01"
          value={amount}
          disabled={locked}
          onChange={(e) => {
            setAmount(e.target.value);
            clearRowError?.();
          }}
          className={`${styles.input} ${amountError ? styles.inputError : ""}`}
        />
        {amountError ? (
          <div className={styles.fieldError}>{amountError}</div>
        ) : null}

        {rowError?.message ? (
          <div className={styles.rowError}>{rowError.message}</div>
        ) : null}
      </div>

      <div>
        <input
          type="text"
          value={memo}
          disabled={locked}
          onChange={(e) => {
            setMemo(e.target.value);
            clearRowError?.();
          }}
          className={styles.input}
        />
      </div>

      <div className={styles.rowActions}>
        <button
          className={styles.iconCircleBtn}
          disabled={locked}
          title={
            locked ? "This payment order is Booked (locked)." : "Save line"
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
            locked ? "This payment order is Booked (locked)." : "Delete line"
          }
          onClick={onDelete}
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
};

export default PaymentOrderLines;
