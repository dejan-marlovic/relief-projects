import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import Transaction from "./Transaction/Transaction";
import styles from "./Transactions.module.scss";

const BASE_URL = "http://localhost:8080";

const blankTx = {
  organizationId: "",
  projectId: "",
  financierOrganizationId: "",
  transactionStatusId: "",
  appliedForAmount: "",
  appliedForExchangeRateId: "",
  firstShareSEKAmount: "",
  firstShareAmount: "",
  approvedAmount: "",
  approvedAmountCurrencyId: "",
  approvedAmountExchangeRateId: "",
  ownContribution: "",
  secondShareAmountSEK: "",
  secondShareAmount: "",
  datePlanned: "",
  okStatus: "",
};

const headerLabels = [
  "Actions", // sticky left
  "Org",
  "Project",
  "Financier",
  "Status",
  "Applied Amt",
  "Applied FX",
  "1st SEK",
  "1st Orig",
  "Approved Amt",
  "Approved Curr",
  "Approved FX",
  "2nd SEK",
  "2nd Orig",
  "Own Contrib",
  "Date Planned",
  "OK Status", // non-sticky
];

// column widths (px) in the same order as headerLabels
const BASE_COL_WIDTHS = [
  110, // Actions
  160, // Org
  220, // Project
  180, // Financier
  160, // Status
  120, // Applied Amt
  140, // Applied FX
  120, // 1st SEK
  120, // 1st Orig
  140, // Approved Amt
  120, // Approved Curr
  140, // Approved FX
  120, // 2nd SEK
  120, // 2nd Orig
  110, // Own Contrib
  170, // Date Planned
  100, // OK Status
];

// Minimal required fields for a new transaction
const isValidNew = (v, selectedProjectId) =>
  v &&
  (v.projectId || selectedProjectId) &&
  v.organizationId !== "" &&
  v.transactionStatusId !== "";

