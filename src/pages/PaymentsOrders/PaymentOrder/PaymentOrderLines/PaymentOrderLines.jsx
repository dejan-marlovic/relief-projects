import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./PaymentOrderLines.module.scss";

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

  const currencyId = r.currencyId ?? r.currency_id ?? r.currency?.id ?? null;

  return {
    id,
    transactionId,
    organizationId,
    costDetailId,
    currencyId,
    amount: r.amount ?? null,
    memo: r.memo ?? "",
  };
}

const PaymentOrderLines = ({
  paymentOrderId,
  txOptions = [],
  orgOptions = [],
  currencyOptions = [],
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

  // draft create row
  const [draft, setDraft] = useState({
    transactionId: "", // optional override
    organizationId: "",
    costDetailId: "",
    currencyId: "",
    amount: "",
    memo: "",
  });

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { field: msg }

  const fetchRows = useCallback(async () => {
    if (!paymentOrderId) return;
    setLoading(true);
    setFormError("");
    setFieldErrors({});
    try {
      const res = await fetch(
        `${BASE_URL}/api/payment-order-lines/payment-order/${paymentOrderId}`,
        { headers: authHeaders }
      );
      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
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
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors);

      const msg =
        data?.message ||
        (res.status === 409 ? "Conflict: payment order is locked." : null) ||
        "Failed to create line.";

      throw new Error(msg);
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
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors);

      const msg =
        data?.message ||
        (res.status === 409 ? "Conflict: payment order is locked." : null) ||
        "Failed to update line.";

      throw new Error(msg);
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
      const msg =
        data?.message ||
        (res.status === 409 ? "Conflict: payment order is locked." : null) ||
        "Failed to delete line.";
      throw new Error(msg);
    }
  };

  const onAdd = async () => {
    setFormError("");
    setFieldErrors({});

    const payload = {
      paymentOrderId: Number(paymentOrderId),

      // optional: line override tx. if null => header tx used in backend
      transactionId: draft.transactionId ? Number(draft.transactionId) : null,

      organizationId: toNumOrNull(draft.organizationId),
      costDetailId: draft.costDetailId ? Number(draft.costDetailId) : null,
      currencyId: draft.currencyId ? Number(draft.currencyId) : null,
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
        currencyId: "",
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
    setFormError("");
    setFieldErrors({});

    const payload = {
      paymentOrderId: Number(paymentOrderId),

      // allow override or clear (null => header)
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
      currencyId:
        patch.currencyId === ""
          ? null
          : patch.currencyId
          ? Number(patch.currencyId)
          : null,
      amount: patch.amount === "" ? null : Number(patch.amount),
      memo: patch.memo ?? null,
    };

    // minimal client checks
    if (
      payload.amount == null ||
      !Number.isFinite(payload.amount) ||
      payload.amount <= 0
    ) {
      setFormError("Amount must be a number > 0.");
      return;
    }
    if (!payload.organizationId) {
      setFormError("Organization is required.");
      return;
    }

    try {
      await apiUpdate(rowId, payload);
      await fetchRows();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to update line.");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this payment order line?")) return;
    setFormError("");
    setFieldErrors({});
    try {
      await apiDelete(id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      setFormError(e.message || "Failed to delete line.");
    }
  };

  // quick totals (UI only)
  const total = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

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
          className={styles.refreshBtn}
          onClick={fetchRows}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {formError && <div className={styles.errorBanner}>{formError}</div>}

      {/* Add row */}
      <div className={styles.addRow}>
        <div className={styles.field}>
          <label>Transaction override</label>
          <select
            value={draft.transactionId}
            onChange={(e) =>
              setDraft((p) => ({ ...p, transactionId: e.target.value }))
            }
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
            onChange={(e) =>
              setDraft((p) => ({ ...p, organizationId: e.target.value }))
            }
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
            onChange={(e) =>
              setDraft((p) => ({ ...p, costDetailId: e.target.value }))
            }
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
          <label>Currency</label>
          <select
            value={draft.currencyId}
            onChange={(e) =>
              setDraft((p) => ({ ...p, currencyId: e.target.value }))
            }
          >
            <option value="">(none)</option>
            {currencyOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
            onChange={(e) =>
              setDraft((p) => ({ ...p, amount: e.target.value }))
            }
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
            onChange={(e) => setDraft((p) => ({ ...p, memo: e.target.value }))}
            placeholder="Optional…"
          />
        </div>

        <div className={styles.fieldActions}>
          <button className={styles.primary} onClick={onAdd} disabled={loading}>
            + Add line
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.table}>
        <div className={styles.thead}>
          <div>Tx</div>
          <div>Org</div>
          <div>Cost detail</div>
          <div>Currency</div>
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
              currencyOptions={currencyOptions}
              costDetailOptions={costDetailOptions}
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
  currencyOptions,
  costDetailOptions,
  onSave,
  onDelete,
}) => {
  const [transactionId, setTransactionId] = useState(row.transactionId ?? "");
  const [organizationId, setOrganizationId] = useState(
    row.organizationId ?? ""
  );
  const [costDetailId, setCostDetailId] = useState(row.costDetailId ?? "");
  const [currencyId, setCurrencyId] = useState(row.currencyId ?? "");
  const [amount, setAmount] = useState(row.amount ?? "");
  const [memo, setMemo] = useState(row.memo ?? "");

  useEffect(() => {
    setTransactionId(row.transactionId ?? "");
    setOrganizationId(row.organizationId ?? "");
    setCostDetailId(row.costDetailId ?? "");
    setCurrencyId(row.currencyId ?? "");
    setAmount(row.amount ?? "");
    setMemo(row.memo ?? "");
  }, [
    row.id,
    row.transactionId,
    row.organizationId,
    row.costDetailId,
    row.currencyId,
    row.amount,
    row.memo,
  ]);

  return (
    <div className={styles.trow}>
      <div>
        <select
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
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
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          <option value="">Select…</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <select
          value={costDetailId}
          onChange={(e) => setCostDetailId(e.target.value)}
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
        <select
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
        >
          <option value="">(none)</option>
          {currencyOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <div className={styles.rowActions}>
        <button
          className={styles.secondary}
          onClick={() =>
            onSave({
              transactionId,
              organizationId,
              costDetailId,
              currencyId,
              amount,
              memo,
            })
          }
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

export default PaymentOrderLines;
