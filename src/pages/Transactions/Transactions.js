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
  "OK Status",
  "Actions",
];

// Minimal required fields for a new transaction (adjust if your backend requires more)
const isValidNew = (v, selectedProjectId) =>
  v &&
  (v.projectId || selectedProjectId) &&
  v.organizationId !== "" &&
  v.transactionStatusId !== "";

const Transactions = ({ refreshTrigger }) => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null); // number | "new" | null
  const [editedValues, setEditedValues] = useState({}); // { [id]: values }
  const [orgOptions, setOrgOptions] = useState([]); // [{id, name}]

  const token = useMemo(() => localStorage.getItem("authToken"), []);

  const fetchTransactions = useCallback(
    async (projectId) => {
      if (!projectId) {
        setTransactions([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/transactions/project/${projectId}`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data ? [data] : [];
        setTransactions(list);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setTransactions([]);
      }
    },
    [token]
  );

  // Fetch organization options once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/organizations/active/options`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const data = await res.json();
        setOrgOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching organization options:", e);
        setOrgOptions([]);
      }
    })();
  }, [token]);

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
        projectId: selectedProjectId || "", // prefill with current project
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

    // Ensure projectId is set to the selected project on create
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
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to delete transaction");
      await fetchTransactions(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.row} ${styles.headerRow}`}>
        {headerLabels.map((h) => (
          <div key={h} className={styles.headerCell}>
            {h}
          </div>
        ))}
      </div>

      {!selectedProjectId ? (
        <p className={styles.noData}>
          Select a project to see its transactions.
        </p>
      ) : transactions.length === 0 ? (
        <p className={styles.noData}>No transactions for this project.</p>
      ) : (
        transactions.map((tx) => (
          <Transaction
            key={tx.id}
            tx={tx}
            isEditing={editingId === tx.id}
            editedValues={editedValues[tx.id]}
            onEdit={() => startEdit(tx)}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={remove}
            organizations={orgOptions}
          />
        ))
      )}

      <div className={styles.createBar}>
        {editingId === "new" ? (
          <Transaction
            tx={{ id: "new", ...blankTx, projectId: selectedProjectId || "" }}
            isEditing
            editedValues={editedValues.new}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
            organizations={orgOptions}
          />
        ) : (
          <button
            className={styles.addBtn}
            onClick={startCreate}
            disabled={!selectedProjectId}
            title={
              !selectedProjectId
                ? "Select a project first"
                : "Create new transaction"
            }
          >
            + New Transaction
          </button>
        )}
      </div>
    </div>
  );
};

export default Transactions;
