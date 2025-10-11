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
}) => {
  const ev = editedValues || {};
  const isCreate = (cost.costDetailId ?? "") === "new";
  const autoSave = isEditing && !isCreate; // only auto-save on blur for existing rows
  const formId = `cost-detail-form-${cost.costDetailId || "new"}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  // keep empty string as "" (not 0), otherwise cast to Number
  const toNum = (v) => (v === "" ? "" : Number(v));

  return (
    <div className={styles.costDetailContainer}>
      {/* Description */}
      <div className={styles.description}>
        {isEditing ? (
          <input
            type="text"
            value={ev.costDescription ?? cost.costDescription ?? ""}
            onChange={(e) => onChange("costDescription", e.target.value)}
            onBlur={autoSave ? handleSubmit : undefined}
            className={styles.textInput}
            placeholder="Description"
          />
        ) : (
          <strong>{cost.costDescription}</strong>
        )}
      </div>

      {/* Type */}
      <div className={styles.costType}>
        {isEditing ? (
          <select
            value={ev.costTypeId ?? cost.costTypeId ?? ""}
            onChange={(e) => onChange("costTypeId", toNum(e.target.value))}
            onBlur={autoSave ? handleSubmit : undefined}
            className={styles.selectInput}
          >
            <option value="">Select Type</option>
            {costTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.costTypeName}
              </option>
            ))}
          </select>
        ) : (
          costTypes.find((t) => t.id === cost.costTypeId)?.costTypeName || "-"
        )}
      </div>

      {/* Category */}
      <div className={styles.costCategory}>
        {isEditing ? (
          <select
            value={ev.costId ?? cost.costId ?? ""}
            onChange={(e) => onChange("costId", toNum(e.target.value))}
            onBlur={autoSave ? handleSubmit : undefined}
            className={styles.categorySelectInput}
          >
            <option value="">Select Category</option>
            {costs.map((costItem) => (
              <option key={costItem.id} value={costItem.id}>
                {costItem.costName}
              </option>
            ))}
          </select>
        ) : (
          costs.find((c) => c.id === cost.costId)?.costName || "-"
        )}
      </div>

      {/* Units × Price */}
      <div className={styles.costCalculation}>
        {isEditing ? (
          <form id={formId} onSubmit={handleSubmit}>
            <input
              type="number"
              value={ev.noOfUnits ?? cost.noOfUnits ?? ""}
              onChange={(e) => onChange("noOfUnits", toNum(e.target.value))}
              onBlur={autoSave ? handleSubmit : undefined}
              className={styles.numberInput}
              placeholder="Units"
            />
            ×
            <input
              type="number"
              value={ev.unitPrice ?? cost.unitPrice ?? ""}
              onChange={(e) => onChange("unitPrice", toNum(e.target.value))}
              onBlur={autoSave ? handleSubmit : undefined}
              className={styles.priceInput}
              placeholder="Unit price"
            />
          </form>
        ) : (
          `${cost.noOfUnits} × ${cost.unitPrice}`
        )}
      </div>

      {/* % Charged */}
      <div className={styles.percentage}>
        {isEditing ? (
          <input
            type="number"
            value={ev.percentageCharging ?? cost.percentageCharging ?? ""}
            onChange={(e) =>
              onChange("percentageCharging", toNum(e.target.value))
            }
            onBlur={autoSave ? handleSubmit : undefined}
            className={styles.numberInput}
            placeholder="%"
          />
        ) : (
          `${cost.percentageCharging}%`
        )}
      </div>

      {/* Amounts (display-only) */}
      <div className={styles.amounts}>
        Local: {cost.amountLocalCurrency ?? "-"} | GBP: {cost.amountGBP ?? "-"}{" "}
        | EUR: {cost.amountEuro ?? "-"}
      </div>

      {/* Actions (icons, same as Transactions) */}
      <div className={styles.actions}>
        {isEditing ? (
          <>
            <button
              type="submit"
              form={formId}
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
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              className={styles.actionBtn}
              title="Edit"
            >
              <FiEdit />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(cost.costDetailId);
              }}
              className={`${styles.actionBtn} ${styles.danger}`}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CostDetail;
