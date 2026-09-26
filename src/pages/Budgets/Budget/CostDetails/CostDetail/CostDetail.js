import React from "react";
import styles from "./CostDetail.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

// Display only: remove insignificant zeros without converting exact decimals to Number.
const displayInput = (value) => value == null ? "-" : String(value).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

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
  busy = false,
}) => {
  const ev = editedValues || {};
  const selectedCostTypeId = ev.costTypeId ?? cost.costTypeId ?? "";
  const compatibleCosts = costs.filter(
    (candidate) =>
      selectedCostTypeId !== "" &&
      Number(candidate.costTypeId) === Number(selectedCostTypeId),
  );

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));
  const fieldLabels = { costDescription: "Description", costTypeId: "Type", costId: "Category", noOfUnits: "Units", frequencyMonths: "Periods", unitPrice: "Unit price", percentageCharging: "Allocated %", amountLocalCurrency: "Local", amountReportingCurrency: "Reporting", amountGBP: "GBP", amountEuro: "EUR" };
  const renderField = (name, control) => (
    <div className={styles.cell}>
      <span className={styles.fieldLabel}>{fieldLabels[name]}</span>
      {React.cloneElement(control, {
        className: `${control.props.className || ""} ${
          fieldErrors[name] ? styles.inputError : ""
        }`,
        "aria-label": control.props.placeholder || name,
        disabled: busy,
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
          value={selectedCostTypeId}
          onChange={(e) => {
            onChange("costTypeId", toNum(e.target.value));
            onChange("costId", "");
          }}
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
          {compatibleCosts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.costName}
            </option>
          ))}
        </select>)}

        {renderField("noOfUnits", <input
          type="number"
          min="0.000000000001" step="any"
          value={ev.noOfUnits ?? cost.noOfUnits ?? ""}
          onChange={(e) => onChange("noOfUnits", e.target.value)}
          className={styles.input}
          placeholder="Units"
        />)}

        {renderField("frequencyMonths", <input type="number" min="1" step="1" value={ev.frequencyMonths ?? cost.frequencyMonths ?? ""} onChange={(e) => onChange("frequencyMonths", e.target.value)} className={styles.input} placeholder="Periods" title="Number of periods; 1 for a one-off cost" />)}
        {renderField("unitPrice", <input
          type="number"
          min="0" step="any"
          value={ev.unitPrice ?? cost.unitPrice ?? ""}
          onChange={(e) => onChange("unitPrice", e.target.value)}
          className={styles.input}
          placeholder="Price"
        />)}

        {renderField("percentageCharging", <input
          type="number"
          step="any"
          value={ev.percentageCharging ?? cost.percentageCharging ?? ""}
          onChange={(e) =>
            onChange("percentageCharging", e.target.value)
          }
          className={styles.input}
          placeholder="Allocated %" min="0" max="100"
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
          readOnly
          className={styles.input}
          placeholder="Reporting"
        />)}

        {renderField("amountGBP", <input
          type="number"
          step="0.001"
          value={ev.amountGBP ?? cost.amountGBP ?? ""}
          readOnly
          className={styles.input}
          placeholder="GBP"
        />)}

        {renderField("amountEuro", <input
          type="number"
          step="0.001"
          value={ev.amountEuro ?? cost.amountEuro ?? ""}
          readOnly
          className={styles.input}
          placeholder="EUR"
        />)}

        <div className={`${styles.actions} ${styles.cellActions}`}>
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveClick}
            className={styles.actionBtn}
            title="Save"
          >
            <FiSave /><span className={styles.actionLabel}>Save</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={`${styles.actionBtn} ${styles.danger}`}
            title="Cancel"
          >
            <FiX /><span className={styles.actionLabel}>Cancel</span>
          </button>
        </div>
      </div>
    );
  }

  // view mode
  const displayCost = cost;

  return (
    <div className={styles.viewRow}>
      <div className={styles.vcell}><span className={styles.fieldLabel}>Description</span>
        <strong>{displayCost.costDescription}</strong>
      </div>

      <div className={styles.vcell}><span className={styles.fieldLabel}>Type</span>
        {costTypes.find((t) => t.id === displayCost.costTypeId)?.costTypeName ||
          "-"}
      </div>

      <div className={styles.vcell}><span className={styles.fieldLabel}>Category</span>
        {costs.find((c) => c.id === displayCost.costId)?.costName || "-"}
      </div>

      <div className={styles.vcell}><span className={styles.fieldLabel}>Units</span>{displayInput(displayCost.noOfUnits)}</div>
      <div className={styles.vcell}><span className={styles.fieldLabel}>Periods</span>{displayCost.frequencyMonths ?? "-"}</div>
      <div className={styles.vcell}><span className={styles.fieldLabel}>Unit price</span>{displayInput(displayCost.unitPrice)}</div>
      <div className={styles.vcell}><span className={styles.fieldLabel}>Allocated %</span>
        {displayInput(displayCost.percentageCharging)}%
      </div>

      <div className={styles.vcell}><span className={styles.fieldLabel}>Local</span>
        {displayCost.amountLocalCurrency ?? "-"}
      </div>
      <div className={styles.vcell}><span className={styles.fieldLabel}>Reporting</span>
        {displayCost.amountReportingCurrency ?? "-"}
      </div>
      <div className={styles.vcell}><span className={styles.fieldLabel}>GBP</span>{displayCost.amountGBP ?? "-"}</div>
      <div className={styles.vcell}><span className={styles.fieldLabel}>EUR</span>{displayCost.amountEuro ?? "-"}</div>

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
          <FiEdit /><span className={styles.actionLabel}>Edit</span>
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
          <FiTrash2 /><span className={styles.actionLabel}>Delete</span>
        </button>}
      </div>
    </div>
  );
};

export default CostDetail;