const Transactions = ({ refreshTrigger }) => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // Dropdown data
  const [orgOptions, setOrgOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [fxOptions, setFxOptions] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  // UI state
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  // visibility per column (default: all true)
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // Lock ONLY the first column (Actions) as always-visible
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

  const fetchTransactions = useCallback(
    async (projectId) => {
      if (!projectId) {
        setTransactions([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/transactions/project/${projectId}`,
          { headers: authHeaders }
        );
        if (!res.ok)
          throw new Error(`Failed to fetch transactions (${res.status})`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data ? [data] : [];
        setTransactions(list);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setTransactions([]);
      }
    },
    [authHeaders]
  );

  // Fetch dropdown options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgRes, projRes, statRes, fxRes, curRes] = await Promise.all([
          fetch(`${BASE_URL}/api/organizations/active/options`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/projects/ids-names`, { headers: authHeaders }),
          fetch(`${BASE_URL}/api/transaction-statuses/active`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/exchange-rates/active`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/currencies/active`, { headers: authHeaders }),
        ]);

        if (cancelled) return;

        setOrgOptions(orgRes.ok ? await orgRes.json() : []);
        setProjectOptions(projRes.ok ? await projRes.json() : []);
        setStatusOptions(statRes.ok ? await statRes.json() : []);
        setFxOptions(fxRes.ok ? await fxRes.json() : []);
        setCurrencies(curRes.ok ? await curRes.json() : []);
      } catch (e) {
        if (!cancelled) {
          console.error("Error fetching dropdown options:", e);
          setOrgOptions([]);
          setProjectOptions([]);
          setStatusOptions([]);
          setFxOptions([]);
          setCurrencies([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    fetchTransactions(selectedProjectId);
  }, [fetchTransactions, selectedProjectId, refreshTrigger]);

  const startEdit = (tx) => {
    setEditingId(tx?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [tx.id]: {
        organizationId: tx.organizationId,
        projectId: tx.projectId,
        financierOrganizationId: tx.financierOrganizationId,
        transactionStatusId: tx.transactionStatusId,
        appliedForAmount: tx.appliedForAmount,
        appliedForExchangeRateId: tx.appliedForExchangeRateId,
        firstShareSEKAmount: tx.firstShareSEKAmount,
        firstShareAmount: tx.firstShareAmount,
        approvedAmount: tx.approvedAmount,
        approvedAmountCurrencyId: tx.approvedAmountCurrencyId,
        approvedAmountExchangeRateId: tx.approvedAmountExchangeRateId,
        ownContribution: tx.ownContribution,
        secondShareAmountSEK: tx.secondShareAmountSEK,
        secondShareAmount: tx.secondShareAmount,
        datePlanned: tx.datePlanned,
        okStatus: tx.okStatus,
      },
    }));
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({
      ...prev,
      new: {
        ...blankTx,
        projectId: selectedProjectId || "",
      },
    }));
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

  const save = async () => {
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

    const isCreate = id === "new";
    const effectiveProjectId = isCreate
      ? values.projectId || selectedProjectId
      : values.projectId ?? null;

    if (isCreate && !isValidNew(values, selectedProjectId)) {
      alert("Please fill in Organization and Status (Project is prefilled).");
      return;
    }

    const payload = {
      organizationId: values.organizationId
        ? Number(values.organizationId)
        : null,
      projectId: effectiveProjectId ? Number(effectiveProjectId) : null,
      financierOrganizationId: values.financierOrganizationId
        ? Number(values.financierOrganizationId)
        : null,
      transactionStatusId: values.transactionStatusId
        ? Number(values.transactionStatusId)
        : null,
      appliedForAmount: values.appliedForAmount
        ? Number(values.appliedForAmount)
        : null,
      appliedForExchangeRateId: values.appliedForExchangeRateId
        ? Number(values.appliedForExchangeRateId)
        : null,
      firstShareSEKAmount: values.firstShareSEKAmount
        ? Number(values.firstShareSEKAmount)
        : null,
      firstShareAmount: values.firstShareAmount
        ? Number(values.firstShareAmount)
        : null,
      approvedAmount: values.approvedAmount
        ? Number(values.approvedAmount)
        : null,
      approvedAmountCurrencyId: values.approvedAmountCurrencyId
        ? Number(values.approvedAmountCurrencyId)
        : null,
      approvedAmountExchangeRateId: values.approvedAmountExchangeRateId
        ? Number(values.approvedAmountExchangeRateId)
        : null,
      ownContribution: values.ownContribution || null,
      secondShareAmountSEK: values.secondShareAmountSEK
        ? Number(values.secondShareAmountSEK)
        : null,
      secondShareAmount: values.secondShareAmount
        ? Number(values.secondShareAmount)
        : null,
      datePlanned: values.datePlanned || null,
      okStatus: values.okStatus || null,
    };

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/transactions`
          : `${BASE_URL}/api/transactions/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(
          `Failed to ${isCreate ? "create" : "update"} transaction. ${msg}`
        );
      }

      await fetchTransactions(selectedProjectId);
      cancel();
    } catch (err) {
      console.error(err);
      alert(err.message || "Save failed.");
    }
  };

  const cancel = () => {
    setEditingId(null);
    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (editingId && next[editingId]) delete next[editingId];
      return next;
    });
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this transaction?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/transactions/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete transaction");
      await fetchTransactions(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction.");
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
      {/* Toolbar */}
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
                    disabled={i === 0} // only Actions is locked
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
        style={{ ["--tx-grid-cols"]: gridCols }}
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

        {/* Body (existing transactions) */}
        {!selectedProjectId ? (
          <p className={styles.noData}>
            Select a project to see its transactions.
          </p>
        ) : transactions.length === 0 ? (
          <p className={styles.noData}>No transactions for this project.</p>
        ) : (
          transactions.map((tx, idx) => (
            <Transaction
              key={tx.id}
              tx={tx}
              rowIndex={idx}
              isEven={idx % 2 === 0}
              isEditing={editingId === tx.id}
              editedValues={editedValues[tx.id]}
              onEdit={() => startEdit(tx)}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={remove}
              organizations={orgOptions}
              projects={projectOptions}
              statuses={statusOptions}
              exchangeRates={fxOptions}
              currencies={currencies}
              visibleCols={visibleCols}
            />
          ))
        )}

        {/* --- INLINE CREATE ROW (now rendered LAST in the list) --- */}
        {editingId === "new" && (
          <Transaction
            tx={{ id: "new", ...blankTx, projectId: selectedProjectId || "" }}
            isEditing
            editedValues={editedValues.new}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
            organizations={orgOptions}
            projects={projectOptions}
            statuses={statusOptions}
            exchangeRates={fxOptions}
            currencies={currencies}
            visibleCols={visibleCols}
            isEven={false}
          />
        )}
      </div>

      {/* Add button below table; disabled while the create row is open */}
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
              : "Create new transaction"
          }
        >
          + New Transaction
        </button>
      </div>
    </div>
  );
};

export default Transactions;
