import React from "react";
import styles from "./CostDetail.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const CostDetail = ({
  cost,
  costType,
  costCategory,
  costTypes,
  costs,
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  canEdit = false,
  canDelete = false,
  fieldErrors = {},
}) => {
  const ev = editedValues || {};

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));
  const renderField = (name, control) => (
    <div className={styles.cell}>
      {React.cloneElement(control, {
        className: `${control.props.className || ""} ${
          fieldErrors[name] ? styles.inputError : ""
        }`,
        "aria-invalid": Boolean(fieldErrors[name]),
        "aria-describedby": fieldErrors[name]
          ? `cost-detail-${cost.costDetailId}-${name}-error`
          : undefined,
      })}
      {fieldErrors[name] && (
        <div
          id={`cost-detail-${cost.costDetailId}-${name}-error`}
          className={styles.fieldError}
        >
          {fieldErrors[name]}
        </div>
      )}
    </div>
  );

  if (isEditing) {
    // single-row create/edit form
    return (
      <div className={styles.rowForm}>
        {renderField("costDescription", <input
          type="text"
          value={ev.costDescription ?? cost.costDescription ?? ""}
          onChange={(e) => onChange("costDescription", e.target.value)}
          className={styles.input}
          placeholder="Description"
        />)}

        {renderField("costTypeId", <select
          value={ev.costTypeId ?? cost.costTypeId ?? ""}
          onChange={(e) => onChange("costTypeId", toNum(e.target.value))}
          className={styles.select}
        >
          <option value="">Type</option>
          {costTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.costTypeName}
            </option>
          ))}
        </select>)}

        {renderField("costId", <select
          value={ev.costId ?? cost.costId ?? ""}
          onChange={(e) => onChange("costId", toNum(e.target.value))}
          className={styles.select}
        >
          <option value="">Category</option>
          {costs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.costName}
            </option>
          ))}
        </select>)}

        {renderField("noOfUnits", <input
          type="number"
          step="0.001"
          value={ev.noOfUnits ?? cost.noOfUnits ?? ""}
          onChange={(e) => onChange("noOfUnits", toNum(e.target.value))}
          className={styles.input}
          placeholder="Units"
        />)}

        {renderField("unitPrice", <input
          type="number"
          step="0.001"
          value={ev.unitPrice ?? cost.unitPrice ?? ""}
          onChange={(e) => onChange("unitPrice", toNum(e.target.value))}
          className={styles.input}
          placeholder="Price"
        />)}

        {renderField("percentageCharging", <input
          type="number"
          step="0.001"
          value={ev.percentageCharging ?? cost.percentageCharging ?? ""}
          onChange={(e) =>
            onChange("percentageCharging", toNum(e.target.value))
          }
          className={styles.input}
          placeholder="%"
        />)}

        {/* Local amount calculated; read-only */}
        {renderField("amountLocalCurrency", <input
          type="number"
          step="0.001"
          value={ev.amountLocalCurrency ?? cost.amountLocalCurrency ?? ""}
          readOnly
          className={styles.input}
          placeholder="Local"
        />)}

        {/* SEK amount */}
        {renderField("amountReportingCurrency", <input
          type="number"
          step="0.001"
          value={
            ev.amountReportingCurrency ?? cost.amountReportingCurrency ?? ""
          }
          onChange={(e) =>
            onChange("amountReportingCurrency", toNum(e.target.value))
          }
          className={styles.input}
          placeholder="SEK"
        />)}

        {renderField("amountGBP", <input
          type="number"
          step="0.001"
          value={ev.amountGBP ?? cost.amountGBP ?? ""}
          onChange={(e) => onChange("amountGBP", toNum(e.target.value))}
          className={styles.input}
          placeholder="GBP"
        />)}

        {renderField("amountEuro", <input
          type="number"
          step="0.001"
          value={ev.amountEuro ?? cost.amountEuro ?? ""}
          onChange={(e) => onChange("amountEuro", toNum(e.target.value))}
          className={styles.input}
          placeholder="EUR"
        />)}

        <div className={`${styles.actions} ${styles.cellActions}`}>
          <button
            type="button"
            onClick={handleSaveClick}
            className={styles.actionBtn}
            title="Save"
          >
            <FiSave />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`${styles.actionBtn} ${styles.danger}`}
            title="Cancel"
          >
            <FiX />
          </button>
        </div>
      </div>
    );
  }

  // view mode
  const displayCost = cost;

  return (
    <div className={styles.viewRow}>
      <div className={styles.vcell}>
        <strong>{displayCost.costDescription}</strong>
      </div>

      <div className={styles.vcell}>
        {costTypes.find((t) => t.id === displayCost.costTypeId)?.costTypeName ||
          "-"}
      </div>

      <div className={styles.vcell}>
        {costs.find((c) => c.id === displayCost.costId)?.costName || "-"}
      </div>

      <div className={styles.vcell}>{displayCost.noOfUnits ?? "-"}</div>
      <div className={styles.vcell}>{displayCost.unitPrice ?? "-"}</div>
      <div className={styles.vcell}>
        {displayCost.percentageCharging ?? "-"}%
      </div>

      <div className={styles.vcell}>
        {displayCost.amountLocalCurrency ?? "-"}
      </div>
      <div className={styles.vcell}>
        {displayCost.amountReportingCurrency ?? "-"}
      </div>
      <div className={styles.vcell}>{displayCost.amountGBP ?? "-"}</div>
      <div className={styles.vcell}>{displayCost.amountEuro ?? "-"}</div>

      <div className={styles.vcell}>
        {canEdit && <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className={styles.actionBtn}
          title="Edit"
        >
          <FiEdit />
        </button>}
        {canDelete && <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(displayCost.costDetailId);
          }}
          className={`${styles.actionBtn} ${styles.danger}`}
          title="Delete"
        >
          <FiTrash2 />
        </button>}
      </div>
    </div>
  );
};

export default CostDetail;
