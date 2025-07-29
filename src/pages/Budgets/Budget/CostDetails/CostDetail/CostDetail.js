import React from "react";
import styles from "./CostDetail.module.scss";
import { FiEdit, FiTrash2 } from "react-icons/fi";

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
  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className={styles.costDetailContainer}>
      <div className={styles.description}>
        <strong>{cost.costDescription}</strong>
      </div>

      <div className={styles.costType}>
        {isEditing ? (
          <select
            value={editedValues.costTypeId ?? cost.costTypeId}
            onChange={(e) => onChange("costTypeId", Number(e.target.value))}
            onBlur={handleSubmit}
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

      <div className={styles.costCategory}>
        {isEditing ? (
          <select
            value={editedValues.costId ?? cost.costId}
            onChange={(e) => onChange("costId", Number(e.target.value))}
            onBlur={handleSubmit}
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

      <div className={styles.costCalculation}>
        {isEditing ? (
          <form
            id={`cost-detail-form-${cost.costDetailId}`}
            onSubmit={handleSubmit}
          >
            <input
              type="number"
              value={editedValues.noOfUnits ?? cost.noOfUnits}
              onChange={(e) => onChange("noOfUnits", Number(e.target.value))}
              onBlur={handleSubmit}
              className={styles.numberInput}
            />
            ×
            <input
              type="number"
              value={editedValues.unitPrice ?? cost.unitPrice}
              onChange={(e) => onChange("unitPrice", Number(e.target.value))}
              onBlur={handleSubmit}
              className={styles.priceInput}
            />
          </form>
        ) : (
          `${cost.noOfUnits} × ${cost.unitPrice}`
        )}
      </div>

      <div className={styles.percentage}>{cost.percentageCharging}%</div>

      <div className={styles.amounts}>
        Local: {cost.amountLocalCurrency} | GBP: {cost.amountGBP} | EUR:{" "}
        {cost.amountEuro}
      </div>

      <div className={styles.buttonGroup}>
        {isEditing ? (
          <>
            <button
              type="submit"
              form={`cost-detail-form-${cost.costDetailId}`}
              className={styles.button}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.button}
            >
              Cancel
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
              className={styles.iconButton}
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
              className={`${styles.iconButton} ${styles.deleteIcon}`}
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
