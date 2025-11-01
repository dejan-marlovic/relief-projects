// src/components/PaymentOrders/PaymentOrders.jsx

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

function PaymentOrders() {
  // ← get the current project like in Transactions
  const { selectedProjectId } = useContext(ProjectContext);

  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [txOptions, setTxOptions] = useState([]);

  // UI state for column toggles & compact mode (same pattern as Transactions)
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // Only column 0 (Actions) is locked visible
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
        // same per-project scope as Transactions
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

  // Load lists whenever project (or headers) change
  useEffect(() => {
    fetchOrders(selectedProjectId);
    fetchTxOptions(selectedProjectId);
    // Optional: cancel any in-progress edit when project changes
    setEditingId(null);
    setEditedValues({});
  }, [fetchOrders, fetchTxOptions, selectedProjectId]);

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
  };

  // Start create (inline new row)
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

  const startCreate = () => {
    setEditingId("new");
    // Functional updater avoids stale state; clone the blank template
    setEditedValues((prev) => ({ ...prev, new: { ...blankPO } }));
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

  // Cancel editing: clear current id and remove its draft
  const cancel = () => {
    const id = editingId; // capture before we clear it
    setEditingId(null);
    setEditedValues((prev) => {
      const next = { ...prev };
      if (id && next[id]) delete next[id];
      return next;
    });
  };

  // Save current draft (POST for create, PUT for update)
  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    /*
    convert strings from inputs into the right types (numbers/strings),
    turn “empty” values into null or "" consistently,
    avoid sending undefined.
    */
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
      if (!res.ok)
        throw new Error(
          `${isCreate ? "Create" : "Update"} failed ${res.status}`
        );

      await fetchOrders(selectedProjectId); // ← refresh list for current project
      cancel();
    } catch (e) {
      console.error(e);
      alert(`${isCreate ? "Create" : "Save"} failed.`);
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
      await fetchOrders(selectedProjectId); // ← refresh list for current project
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // Build the CSS variable for grid columns from visibility + base widths
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
