import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import Transaction from "./Transaction/Transaction";
import styles from "./Transactions.module.scss";
import { FiAlertCircle, FiPlus, FiColumns } from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

const blankTx = {
  organizationId: "",
  projectId: "",
  budgetId: "", // ✅ NEW
  financierOrganizationId: "",
  transactionStatusId: "",
  appliedForAmount: "",
  firstShareAmount: "",
  approvedAmount: "",
  ownContribution: "",
  secondShareAmount: "",
  datePlanned: "",
  okStatus: "",
};

const headerLabels = [
  "Actions",
  "Org",
  "Project",
  "Budget", // ✅ NEW
  "Financier",
  "Status",
  "Applied Amt",
  "1st Share",
  "Approved Amt",
  "2nd Share",
  "Own Contrib",
  "Date Planned",
  "OK Status",
];

const BASE_COL_WIDTHS = [
  160, 160, 220, 260, 180, 160, 120, 120, 140, 120, 110, 170, 100,
];

const Transactions = ({ refreshTrigger }) => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [expandedTxId, setExpandedTxId] = useState(null);

  // dropdown data
  const [orgOptions, setOrgOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [budgetOptions, setBudgetOptions] = useState([]); // ✅ NEW
  const [costDetailOptions, setCostDetailOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // refs
  const tableRef = useRef(null);
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

  // dropdowns
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [orgRes, projRes, statRes] = await Promise.all([
          fetch(`${BASE_URL}/api/organizations/active/options`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/projects/ids-names`, { headers: authHeaders }),
          fetch(`${BASE_URL}/api/transaction-statuses/active`, {
            headers: authHeaders,
          }),
        ]);

        if (cancelled) return;

        setOrgOptions(orgRes.ok ? await orgRes.json() : []);
        setProjectOptions(projRes.ok ? await projRes.json() : []);
        setStatusOptions(statRes.ok ? await statRes.json() : []);
      } catch (e) {
        if (!cancelled) {
          console.error("Error fetching dropdown options:", e);
          setOrgOptions([]);
          setProjectOptions([]);
          setStatusOptions([]);
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

  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  // ✅ budgets + cost detail options (same effect)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!selectedProjectId) {
        setCostDetailOptions([]);
        setBudgetOptions([]);
        return;
      }
      try {
        const token = localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const bRes = await fetch(
          `${BASE_URL}/api/budgets/project/${selectedProjectId}`,
          { headers }
        );
        const budgets = bRes.ok ? await bRes.json() : [];
        const budgetList = Array.isArray(budgets) ? budgets : [];

        if (!cancelled) setBudgetOptions(budgetList);

        const all = [];
        for (const b of budgetList) {
          const cdRes = await fetch(
            `${BASE_URL}/api/cost-details/by-budget/${b.id}`,
            { headers }
          );
          if (!cdRes.ok) continue;
          const cds = await cdRes.json();
          if (Array.isArray(cds)) all.push(...cds);
        }

        if (!cancelled) setCostDetailOptions(all);
      } catch (e) {
        console.error("Failed to load budgets/cost detail options:", e);
        if (!cancelled) {
          setCostDetailOptions([]);
          setBudgetOptions([]);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const startEdit = (tx) => {
    setEditingId(tx?.id ?? null);
    setExpandedTxId((cur) => (cur === tx.id ? null : cur));

    setEditedValues((prev) => ({
      ...prev,
      [tx.id]: {
        organizationId: tx.organizationId,
        projectId: tx.projectId,
        budgetId: tx.budgetId, // ✅ NEW
        financierOrganizationId: tx.financierOrganizationId,
        transactionStatusId: tx.transactionStatusId,
        appliedForAmount: tx.appliedForAmount,
        firstShareAmount: tx.firstShareAmount,
        approvedAmount: tx.approvedAmount,
        ownContribution: tx.ownContribution,
        secondShareAmount: tx.secondShareAmount,
        datePlanned: tx.datePlanned,
        okStatus: tx.okStatus,
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[tx.id];
      return next;
    });
    setFormError("");
  };

  const startCreate = () => {
    setEditingId("new");
    setExpandedTxId(null);

    // If there is exactly one budget for the project, preselect it
    const autoBudgetId = budgetOptions.length === 1 ? budgetOptions[0].id : "";

    setEditedValues((prev) => ({
      ...prev,
      new: {
        ...blankTx,
        projectId: selectedProjectId || "",
        budgetId: autoBudgetId,
      },
    }));

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

  const save = async () => {
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

    const isCreate = id === "new";
    const effectiveProjectId = isCreate
      ? values.projectId || selectedProjectId
      : values.projectId ?? null;

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    const payload = {
      organizationId: values.organizationId
        ? Number(values.organizationId)
        : null,
      projectId: effectiveProjectId ? Number(effectiveProjectId) : null,
      budgetId: values.budgetId ? Number(values.budgetId) : null, // ✅ NEW (required)
      financierOrganizationId: values.financierOrganizationId
        ? Number(values.financierOrganizationId)
        : null,
      transactionStatusId: values.transactionStatusId
        ? Number(values.transactionStatusId)
        : null,
      appliedForAmount: values.appliedForAmount
        ? Number(values.appliedForAmount)
        : null,
      firstShareAmount: values.firstShareAmount
        ? Number(values.firstShareAmount)
        : null,
      approvedAmount: values.approvedAmount
        ? Number(values.approvedAmount)
        : null,
      ownContribution: values.ownContribution || null,
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
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          // ignore
        }

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} transaction.`
        );
        return;
      }

      await fetchTransactions(selectedProjectId);
      cancel();
    } catch (err) {
      console.error(err);
      setFormError(
        err.message ||
          `Failed to ${isCreate ? "create" : "update"} transaction.`
      );
    }
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

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this transaction?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/transactions/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete transaction");

      setExpandedTxId((cur) => (cur === id ? null : cur));
      await fetchTransactions(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction.");
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
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerText}>
            <div className={styles.cardTitle}>Transactions</div>
            <div className={styles.cardMeta}>
              View, edit and allocate planned amounts per transaction.
            </div>
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
              type="button"
              className={styles.primaryInlineBtn}
              onClick={startCreate}
              disabled={!selectedProjectId || editingId === "new"}
              title="New Transaction"
            >
              <FiPlus />
              New
            </button>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div
          className={styles.table}
          style={{ ["--tx-grid-cols"]: gridCols }}
          ref={tableRef}
        >
          <div className={`${styles.gridRow} ${styles.headerRow}`}>
            {headerLabels.map((h, i) => (
              <div
                key={h}
                className={`${styles.headerCell} ${
                  i === 0 ? styles.stickyColHeader : ""
                } ${!visibleCols[i] ? styles.hiddenCol : ""} ${
                  i === 0 ? styles.actionsCol : ""
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see transactions.
            </p>
          ) : transactions.length === 0 ? (
            <p className={styles.noData}>No transactions for this project.</p>
          ) : (
            transactions.map((tx, idx) => (
              <Transaction
                key={tx.id}
                tx={tx}
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
                budgets={budgetOptions} // ✅ NEW
                visibleCols={visibleCols}
                fieldErrors={fieldErrors[tx.id] || {}}
                expanded={expandedTxId === tx.id}
                onToggleAllocations={() =>
                  setExpandedTxId((cur) => (cur === tx.id ? null : tx.id))
                }
                costDetailOptions={costDetailOptions}
              />
            ))
          )}

          {editingId === "new" && (
            <Transaction
              tx={{
                id: "new",
                ...blankTx,
                projectId: selectedProjectId || "",
              }}
              isEditing
              editedValues={editedValues.new}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={() => {}}
              organizations={orgOptions}
              projects={projectOptions}
              statuses={statusOptions}
              budgets={budgetOptions} // ✅ NEW
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
};

export default Transactions;
