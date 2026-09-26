import React from "react";
import styles from "./Signature.module.scss";
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

/**
 * Renders one signature row and receives selection state from the parent.
 * The parent controls whether the row is selected, how selection changes,
 * and whether selection should be disabled while the row is being edited.
 */
const SignatureRow = ({
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
  poOptions = [],
  statusOptions = [],
  employeeOptions = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {},
  rowRef = null,
  canManage = false,
  canEdit = canManage,
  canDelete = canManage,
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

  // ==== error helpers ====
  const getFieldError = (name) => fieldErrors?.[name];
  const hasError = (name) => Boolean(getFieldError(name));
  const inputClass = (name) =>
    `${styles.input} ${hasError(name) ? styles.inputError : ""}`;

  const FieldError = ({ name }) =>
    hasError(name) ? (
      <div id={`signature-${row.id}-${name}-error`} className={styles.fieldError}>{getFieldError(name)}</div>
    ) : null;

  const fieldAccessibility = (name, label) => ({
    "aria-label": label,
    "aria-invalid": hasError(name),
    "aria-describedby": hasError(name) ? `signature-${row.id}-${name}-error` : undefined,
    disabled: saving,
  });

  const inputText = (field) => (
    <>
      <input
        {...fieldAccessibility(field, "Signature")}
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
        {...fieldAccessibility("paymentOrderId", "Payment order")}
        value={
          ev.paymentOrderId ??
          (row.paymentOrderId != null ? String(row.paymentOrderId) : "")
        }
        onChange={(e) => onChange("paymentOrderId", e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("paymentOrderId")}
      >
        <option value="">(none)</option>
        {poOptions.map((po) => (
          <option key={po.id} value={String(po.id)}>
            {`PO#${po.id}`}
          </option>
        ))}
      </select>
      <FieldError name="paymentOrderId" />
    </>
  );

  const selectStatus = (
    <>
      <select
        {...fieldAccessibility("signatureStatusId", "Status")}
        value={
          ev.signatureStatusId ??
          (row.signatureStatusId != null ? String(row.signatureStatusId) : "")
        }
        onChange={(e) => onChange("signatureStatusId", e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("signatureStatusId")}
      >
        <option value="">(none)</option>
        {statusOptions.map((s) => (
          <option key={s.id} value={String(s.id)}>
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
        {...fieldAccessibility("employeeId", "Employee")}
        value={
          ev.employeeId ??
          (row.employeeId != null ? String(row.employeeId) : "")
        }
        onChange={(e) => onChange("employeeId", e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("employeeId")}
      >
        <option value="">(none)</option>
        {employeeOptions.map((e) => (
          <option key={e.id} value={String(e.id)}>
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
        {...fieldAccessibility("signatureDate", "Signature date")}
        type="datetime-local"
        value={toDateTimeLocal(ev.signatureDate ?? row.signatureDate)}
        onChange={(e) =>
          onChange(
            "signatureDate",
            e.target.value ? new Date(e.target.value).toISOString() : "",
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
    return hit ? hit.label : (id ?? "-");
  };

  const employeeLabelById = (id) => {
    const hit = employeeOptions.find((e) => String(e.id) === String(id));
    return hit ? hit.label : (id ?? "-");
  };

  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  const actionCell = (
      <Cell className={compact ? styles.cardActions : `${styles.stickyCol} ${hc(0)}`}>
        {isEditing ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconCircleBtn}
              disabled={saving}
              onClick={submit}
              title="Save"
              aria-label="Save"
            >
              <FiSave />{compact && <span>{saving ? "Saving…" : "Save"}</span>}
            </button>

            <button
              type="button"
              className={styles.dangerIconBtn}
              disabled={saving}
              onClick={onCancel}
              title="Cancel"
              aria-label="Cancel"
            >
              <FiX />{compact && <span>Cancel</span>}
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            {!isCreate && (
              <input
                type="checkbox"
                //The row itself does not decide if it is checked. The parent decides by passing:
                //isSelected={selectedSignatureIds.has(s.id)}
                checked={isSelected}
                //This disables the checkbox when the parent says selection should be disabled.
                //the parent sends: selectionDisabled={editingId === s.id}
                disabled={selectionDisabled}
                onChange={(e) => {
                  e.stopPropagation();
                  //This calls the function passed from the parent.
                  onSelectChange?.(row.id, e.target.checked);
                }}
                //Stop this event here. Do not let it bubble up to parent elements.
                /*
                1. Browser fires click/change event.
                2. stopPropagation prevents the event from triggering parent row click handlers.
                3. e.target.checked tells us whether the checkbox is now checked.
                4. onSelectChange(row.id, checked) calls the parent function.
                5. Parent updates selectedSignatureIds.
                6. Parent re-renders the row with updated isSelected.
                7. Checkbox shows the correct checked/unchecked state.

                So this checkbox is controlled by the parent, but the row is responsible for reporting:

                My checkbox changed.
                Here is my row ID.
                Here is the new checked value.
                */
                onClick={(e) => e.stopPropagation()}
                title="Select signature"
                aria-label={`Select signature ${row.id}`}
                className={styles.rowCheckbox}
              ></input>
            )}
            {canEdit && (
              <button
                type="button"
                className={styles.iconCircleBtn}
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit"
                aria-label="Edit"
              >
                <FiEdit />{compact && <span>Edit</span>}
              </button>
            )}

            {!isCreate && canDelete && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDanger} ${styles.iconOnlyBtn}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(row.id);
                }}
                disabled={saving}
                title="Delete"
                aria-label="Delete signature"
              >
                <FiTrash2 />{compact && <span>Delete</span>}
              </button>
            )}
          </div>
        )}
      </Cell>

  );

  if (compact) return (
    <section ref={rowRef || undefined} className={styles.compactCard} aria-label={isCreate ? "New signature" : `Signature ${row.id}`}>
      <div className={styles.cardTitle}>{isCreate ? "New signature" : `Signature #${row.id}`}</div>
      <div className={styles.cardSummary}>
        <div><span className={styles.fieldLabel}>Status</span>{isEditing ? selectStatus : statusLabelById(row.signatureStatusId)}</div>
        <div><span className={styles.fieldLabel}>Employee</span>{isEditing ? selectEmployee : employeeLabelById(row.employeeId)}</div>
        <div><span className={styles.fieldLabel}>Payment order</span>{isEditing ? selectPO : (row.paymentOrderId != null ? `PO#${row.paymentOrderId}` : "-")}</div>
      </div>
      <details className={styles.cardDetails} open={isEditing ? true : undefined}>
        <summary>Signature details</summary>
        <div className={styles.detailFields}>
          <div><span className={styles.fieldLabel}>Signature</span>{isEditing ? inputText("signature") : (row.signature || "-")}</div>
          <div><span className={styles.fieldLabel}>Date</span>{isEditing ? inputDate : row.signatureDate ? new Date(row.signatureDate).toLocaleString() : "-"}</div>
        </div>
      </details>
      {actionCell}
    </section>
  );

  return (
    <div
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
    >
      {actionCell}

      {/* 1: Status */}
      <Cell className={hc(1)}>
        {isEditing ? selectStatus : statusLabelById(row.signatureStatusId)}
      </Cell>

      {/* 2: Employee */}
      <Cell className={hc(2)}>
        {isEditing ? selectEmployee : employeeLabelById(row.employeeId)}
      </Cell>

      {/* 3: Payment Order */}
      <Cell className={hc(3)}>
        {isEditing ? selectPO : (row.paymentOrderId ?? "-")}
      </Cell>

      {/* 4: Signature */}
      <Cell className={hc(4)}>
        {isEditing ? inputText("signature") : (row.signature ?? "-")}
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
