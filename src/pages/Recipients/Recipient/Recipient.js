import PaymentAmount from "../../../components/PaymentAmount/PaymentAmount";
// src/components/Recipients/Recipient/Recipient.jsx
import React from "react";
import styles from "./Recipient.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const Cell = ({ children, className, label }) => (
  <div className={`${styles.cell} ${className || ""}`}>{label && <span className={styles.mobileLabel}>{label}</span>}{children}</div>
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
  isSelected = false,
  onSelectChange,
  selectionDisabled = false,
  locked = false,
  poOptions = [],
  orgOptions = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {},
  rowRef = null,
  canManage = false,
  compact = false,
  saving = false,
}) => {
  const ev = editedValues || {};
  const isCreate = (row?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate && !compact;

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
      <div id={`recipient-${row.id}-${name}-error`} className={styles.fieldError}>{getFieldError(name)}</div>
    ) : null;

  const inputNum = (field, step = "1") => (
    <>
      <input
        aria-label="Organization ID"
        aria-invalid={hasError(field)}
        aria-describedby={hasError(field) ? `recipient-${row.id}-${field}-error` : undefined}
        type="number"
        step={step}
        value={ev[field] ?? row[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
        disabled={locked || saving}
      />
      <FieldError name={field} />
    </>
  );

  const selectPO = (
    <>
      <select
        aria-label="Payment order"
        aria-invalid={hasError("paymentOrderId")}
        aria-describedby={hasError("paymentOrderId") ? `recipient-${row.id}-paymentOrderId-error` : undefined}
        value={ev.paymentOrderId ?? row.paymentOrderId ?? ""}
        onChange={(e) =>
          onChange(
            "paymentOrderId",
            e.target.value ? Number(e.target.value) : "",
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("paymentOrderId")}
        disabled={locked || saving}
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
        aria-label="Organization"
        aria-invalid={hasError("organizationId")}
        aria-describedby={hasError("organizationId") ? `recipient-${row.id}-organizationId-error` : undefined}
        value={ev.organizationId ?? row.organizationId ?? ""}
        onChange={(e) =>
          onChange(
            "organizationId",
            e.target.value ? Number(e.target.value) : "",
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("organizationId")}
        disabled={locked || saving}
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
    return hit ? (hit.label ?? `Org #${hit.id}`) : (id ?? "-");
  };

  const hc = (i) => (!compact && !visibleCols[i] ? styles.hiddenCol : "");

  // Amount is computed by the backend and is display-only.

  const lockedTitle =
    "Booked (final signature) — this recipient is read-only. Undo/remove the Booked signature to edit.";

  return (
    <div
      role="group"
      aria-label={isCreate ? "New recipient" : `Recipient ${row.id}`}
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
      title={locked ? lockedTitle : undefined}
      style={locked ? { opacity: 0.92 } : undefined}
    >
      <div className={styles.mobileTitle}>{isCreate ? "New recipient" : `Recipient #${row.id}`}{locked && <span>Read-only · Booked</span>}</div>
      {/* 0: Actions */}
      <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
        {isEditing ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconCircleBtn}
              onClick={submit}
              title={locked ? lockedTitle : "Save"}
              aria-label="Save"
              disabled={locked || saving}
            >
              <FiSave /><span className={styles.mobileActionText}>{saving ? "Saving…" : "Save"}</span>
            </button>

            <button
              type="button"
              className={styles.dangerIconBtn}
              disabled={saving}
              onClick={onCancel}
              title="Cancel"
              aria-label="Cancel"
            >
              <FiX /><span className={styles.mobileActionText}>Cancel</span>
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            {!isCreate && (
              <input
                type="checkbox"
                checked={isSelected}
                /*
                 * Selection is allowed even when the recipient is locked.
                 * Locked rows remain read-only, but they can be selected for
                 * Excel export and included in a bulk-delete attempt.
                 */
                disabled={selectionDisabled}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectChange?.(row.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                title="Select recipient"
                aria-label={`Select recipient ${row.id}`}
                className={styles.rowCheckbox}
              />
            )}

            {canManage && (
              <button
                type="button"
                className={styles.iconCircleBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                title={locked ? lockedTitle : "Edit"}
                aria-label="Edit"
                disabled={locked || saving}
              >
                <FiEdit /><span className={styles.mobileActionText}>Edit</span>
              </button>
            )}

            {!isCreate && canManage && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDanger} ${styles.iconOnlyBtn}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(row.id);
                }}
                title={locked ? lockedTitle : "Delete recipient"}
                aria-label="Delete recipient"
                disabled={locked || saving}
              >
                <FiTrash2 /><span className={styles.mobileActionText}>Delete</span>
              </button>
            )}
          </div>
        )}
      </Cell>

      {/* 1: Organization */}
      <Cell label="Organization" className={hc(1)}>
        {isEditing
          ? orgOptions.length > 0
            ? selectOrg
            : inputNum("organizationId", "1")
          : orgOptions.length > 0
            ? orgLabelById(row.organizationId)
            : (row.organizationId ?? "-")}
      </Cell>

      {/* 2: Payment Order */}
      <Cell label="Payment order" className={hc(2)}>
        {isEditing ? selectPO : (row.paymentOrderId ?? "-")}
      </Cell>

      {/* 3: Amount (computed, read-only) */}
      <Cell label="Amount" className={hc(3)}><PaymentAmount record={row} /></Cell>
    </div>
  );
};

export default RecipientRow;
