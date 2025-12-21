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
import PaymentOrderLines from "./PaymentOrder/PaymentOrderLines/PaymentOrderLines";

const BASE_URL = "http://localhost:8080";

const headerLabels = [
  "Actions",
  "Transaction",
  "Date",
  "#Tx",
  "Description",
  "Amount",
  "Total Amount",
  "Message",
  "Pin Code",
];

const BASE_COL_WIDTHS = [110, 160, 180, 90, 300, 140, 160, 200, 140];

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

  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [expandedPoId, setExpandedPoId] = useState(null);
  const [orgOptions, setOrgOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [costDetailOptions, setCostDetailOptions] = useState([]);

  const newRowRef = useRef(null);

  const toggleCol = (i) => {
    if (i === 0) return;
    setVisibleCols((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

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

  const fetchOrgOptions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/organizations/active/options`, {
        headers: authHeaders,
      });
      setOrgOptions(res.ok ? await res.json() : []);
    } catch {
      setOrgOptions([]);
    }
  }, [authHeaders]);

  const fetchCurrencyOptions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/currencies/active`, {
        headers: authHeaders,
      });
      setCurrencyOptions(res.ok ? await res.json() : []);
    } catch {
      setCurrencyOptions([]);
    }
  }, [authHeaders]);

  const fetchCostDetailsForProject = useCallback(
    async (projectId) => {
      if (!projectId) {
        setCostDetailOptions([]);
        return;
      }
      try {
        const bRes = await fetch(
          `${BASE_URL}/api/budgets/project/${projectId}`,
          { headers: authHeaders }
        );
        const budgets = bRes.ok ? await bRes.json() : [];
        const list = Array.isArray(budgets) ? budgets : [];

        const all = [];
        for (const b of list) {
          const cdRes = await fetch(
            `${BASE_URL}/api/cost-details/by-budget/${b.id}`,
            { headers: authHeaders }
          );
          if (!cdRes.ok) continue;
          const cds = await cdRes.json();
          if (Array.isArray(cds)) all.push(...cds);
        }
        setCostDetailOptions(all);
      } catch {
        setCostDetailOptions([]);
      }
    },
    [authHeaders]
  );

  useEffect(() => {
    fetchOrders(selectedProjectId);
    fetchTxOptions(selectedProjectId);

    fetchOrgOptions();
    fetchCurrencyOptions();
    fetchCostDetailsForProject(selectedProjectId);

    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
    setExpandedPoId(null);
  }, [
    fetchOrders,
    fetchTxOptions,
    fetchOrgOptions,
    fetchCurrencyOptions,
    fetchCostDetailsForProject,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

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

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[po.id];
      return next;
    });
    setFormError("");
  };

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

  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

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

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

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
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {}

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
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

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px"
    );
    return parts.join(" ");
  }, [visibleCols]);

  return (
    <div className={styles.container}>
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
                    disabled={i === 0}
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

      {formError && <div className={styles.errorBanner}>{formError}</div>}

      <div
        className={`${styles.table} ${compact ? styles.compact : ""}`}
        style={{ ["--po-grid-cols"]: gridCols }}
      >
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

        {!selectedProjectId ? (
          <p className={styles.noData}>
            Select a project to see its payment orders.
          </p>
        ) : orders.length === 0 ? (
          <p className={styles.noData}>No payment orders for this project.</p>
        ) : (
          orders.map((po, idx) => (
            <React.Fragment key={po.id}>
              <PaymentOrder
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
                expanded={expandedPoId === po.id}
                onToggleLines={() =>
                  setExpandedPoId((cur) => (cur === po.id ? null : po.id))
                }
              />

              {expandedPoId === po.id && (
                <div style={{ padding: "0 12px 12px 12px" }}>
                  <PaymentOrderLines
                    paymentOrderId={po.id}
                    txOptions={txOptions}
                    orgOptions={orgOptions}
                    currencyOptions={currencyOptions}
                    costDetailOptions={costDetailOptions}
                  />
                </div>
              )}
            </React.Fragment>
          ))
        )}

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
