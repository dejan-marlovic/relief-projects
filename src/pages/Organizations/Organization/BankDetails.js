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

  // 🔴 error state
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

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
      setFormError(
        e.message || "Failed to load bank details for this organization."
      );
    }
  };

  useEffect(() => {
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
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

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFormError("");
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({
      ...prev,
      new: { ...blankBank },
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
        [field]: value,
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
    const values = editedValues[id];
    if (!values) return;

    const isCreate = id === "new";

    const payload = {
      bankName: values.bankName || "",
      accountNumber: values.accountNumber || "",
      branchName: values.branchName || null,
      swiftCode: values.swiftCode || null,
      organizationId: Number(organizationId),
      bankId: isCreate ? undefined : id,
    };

    setFormError("");
    setFieldErrors((prev) => ({
      ...prev,
      [id]: {},
    }));

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
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.warn("Failed to parse bank detail error JSON:", e);
        }

        if (data && data.fieldErrors) {
          setFieldErrors((prev) => ({
            ...prev,
            [id]: data.fieldErrors,
          }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} bank detail.`
        );
        return;
      }

      await loadForOrg();
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} bank detail.`
      );
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

  // === validation helpers for per-row errors ===
  const getRowFieldError = (rowKey, name) =>
    fieldErrors?.[rowKey] ? fieldErrors[rowKey][name] : undefined;

  const hasRowError = (rowKey, name) => Boolean(getRowFieldError(rowKey, name));

  const inputClassFor = (rowKey, name) =>
    `${styles.input} ${hasRowError(rowKey, name) ? styles.inputError : ""}`;

  const FieldError = ({ rowKey, name }) => {
    const msg = getRowFieldError(rowKey, name);
    return msg ? <div className={styles.fieldError}>{msg}</div> : null;
  };

  return (
    <div className={styles.bankDetailsContainer}>
      <div className={styles.bankDetailsHeader}>
        <span className={styles.bankDetailsTitle}>
          Bank details for organization #{organizationId}
        </span>
        <button
          type="button"
          className={styles.bankAddBtn || styles.addBtn}
          onClick={startCreate}
          disabled={editingId === "new"}
        >
          <FiPlus /> New Bank Detail
        </button>
      </div>

      {/* 🔴 local error banner */}
      {formError && <div className={styles.bankErrorBanner}>{formError}</div>}

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
                  <>
                    <input
                      className={inputClassFor(rowId, "bankName")}
                      type="text"
                      value={ev.bankName ?? row.bankName ?? ""}
                      onChange={(e) => onChange("bankName", e.target.value)}
                    />
                    <FieldError rowKey={rowId} name="bankName" />
                  </>
                ) : (
                  row.bankName || "-"
                )}
              </div>

              {/* account number */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <>
                    <input
                      className={inputClassFor(rowId, "accountNumber")}
                      type="text"
                      value={ev.accountNumber ?? row.accountNumber ?? ""}
                      onChange={(e) =>
                        onChange("accountNumber", e.target.value)
                      }
                    />
                    <FieldError rowKey={rowId} name="accountNumber" />
                  </>
                ) : (
                  row.accountNumber || "-"
                )}
              </div>

              {/* branch */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <>
                    <input
                      className={inputClassFor(rowId, "branchName")}
                      type="text"
                      value={ev.branchName ?? row.branchName ?? ""}
                      onChange={(e) => onChange("branchName", e.target.value)}
                    />
                    <FieldError rowKey={rowId} name="branchName" />
                  </>
                ) : (
                  row.branchName || "-"
                )}
              </div>

              {/* swift */}
              <div className={styles.bankDetailsCell}>
                {isRowEditing ? (
                  <>
                    <input
                      className={inputClassFor(rowId, "swiftCode")}
                      type="text"
                      value={ev.swiftCode ?? row.swiftCode ?? ""}
                      onChange={(e) => onChange("swiftCode", e.target.value)}
                    />
                    <FieldError rowKey={rowId} name="swiftCode" />
                  </>
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
              <>
                <input
                  className={inputClassFor("new", "bankName")}
                  type="text"
                  value={editedValues.new?.bankName ?? ""}
                  onChange={(e) => onChange("bankName", e.target.value)}
                  placeholder="Bank name"
                />
                <FieldError rowKey="new" name="bankName" />
              </>
            </div>
            <div className={styles.bankDetailsCell}>
              <>
                <input
                  className={inputClassFor("new", "accountNumber")}
                  type="text"
                  value={editedValues.new?.accountNumber ?? ""}
                  onChange={(e) => onChange("accountNumber", e.target.value)}
                  placeholder="Account number"
                />
                <FieldError rowKey="new" name="accountNumber" />
              </>
            </div>
            <div className={styles.bankDetailsCell}>
              <>
                <input
                  className={inputClassFor("new", "branchName")}
                  type="text"
                  value={editedValues.new?.branchName ?? ""}
                  onChange={(e) => onChange("branchName", e.target.value)}
                  placeholder="Branch"
                />
                <FieldError rowKey="new" name="branchName" />
              </>
            </div>
            <div className={styles.bankDetailsCell}>
              <>
                <input
                  className={inputClassFor("new", "swiftCode")}
                  type="text"
                  value={editedValues.new?.swiftCode ?? ""}
                  onChange={(e) => onChange("swiftCode", e.target.value)}
                  placeholder="SWIFT"
                />
                <FieldError rowKey="new" name="swiftCode" />
              </>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankDetails;
