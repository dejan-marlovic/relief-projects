// src/pages/Organizations/Organization/BankDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./BankDetails.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX, FiPlus } from "react-icons/fi";

const BASE_URL = "http://localhost:8080";

const blankBank = {
  bankName: "",
  accountNumber: "",
  branchName: "",
  swiftCode: "",
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

const BankDetails = ({ organizationId }) => {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

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

  const rowKeyOf = (row) => row.bankId ?? row.id;
  const isRowEditing = (row) => rowKeyOf(row) === editingId;
  const evForRow = (row) => editedValues[rowKeyOf(row)] || {};

  const startEdit = (row) => {
    const id = rowKeyOf(row);
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
    setEditedValues((prev) => ({ ...prev, new: { ...blankBank } }));

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
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

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
        const data = await safeParseJsonResponse(res);
        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
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

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/bank-details/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        setFormError(data?.message || "Failed to delete bank detail.");
        return;
      }

      await loadForOrg();
    } catch (e) {
      console.error(e);
      setFormError("Failed to delete bank detail.");
    }
  };

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
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          Bank details for organization #{organizationId}
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={startCreate}
          disabled={editingId === "new"}
        >
          <FiPlus /> New Bank Detail
        </button>
      </div>

      {formError && <div className={styles.errorBanner}>{formError}</div>}

      {rows.length === 0 && editingId !== "new" && (
        <p className={styles.noData}>No bank details for this organization.</p>
      )}

      <div className={styles.table}>
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          <div className={`${styles.headerCell} ${styles.stickyColHeader}`}>
            Actions
          </div>
          <div className={styles.headerCell}>Bank name</div>
          <div className={styles.headerCell}>Account number</div>
          <div className={styles.headerCell}>Branch</div>
          <div className={styles.headerCell}>SWIFT</div>
        </div>

        {rows.map((row, idx) => {
          const rowId = rowKeyOf(row);
          const edit = isRowEditing(row);
          const ev = evForRow(row);

          return (
            <div
              key={rowId}
              className={`${styles.gridRow} ${styles.dataRow} ${
                idx % 2 === 0 ? styles.zebraEven : ""
              } ${styles.hoverable}`}
            >
              {/* actions */}
              <div className={`${styles.cell} ${styles.stickyCol}`}>
                {edit ? (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.iconCircleBtn}
                      onClick={save}
                      title="Save"
                      aria-label="Save"
                    >
                      <FiSave />
                    </button>
                    <button
                      type="button"
                      className={styles.dangerIconBtn}
                      onClick={cancel}
                      title="Cancel"
                      aria-label="Cancel"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.iconCircleBtn}
                      onClick={() => startEdit(row)}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <FiEdit />
                    </button>
                    <button
                      type="button"
                      className={styles.dangerIconBtn}
                      onClick={() => remove(rowId)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>

              {/* bank name */}
              <div className={styles.cell}>
                {edit ? (
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

              {/* account */}
              <div className={styles.cell}>
                {edit ? (
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
              <div className={styles.cell}>
                {edit ? (
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
              <div className={styles.cell}>
                {edit ? (
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

        {editingId === "new" && (
          <div
            className={`${styles.gridRow} ${styles.dataRow} ${styles.hoverable}`}
          >
            <div className={`${styles.cell} ${styles.stickyCol}`}>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.iconCircleBtn}
                  onClick={save}
                  title="Save"
                  aria-label="Save"
                >
                  <FiSave />
                </button>
                <button
                  type="button"
                  className={styles.dangerIconBtn}
                  onClick={cancel}
                  title="Cancel"
                  aria-label="Cancel"
                >
                  <FiX />
                </button>
              </div>
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "bankName")}
                type="text"
                value={editedValues.new?.bankName ?? ""}
                onChange={(e) => onChange("bankName", e.target.value)}
                placeholder="Bank name"
              />
              <FieldError rowKey="new" name="bankName" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "accountNumber")}
                type="text"
                value={editedValues.new?.accountNumber ?? ""}
                onChange={(e) => onChange("accountNumber", e.target.value)}
                placeholder="Account number"
              />
              <FieldError rowKey="new" name="accountNumber" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "branchName")}
                type="text"
                value={editedValues.new?.branchName ?? ""}
                onChange={(e) => onChange("branchName", e.target.value)}
                placeholder="Branch"
              />
              <FieldError rowKey="new" name="branchName" />
            </div>

            <div className={styles.cell}>
              <input
                className={inputClassFor("new", "swiftCode")}
                type="text"
                value={editedValues.new?.swiftCode ?? ""}
                onChange={(e) => onChange("swiftCode", e.target.value)}
                placeholder="SWIFT"
              />
              <FieldError rowKey="new" name="swiftCode" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankDetails;
