import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const Transactions = ({ refreshTrigger }) => {
  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null); // number | "new" | null
  const [editedValues, setEditedValues] = useState({}); // { [id]: values }

  const token = useMemo(() => localStorage.getItem("authToken"), []);

  const fetchActiveTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/transactions/active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      // Endpoint might return a single object or an array — normalize
      const list = Array.isArray(data) ? data : data ? [data] : [];
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    }
  }, [token]);

  useEffect(() => {
    fetchActiveTransactions();
  }, [fetchActiveTransactions, refreshTrigger]);

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
      new: { ...blankTx },
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

    // Build payload for POST/PUT
    const payload = {
      organizationId: values.organizationId
        ? Number(values.organizationId)
        : null,
      projectId: values.projectId ? Number(values.projectId) : null,
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

    const isCreate = id === "new";

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

      await fetchActiveTransactions();
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
      await fetchActiveTransactions();
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.headerCell}>IDs</div>
        <div className={styles.headerCell}>Amounts</div>
        <div className={styles.headerCell}>Flags & Date</div>
      </div>

      {transactions.length === 0 ? (
        <p className={styles.noData}>No active transactions.</p>
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
          />
        ))
      )}

      <div className={styles.createBar}>
        {editingId === "new" ? (
          <Transaction
            tx={{ id: "new", ...blankTx }}
            isEditing
            editedValues={editedValues.new}
            onEdit={() => {}}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
          />
        ) : (
          <button className={styles.addBtn} onClick={startCreate}>
            + New Transaction
          </button>
        )}
      </div>
    </div>
  );
};

export default Transactions;
