import React from "react";
import styles from "./Signature.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

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

const Cell = ({ children, className }) => (
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

const SignatureRow = ({
  row,
  isEditing = false,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  poOptions = [],
  statusOptions = [],
  employeeOptions = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {}, // NEW: per-row field errors
  rowRef = null, // NEW: for auto-scroll on create
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

  // ==== error helpers (same pattern as Transactions/PaymentOrders) ====
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
        value={ev[field] ?? row[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
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
            e.target.value ? Number(e.target.value) : null
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

  const selectStatus = (
    <>
      <select
        value={ev.signatureStatusId ?? row.signatureStatusId ?? ""}
        onChange={(e) =>
          onChange(
            "signatureStatusId",
            e.target.value ? Number(e.target.value) : null
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("signatureStatusId")}
      >
        <option value="">(none)</option>
        {statusOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <FieldError name="signatureStatusId" />
    </>
  );

  const selectEmployee = (
    <>
      <select
        value={ev.employeeId ?? row.employeeId ?? ""}
        onChange={(e) =>
          onChange("employeeId", e.target.value ? Number(e.target.value) : null)
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("employeeId")}
      >
        <option value="">(none)</option>
        {employeeOptions.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </select>
      <FieldError name="employeeId" />
    </>
  );

  const inputDate = (
    <>
      <input
        type="datetime-local"
        value={toDateTimeLocal(ev.signatureDate ?? row.signatureDate)}
        onChange={(e) =>
          onChange(
            "signatureDate",
            e.target.value ? new Date(e.target.value).toISOString() : ""
          )
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("signatureDate")}
      />
      <FieldError name="signatureDate" />
    </>
  );

  const statusLabelById = (id) => {
    const hit = statusOptions.find((s) => String(s.id) === String(id));
    return hit ? hit.label : id ?? "-";
  };

  const employeeLabelById = (id) => {
    const hit = employeeOptions.find((e) => String(e.id) === String(id));
    return hit ? hit.label : id ?? "-";
  };

  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  return (
    <div
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
    >
      {/* 0: Actions */}
      <Cell className={`${styles.stickyCol} ${hc(0)}`}>
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
                onDelete(row.id);
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>

      {/* 1: Status (dropdown) */}
      <Cell className={hc(1)}>
        {isEditing ? selectStatus : statusLabelById(row.signatureStatusId)}
      </Cell>

      {/* 2: Employee (dropdown) */}
      <Cell className={hc(2)}>
        {isEditing ? selectEmployee : employeeLabelById(row.employeeId)}
      </Cell>

      {/* 3: Payment Order (dropdown filtered by project) */}
      <Cell className={hc(3)}>
        {isEditing ? selectPO : row.paymentOrderId ?? "-"}
      </Cell>

      {/* 4: Signature (string) */}
      <Cell className={hc(4)}>
        {isEditing ? inputText("signature") : row.signature ?? "-"}
      </Cell>

      {/* 5: Date */}
      <Cell className={hc(5)}>
        {isEditing
          ? inputDate
          : row.signatureDate
          ? new Date(row.signatureDate).toLocaleString()
          : "-"}
      </Cell>
    </div>
  );
};

export default SignatureRow;
