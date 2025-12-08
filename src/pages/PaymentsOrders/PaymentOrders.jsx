import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import PaymentOrder from "./PaymentOrder/PaymentOrder";
import styles from "./PaymentOrders.module.scss";

const BASE_URL = "http://localhost:8080";

const headerLabels = [
  "Actions", // sticky left
  "Transaction", // transactionId
  "Date", // paymentOrderDate
  "#Tx", // numberOfTransactions
  "Description", // paymentOrderDescription
  "Amount", // amount
  "Total Amount", // totalAmount
  "Message", // message
  "Pin Code", // pinCode
];

// column widths (px) in the same order as headerLabels
const BASE_COL_WIDTHS = [
  110, // Actions
  160, // Transaction
  180, // Date
  90, // #Tx
  300, // Description
  140, // Amount
  160, // Total Amount
  200, // Message
  140, // Pin Code
];

const blankPO = {
  transactionId: "",
  paymentOrderDate: "",
  numberOfTransactions: "",
  paymentOrderDescription: "",
  amount: "",
  totalAmount: "",
  message: "",
  pinCode: "",
};

function PaymentOrders() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [txOptions, setTxOptions] = useState([]);

  // UI state for column toggles & compact mode
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // 🔴 form-level & field-level errors (same pattern as Transactions)
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  // ref for "new" row to auto-scroll
  const newRowRef = useRef(null);

  const toggleCol = (i) => {
    if (i === 0) return;
    setVisibleCols((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  // Auth headers (memoized)
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

  // Fetch list of payment orders (FILTERED BY PROJECT)
  const fetchOrders = useCallback(
    async (projectId) => {
      if (!projectId) {
        setOrders([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/payment-orders/project/${projectId}`,
          { headers: authHeaders }
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        setOrders(await res.json());
      } catch (e) {
        console.error(e);
        setOrders([]);
      }
    },
    [authHeaders]
  );

  // Fetch transaction options for Transaction dropdown (also filtered by project)
  const fetchTxOptions = useCallback(
    async (projectId) => {
      if (!projectId) {
        setTxOptions([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/transactions/project/${projectId}`,
          { headers: authHeaders }
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        const data = await res.json();
        setTxOptions(Array.isArray(data) ? data : data ? [data] : []);
      } catch (e) {
        console.error(e);
        setTxOptions([]);
      }
    },
    [authHeaders]
  );

  // Load lists whenever project changes
  useEffect(() => {
    fetchOrders(selectedProjectId);
    fetchTxOptions(selectedProjectId);
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
  }, [fetchOrders, fetchTxOptions, selectedProjectId]);

  // Auto-scroll when entering "new" mode
  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  // Begin editing a row: seed the draft with current values
  const startEdit = (po) => {
    setEditingId(po?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [po.id]: {
        transactionId: po.transactionId ?? "",
        paymentOrderDate: po.paymentOrderDate ?? "",
        numberOfTransactions: po.numberOfTransactions ?? "",
        paymentOrderDescription: po.paymentOrderDescription ?? "",
        amount: po.amount ?? "",
        totalAmount: po.totalAmount ?? "",
        message: po.message ?? "",
        pinCode: po.pinCode ?? "",
      },
    }));

    // clear previous errors for this row
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[po.id];
      return next;
    });
    setFormError("");
  };

  // Start create (inline new row)
  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankPO } }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      return next;
    });
    setFormError("");
  };

  // Update a single field in the current draft
  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

  // Cancel editing: clear current id and remove its draft + its errors
  const cancel = () => {
    const id = editingId;

    setEditingId(null);
    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFormError("");
  };

  // Save current draft (POST for create, PUT for update) with ApiError handling
  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    const payload = {
      transactionId: v.transactionId !== "" ? Number(v.transactionId) : null,
      paymentOrderDate: v.paymentOrderDate || null,
      numberOfTransactions:
        v.numberOfTransactions !== "" ? Number(v.numberOfTransactions) : null,
      paymentOrderDescription: v.paymentOrderDescription || "",
      amount: v.amount !== "" ? Number(v.amount) : null,
      totalAmount: v.totalAmount !== "" ? Number(v.totalAmount) : null,
      message: v.message || "",
      pinCode: v.pinCode || "",
    };

    // clear previous errors
    setFormError("");
    setFieldErrors((prev) => ({
      ...prev,
      [id]: {},
    }));

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/payment-orders`
          : `${BASE_URL}/api/payment-orders/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        // Try to parse ApiError
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.warn("Failed to parse payment order error JSON:", e);
        }

        if (data && data.fieldErrors) {
          setFieldErrors((prev) => ({
            ...prev,
            [id]: data.fieldErrors,
          }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} payment order.`
        );
        return;
      }

      await fetchOrders(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message ||
          `Failed to ${isCreate ? "create" : "update"} payment order.`
      );
    }
  };

  // Delete a row
  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this payment order?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/payment-orders/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchOrders(selectedProjectId);
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // Build CSS variable for grid columns
  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px"
    );
    return parts.join(" ");
  }, [visibleCols]);

  return (
    <div className={styles.container}>
      {/* Toolbar (compact + columns) */}
      <div className={styles.toolbar}>
        <label className={styles.compactToggle}>
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
          />
          <span>Compact mode</span>
        </label>

        <div className={styles.columnsBox}>
          <button
            className={styles.columnsBtn}
            onClick={() => setColumnsOpen((v) => !v)}
          >
            Columns ▾
          </button>
          {columnsOpen && (
            <div className={styles.columnsPanel}>
              {headerLabels.map((h, i) => (
                <label key={h} className={styles.colItem}>
                  <input
                    type="checkbox"
                    checked={visibleCols[i]}
                    disabled={i === 0} // Actions locked
                    onChange={() => toggleCol(i)}
                  />
                  <span>{h}</span>
                  {i === 0 && <em className={styles.lockNote}> (locked)</em>}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🔴 Global error banner */}
      {formError && <div className={styles.errorBanner}>{formError}</div>}

      {/* Table */}
      <div
        className={`${styles.table} ${compact ? styles.compact : ""}`}
        style={{ ["--po-grid-cols"]: gridCols }}
      >
        {/* Header */}
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          {headerLabels.map((h, i) => (
            <div
              key={h}
              className={`${styles.headerCell}
                ${i === 0 ? styles.stickyColHeader : ""}
                ${!visibleCols[i] ? styles.hiddenCol : ""}
                ${i === 0 ? styles.actionsCol : ""}`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Body */}
        {!selectedProjectId ? (
          <p className={styles.noData}>
            Select a project to see its payment orders.
          </p>
        ) : orders.length === 0 ? (
          <p className={styles.noData}>No payment orders for this project.</p>
        ) : (
          orders.map((po, idx) => (
            <PaymentOrder
              key={po.id}
              po={po}
              isEven={idx % 2 === 0}
              isEditing={editingId === po.id}
              editedValues={editedValues[po.id]}
              onEdit={() => startEdit(po)}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={remove}
              transactions={txOptions}
              visibleCols={visibleCols}
              fieldErrors={fieldErrors[po.id] || {}}
            />
          ))
        )}

        {/* Inline create row (rendered last) */}
        {editingId === "new" && (
          <PaymentOrder
            po={{ id: "new", ...blankPO }}
            isEditing
            editedValues={editedValues.new}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
            transactions={txOptions}
            visibleCols={visibleCols}
            isEven={false}
            fieldErrors={fieldErrors.new || {}}
            rowRef={newRowRef}
          />
        )}
      </div>

      {/* Create button */}
      <div className={styles.createBar}>
        <button
          className={styles.addBtn}
          onClick={startCreate}
          disabled={!selectedProjectId || editingId === "new"}
          title={
            !selectedProjectId
              ? "Select a project first"
              : editingId === "new"
              ? "Finish the current draft first"
              : "Create new payment order"
          }
        >
          + New Payment Order
        </button>
      </div>
    </div>
  );
}

export default PaymentOrders;
