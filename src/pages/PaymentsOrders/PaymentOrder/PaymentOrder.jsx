import React from "react";
import styles from "./PaymentOrder.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const Cell = ({ children, className }) => (
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

// Format for <input type="datetime-local">
function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

const PaymentOrder = ({
  po,
  isEditing = false,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  transactions = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {}, // NEW: per-row field errors
  rowRef = null, // NEW: for scrolling to the "new" row
}) => {
  const ev = editedValues || {};

  const isCreate = (po?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate;

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

  // ==== error helpers (same pattern as Transactions) ====
  const getFieldError = (name) => fieldErrors?.[name];
  const hasError = (name) => Boolean(getFieldError(name));
  const inputClass = (name) =>
    `${styles.input} ${hasError(name) ? styles.inputError : ""}`;

  const FieldError = ({ name }) =>
    hasError(name) ? (
      <div className={styles.fieldError}>{getFieldError(name)}</div>
    ) : null;

  const inputNum = (field, step = "1") => (
    <>
      <input
        type="number"
        step={step}
        value={ev[field] ?? po[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      />
      <FieldError name={field} />
    </>
  );

  const inputText = (field) => (
    <>
      <input
        type="text"
        value={ev[field] ?? po[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      />
      <FieldError name={field} />
    </>
  );

  const selectTransaction = (
    <>
      <select
        value={ev.transactionId ?? po.transactionId ?? ""}
        onChange={(e) =>
          onChange(
            "transactionId",
            e.target.value ? Number(e.target.value) : null
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("transactionId")}
      >
        <option value="">(none)</option>
        {transactions.map((t) => (
          <option key={t.id} value={t.id}>{`TX#${t.id}`}</option>
        ))}
      </select>
      <FieldError name="transactionId" />
    </>
  );

  const inputDate = (
    <>
      <input
        type="datetime-local"
        value={toDateTimeLocal(ev.paymentOrderDate ?? po.paymentOrderDate)}
        onChange={(e) =>
          onChange(
            "paymentOrderDate",
            e.target.value ? new Date(e.target.value).toISOString() : ""
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("paymentOrderDate")}
      />
      <FieldError name="paymentOrderDate" />
    </>
  );

  // hidden column helper (aligns with header visibility)
  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  return (
    <div
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
    >
      {/* 0: Actions (sticky left) */}
      <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
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
                onDelete(po.id);
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>

      {/* 1..8 data columns */}
      <Cell className={hc(1)}>
        {isEditing ? selectTransaction : po.transactionId ?? "-"}
      </Cell>

      <Cell className={hc(2)}>
        {isEditing
          ? inputDate
          : po.paymentOrderDate
          ? new Date(po.paymentOrderDate).toLocaleString()
          : "-"}
      </Cell>

      <Cell className={hc(3)}>
        {isEditing
          ? inputNum("numberOfTransactions", "1")
          : po.numberOfTransactions ?? "-"}
      </Cell>

      <Cell className={hc(4)}>
        {isEditing
          ? inputText("paymentOrderDescription")
          : po.paymentOrderDescription ?? "-"}
      </Cell>

      <Cell className={hc(5)}>
        {isEditing ? inputNum("amount", "0.000001") : po.amount ?? "-"}
      </Cell>

      <Cell className={hc(6)}>
        {isEditing
          ? inputNum("totalAmount", "0.000001")
          : po.totalAmount ?? "-"}
      </Cell>

      <Cell className={hc(7)}>
        {isEditing ? inputText("message") : po.message ?? "-"}
      </Cell>

      <Cell className={hc(8)}>
        {isEditing ? inputText("pinCode") : po.pinCode ?? "-"}
      </Cell>
    </div>
  );
};

export default PaymentOrder;
