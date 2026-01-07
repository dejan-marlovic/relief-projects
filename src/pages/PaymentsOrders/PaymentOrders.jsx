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
import { FiPlus, FiColumns, FiAlertCircle } from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

const headerLabels = [
  "Actions",
  "PO ID",
  "Transaction",
  "Date",
  "Description",
  "Amount",
  "Message",
  "Pin Code",
];

// ✅ match number of columns above
const BASE_COL_WIDTHS = [
  160, // Actions
  110, // PO ID
  160, // Transaction
  180, // Date
  300, // Description
  140, // Amount
  200, // Message
  140, // Pin Code
];

const blankPO = {
  transactionId: "",
  paymentOrderDate: "",
  paymentOrderDescription: "",
  message: "",
  pinCode: "",
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
    msg.includes("locked") ||
    msg.includes("booked") ||
    msg.includes("final") ||
    msg.includes("signature")
  );
}

// Normalize in case backend returns paymentOrderId instead of id, etc.
function normalizePO(po) {
  if (!po || typeof po !== "object") return null;

  const id = po.id ?? po.paymentOrderId ?? po.payment_order_id ?? null;

  const transactionId =
    po.transactionId ??
    po.transaction_id ??
    po.transaction?.id ??
    po.transaction?.transactionId ??
    null;

  return {
    id,
    transactionId,
    paymentOrderDate: po.paymentOrderDate ?? po.payment_order_date ?? null,
    paymentOrderDescription:
      po.paymentOrderDescription ?? po.payment_order_description ?? "",
    // ✅ backend computed
    amount: po.amount ?? 0,
    message: po.message ?? "",
    pinCode: po.pinCode ?? po.pin_code ?? "",
  };
}

function PaymentOrders() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [txOptions, setTxOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // ✅ separate banners like PaymentOrderLines:
  // - lockedBanner = special "Booked (locked)" banner
  // - formError = other errors
  const [lockedBanner, setLockedBanner] = useState("");
  const [formError, setFormError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});

  const [expandedPoId, setExpandedPoId] = useState(null);
  const [orgOptions, setOrgOptions] = useState([]);
  const [costDetailOptions, setCostDetailOptions] = useState([]);

  // Track which POs are known locked (based on a 409 response)
  const [lockedPoIds, setLockedPoIds] = useState(() => new Set());

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

        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        const normalized = arr.map(normalizePO).filter(Boolean);
        setOrders(normalized);
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
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        setTxOptions(arr);
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
    fetchCostDetailsForProject(selectedProjectId);

    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});

    // ✅ clear banners on project change
    setLockedBanner("");
    setFormError("");

    setExpandedPoId(null);
    setLockedPoIds(new Set());
  }, [
    fetchOrders,
    fetchTxOptions,
    fetchOrgOptions,
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
        paymentOrderDescription: po.paymentOrderDescription ?? "",
        message: po.message ?? "",
        pinCode: po.pinCode ?? "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[po.id];
      return next;
    });

    // when user starts editing, clear normal errors (keep lockedBanner if present)
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
    setLockedBanner("");
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

  const markLocked = (poId) => {
    if (!poId) return;
    setLockedPoIds((prev) => {
      const next = new Set(prev);
      next.add(poId);
      return next;
    });
  };

  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    const payload = {
      transactionId: v.transactionId !== "" ? Number(v.transactionId) : null,
      paymentOrderDate: v.paymentOrderDate || null,
      paymentOrderDescription: v.paymentOrderDescription || "",
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
        const data = await safeParseJsonResponse(res);

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        const poLabel = !isCreate ? `PO#${id}` : "Payment order";

        const lockedMsgFallback =
          `${poLabel} is Booked (final signature) and is read-only. ` +
          `Undo/remove the Booked signature to make changes.`;

        if (!isCreate && isLockedResponse(res, data)) {
          const msg = data?.message || lockedMsgFallback;
          setLockedBanner(msg);
          markLocked(id);
          cancel();
          return;
        }

        const msg =
          data?.message ||
          `Failed to ${isCreate ? "create" : "update"} payment order.`;

        setFormError(msg);
        return;
      }

      // success -> clear banners
      setLockedBanner("");
      setFormError("");

      await fetchOrders(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message ||
          `Failed to ${
            editingId === "new" ? "create" : "update"
          } payment order.`
      );
    }
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this payment order?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/payment-orders/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        const poLabel = `PO#${id}`;
        const lockedMsgFallback =
          `${poLabel} is Booked (final signature) and cannot be deleted. ` +
          `Undo/remove the Booked signature to delete it.`;

        if (isLockedResponse(res, data)) {
          setLockedBanner(data?.message || lockedMsgFallback);
          markLocked(id);
          return;
        }

        setFormError(data?.message || "Delete failed.");
        return;
      }

      // success -> clear banners
      setLockedBanner("");
      setFormError("");

      await fetchOrders(selectedProjectId);
    } catch (e) {
      console.error(e);
      setFormError("Delete failed.");
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px"
    );
    return parts.join(" ");
  }, [visibleCols]);

  const subtitle = selectedProjectId
    ? `Project #${selectedProjectId} • ${orders.length} order${
        orders.length === 1 ? "" : "s"
      }`
    : "Select a project to see payment orders";

  const lockedBannerText = lockedBanner && `${lockedBanner} (Editing disabled)`;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Payment Orders</h3>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.columnsBox}>
              <button
                type="button"
                className={styles.iconPillBtn}
                onClick={() => setColumnsOpen((v) => !v)}
                aria-label="Toggle columns"
                title="Columns"
              >
                <FiColumns />
                Columns
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
                      {i === 0 && (
                        <em className={styles.lockNote}> (locked)</em>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              className={styles.primaryBtn}
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
              <FiPlus />
              New
            </button>
          </div>
        </div>

        {/* ✅ Locked banner (same style as PaymentOrderLines) */}
        {lockedBannerText && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{lockedBannerText}</span>
          </div>
        )}

        {/* Other errors */}
        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div className={styles.table} style={{ ["--po-grid-cols"]: gridCols }}>
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
                  locked={lockedPoIds.has(po.id)}
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
                  <div className={styles.linesPanel}>
                    <PaymentOrderLines
                      paymentOrderId={po.id}
                      txOptions={txOptions}
                      orgOptions={orgOptions}
                      costDetailOptions={costDetailOptions}
                    />
                  </div>
                )}
              </React.Fragment>
            ))
          )}

          {editingId === "new" && (
            <PaymentOrder
              po={{ id: "new", ...blankPO, amount: 0 }}
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
      </div>
    </div>
  );
}

export default PaymentOrders;
