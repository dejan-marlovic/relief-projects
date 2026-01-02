// src/components/Recipients/Recipient/Recipient.jsx
import React from "react";
import styles from "./Recipient.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const Cell = ({ children, className }) => (
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

const RecipientRow = ({
  row,
  isEditing = false,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  poOptions = [],
  orgOptions = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {},
  rowRef = null,
}) => {
  const ev = editedValues || {};
  const isCreate = (row?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate;

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

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
        value={ev[field] ?? row[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      />
      <FieldError name={field} />
    </>
  );

  const selectPO = (
    <>
      <select
        value={ev.paymentOrderId ?? row.paymentOrderId ?? ""}
        onChange={(e) =>
          onChange(
            "paymentOrderId",
            e.target.value ? Number(e.target.value) : ""
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("paymentOrderId")}
      >
        <option value="">(none)</option>
        {poOptions.map((po) => (
          <option key={po.id} value={po.id}>{`PO#${po.id}`}</option>
        ))}
      </select>
      <FieldError name="paymentOrderId" />
    </>
  );

  const selectOrg = (
    <>
      <select
        value={ev.organizationId ?? row.organizationId ?? ""}
        onChange={(e) =>
          onChange(
            "organizationId",
            e.target.value ? Number(e.target.value) : ""
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("organizationId")}
      >
        <option value="">(none)</option>
        {orgOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label ?? `Org #${o.id}`}
          </option>
        ))}
      </select>
      <FieldError name="organizationId" />
    </>
  );

  const orgLabelById = (id) => {
    const hit = orgOptions.find((o) => String(o.id) === String(id));
    return hit ? hit.label ?? `Org #${hit.id}` : id ?? "-";
  };

  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  // ✅ amount is computed by backend; display only
  const amountNum =
    row?.amount == null || Number.isNaN(Number(row.amount))
      ? 0
      : Number(row.amount);

  return (
    <div
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
    >
      {/* 0: Actions */}
      <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
        {isEditing ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconCircleBtn}
              onClick={submit}
              title="Save"
              aria-label="Save"
            >
              <FiSave />
            </button>

            <button
              type="button"
              className={styles.dangerIconBtn}
              onClick={onCancel}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              title="Edit"
              aria-label="Edit"
            >
              <FiEdit />
            </button>

            <button
              type="button"
              className={styles.dangerIconBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(row.id);
              }}
              title="Delete"
              aria-label="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>

      {/* 1: Organization */}
      <Cell className={hc(1)}>
        {isEditing
          ? orgOptions.length > 0
            ? selectOrg
            : inputNum("organizationId", "1")
          : orgOptions.length > 0
          ? orgLabelById(row.organizationId)
          : row.organizationId ?? "-"}
      </Cell>

      {/* 2: Payment Order */}
      <Cell className={hc(2)}>
        {isEditing ? selectPO : row.paymentOrderId ?? "-"}
      </Cell>

      {/* 3: Amount (computed, read-only) */}
      <Cell className={hc(3)}>{amountNum.toFixed(2)}</Cell>
    </div>
  );
};

export default RecipientRow;
