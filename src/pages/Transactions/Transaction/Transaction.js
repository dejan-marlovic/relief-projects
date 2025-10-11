import React from "react";
import styles from "./Transaction.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const yesNo = ["Yes", "No"];

function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const Cell = ({ children }) => <div className={styles.cell}>{children}</div>;

const Transaction = ({
  tx,
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
}) => {
  const ev = editedValues || {};
  const isCreate = (tx?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate; // only auto-save on blur for existing rows

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

  const inputNum = (field, step = "1") => (
    <input
      type="number"
      step={step}
      value={ev[field] ?? tx[field] ?? ""}
      onChange={(e) => onChange(field, toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    />
  );

  const selectYesNo = (field) => (
    <select
      value={ev[field] ?? tx[field] ?? ""}
      onChange={(e) => onChange(field, e.target.value)}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select</option>
      {yesNo.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );

  const inputDate = (
    <input
      type="datetime-local"
      value={toDateTimeLocal(ev.datePlanned ?? tx.datePlanned)}
      onChange={(e) =>
        onChange("datePlanned", new Date(e.target.value).toISOString())
      }
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    />
  );

  return (
    <div className={styles.row}>
      {/* Keep the order in sync with headerLabels */}
      <Cell>
        {isEditing ? inputNum("organizationId") : tx.organizationId ?? "-"}
      </Cell>
      <Cell>{isEditing ? inputNum("projectId") : tx.projectId ?? "-"}</Cell>
      <Cell>
        {isEditing
          ? inputNum("financierOrganizationId")
          : tx.financierOrganizationId ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("transactionStatusId")
          : tx.transactionStatusId ?? "-"}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("appliedForAmount", "0.01")
          : tx.appliedForAmount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("appliedForExchangeRateId")
          : tx.appliedForExchangeRateId ?? "-"}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("firstShareSEKAmount", "0.01")
          : tx.firstShareSEKAmount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("firstShareAmount", "0.01")
          : tx.firstShareAmount ?? "-"}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("approvedAmount", "0.01")
          : tx.approvedAmount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("approvedAmountCurrencyId")
          : tx.approvedAmountCurrencyId ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("approvedAmountExchangeRateId")
          : tx.approvedAmountExchangeRateId ?? "-"}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("secondShareAmountSEK", "0.01")
          : tx.secondShareAmountSEK ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("secondShareAmount", "0.01")
          : tx.secondShareAmount ?? "-"}
      </Cell>

      <Cell>
        {isEditing ? selectYesNo("ownContribution") : tx.ownContribution ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputDate
          : tx.datePlanned
          ? new Date(tx.datePlanned).toLocaleString()
          : "-"}
      </Cell>
      <Cell>{isEditing ? selectYesNo("okStatus") : tx.okStatus ?? "-"}</Cell>

      <Cell>
        {isEditing ? (
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={submit} title="Save">
              <FiSave />
            </button>
            <button
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={onCancel}
              title="Cancel"
            >
              <FiX />
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              className={styles.actionBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              title="Edit"
            >
              <FiEdit />
            </button>
            <button
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(tx.id);
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>
    </div>
  );
};

export default Transaction;
