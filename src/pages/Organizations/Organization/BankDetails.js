import React, { useEffect, useMemo, useState } from "react";
import styles from "./Organization.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX, FiPlus } from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

const blankBank = {
  bankName: "",
  accountNumber: "",
  branchName: "",
  swiftCode: "",
};

const BankDetails = ({ organizationId }) => {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

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

  // fetch all bank details and filter by organization
  const loadForOrg = async () => {
    if (!organizationId) {
      setRows([]);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/bank-details/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch bank details");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data ? [data] : [];
      const byOrg = list.filter(
        (b) => String(b.organizationId) === String(organizationId)
      );
      setRows(byOrg);
    } catch (e) {
      console.error("Error fetching bank details:", e);
      setRows([]);
    }
  };

  useEffect(() => {
    loadForOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const startEdit = (row) => {
    const id = row.bankId ?? row.id;
    setEditingId(id);
    setEditedValues((prev) => ({
      ...prev,
      [id]: {
        bankName: row.bankName || "",
        accountNumber: row.accountNumber || "",
        branchName: row.branchName || "",
        swiftCode: row.swiftCode || "",
      },
    }));
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({
      ...prev,
      new: { ...blankBank },
    }));
  };

  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: value,
      },
    }));
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

  const save = async () => {
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

    const isCreate = id === "new";

    if (!values.bankName || !values.accountNumber) {
      alert("Please fill in at least Bank name and Account number.");
      return;
    }

    const payload = {
      bankName: values.bankName,
      accountNumber: values.accountNumber,
      branchName: values.branchName || null,
      swiftCode: values.swiftCode || null,
      organizationId: Number(organizationId),
      // optional, for update: bankId
      bankId: isCreate ? undefined : id,
    };

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/bank-details`
          : `${BASE_URL}/api/bank-details/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(
          `Failed to ${isCreate ? "create" : "update"} bank detail. ${msg}`
        );
      }

      await loadForOrg();
      cancel();
    } catch (e) {
      console.error(e);
      alert(e.message || "Save failed.");
    }
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this bank detail?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/bank-details/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete bank detail");
      await loadForOrg();
    } catch (e) {
      console.error(e);
      alert("Failed to delete bank detail.");
    }
  };

  const editingRowId = (row) => (row.bankId ?? row.id ?? null) === editingId;
  const evForRow = (row) => editedValues[row.bankId ?? row.id] || {};

  return (
    <div className={styles.bankDetailsContainer}>
      <div className={styles.bankDetailsHeader}>
        <span className={styles.bankDetailsTitle}>
          Bank details for organization #{organizationId}
        </span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={startCreate}
          disabled={editingId === "new"}
        >
          <FiPlus /> New Bank Detail
        </button>
      </div>

      {rows.length === 0 && editingId !== "new" && (
        <p className={styles.noData}>No bank details for this organization.</p>
      )}

      <div className={styles.bankDetailsTable}>
        {/* header row */}
        <div className={styles.bankDetailsRow}>
          <div className={styles.bankDetailsCell}>Actions</div>
          <div className={styles.bankDetailsCell}>Bank name</div>
          <div className={styles.bankDetailsCell}>Account number</div>
          <div className={styles.bankDetailsCell}>Branch</div>
          <div className={styles.bankDetailsCell}>SWIFT</div>
        </div>

        {/* existing rows */}
        {rows.map((row, idx) => {
          const rowId = row.bankId ?? row.id;
          const isRowEditing = editingRowId(row);
          const ev = evForRow(row);
          const zebra = idx % 2 === 0 ? styles.zebraEven : "";

          return (
            <div key={rowId} className={`${styles.bankDetailsRow} ${zebra}`}>
              {/* actions */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={save}
                      title="Save"
                    >
                      <FiSave />
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={cancel}
                      title="Cancel"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => startEdit(row)}
                      title="Edit"
                    >
                      <FiEdit />
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => remove(rowId)}
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>

              {/* bank name */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={ev.bankName ?? row.bankName ?? ""}
                    onChange={(e) => onChange("bankName", e.target.value)}
                  />
                ) : (
                  row.bankName || "-"
                )}
              </div>

              {/* account number */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={ev.accountNumber ?? row.accountNumber ?? ""}
                    onChange={(e) => onChange("accountNumber", e.target.value)}
                  />
                ) : (
                  row.accountNumber || "-"
                )}
              </div>

              {/* branch */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={ev.branchName ?? row.branchName ?? ""}
                    onChange={(e) => onChange("branchName", e.target.value)}
                  />
                ) : (
                  row.branchName || "-"
                )}
              </div>

              {/* swift */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={ev.swiftCode ?? row.swiftCode ?? ""}
                    onChange={(e) => onChange("swiftCode", e.target.value)}
                  />
                ) : (
                  row.swiftCode || "-"
                )}
              </div>
            </div>
          );
        })}

        {/* create row */}
        {editingId === "new" && (
          <div className={styles.bankDetailsRow}>
            <div className={styles.bankDetailsCell}>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={save}
                  title="Save"
                >
                  <FiSave />
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.danger}`}
                  onClick={cancel}
                  title="Cancel"
                >
                  <FiX />
                </button>
              </div>
            </div>

            <div className={styles.bankDetailsCell}>
              <input
                className={styles.input}
                type="text"
                value={editedValues.new?.bankName ?? ""}
                onChange={(e) => onChange("bankName", e.target.value)}
                placeholder="Bank name"
              />
            </div>
            <div className={styles.bankDetailsCell}>
              <input
                className={styles.input}
                type="text"
                value={editedValues.new?.accountNumber ?? ""}
                onChange={(e) => onChange("accountNumber", e.target.value)}
                placeholder="Account number"
              />
            </div>
            <div className={styles.bankDetailsCell}>
              <input
                className={styles.input}
                type="text"
                value={editedValues.new?.branchName ?? ""}
                onChange={(e) => onChange("branchName", e.target.value)}
                placeholder="Branch"
              />
            </div>
            <div className={styles.bankDetailsCell}>
              <input
                className={styles.input}
                type="text"
                value={editedValues.new?.swiftCode ?? ""}
                onChange={(e) => onChange("swiftCode", e.target.value)}
                placeholder="SWIFT"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankDetails;
