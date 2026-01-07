import React from "react";
import styles from "./PaymentOrder.module.scss";
import {
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

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
  fieldErrors = {},
  rowRef = null,

  // lines expansion
  expanded = false,
  onToggleLines,

  // optional: lock UI (disable edit/delete if locked)
  locked = false,
}) => {
  const ev = editedValues || {};
  const isCreate = (po?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate;

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  // ==== error helpers ====
  const getFieldError = (name) => fieldErrors?.[name];
  const hasError = (name) => Boolean(getFieldError(name));
  const inputClass = (name) =>
    `${styles.input} ${hasError(name) ? styles.inputError : ""}`;

  const FieldError = ({ name }) =>
    hasError(name) ? (
      <div className={styles.fieldError}>{getFieldError(name)}</div>
    ) : null;

  const inputText = (field) => (
    <>
      <input
        type="text"
        value={ev[field] ?? po[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
        disabled={locked}
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
        disabled={locked}
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
        disabled={locked}
      />
      <FieldError name="paymentOrderDate" />
    </>
  );

  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  // ✅ amount is computed by backend, display only
  const computedAmount =
    po?.amount == null || Number.isNaN(Number(po.amount))
      ? 0
      : Number(po.amount);

  // ✅ PO ID label (read-only)
  const poIdLabel = isCreate ? "(new)" : po?.id != null ? `PO#${po.id}` : "-";

  return (
    <div
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
      title={locked ? "Locked by final (Booked) signature" : undefined}
      style={locked ? { opacity: 0.92 } : undefined}
    >
      {/* 0: Actions (sticky left) */}
      <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
        {isEditing ? (
          <div className={styles.actions}>
            <button
              className={styles.iconCircleBtn}
              onClick={submit}
              title="Save"
              disabled={locked}
            >
              <FiSave />
            </button>
            <button
              className={styles.dangerIconBtn}
              onClick={onCancel}
              title="Cancel"
            >
              <FiX />
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              className={styles.iconCircleBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              title={locked ? "Locked" : "Edit"}
              disabled={locked}
            >
              <FiEdit />
            </button>

            {!isCreate && (
              <button
                type="button"
                className={styles.iconCircleBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLines?.();
                }}
                title={expanded ? "Hide lines" : "Show lines"}
                aria-label={expanded ? "Hide lines" : "Show lines"}
              >
                {expanded ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            )}

            <button
              className={styles.dangerIconBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(po.id);
              }}
              title={locked ? "Locked" : "Delete"}
              disabled={locked}
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>

      {/* 1: PO ID (read-only) */}
      <Cell className={hc(1)}>{poIdLabel}</Cell>

      {/* 2: Transaction */}
      <Cell className={hc(2)}>
        {isEditing ? selectTransaction : po.transactionId ?? "-"}
      </Cell>

      {/* 3: Date */}
      <Cell className={hc(3)}>
        {isEditing
          ? inputDate
          : po.paymentOrderDate
          ? new Date(po.paymentOrderDate).toLocaleString()
          : "-"}
      </Cell>

      {/* 4: Description */}
      <Cell className={hc(4)}>
        {isEditing
          ? inputText("paymentOrderDescription")
          : po.paymentOrderDescription ?? "-"}
      </Cell>

      {/* 5: Amount (computed, not editable) */}
      <Cell className={hc(5)}>{computedAmount.toFixed(2)}</Cell>

      {/* 6: Message */}
      <Cell className={hc(6)}>
        {isEditing ? inputText("message") : po.message ?? "-"}
      </Cell>

      {/* 7: Pin Code */}
      <Cell className={hc(7)}>
        {isEditing ? inputText("pinCode") : po.pinCode ?? "-"}
      </Cell>
    </div>
  );
};

export default PaymentOrder;
