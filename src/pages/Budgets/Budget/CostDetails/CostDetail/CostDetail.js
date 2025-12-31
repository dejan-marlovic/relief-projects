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
  const autoSave = isEditing && !isCreate;
  const formId = `cost-detail-form-${cost.costDetailId || "new"}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

  if (isEditing) {
    // single-row create/edit form
    return (
      <form id={formId} onSubmit={handleSubmit} className={styles.rowForm}>
        <input
          type="text"
          value={ev.costDescription ?? cost.costDescription ?? ""}
          onChange={(e) => onChange("costDescription", e.target.value)}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="Description"
        />

        <select
          value={ev.costTypeId ?? cost.costTypeId ?? ""}
          onChange={(e) => onChange("costTypeId", toNum(e.target.value))}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.select} ${styles.cell}`}
        >
          <option value="">Type</option>
          {costTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.costTypeName}
            </option>
          ))}
        </select>

        <select
          value={ev.costId ?? cost.costId ?? ""}
          onChange={(e) => onChange("costId", toNum(e.target.value))}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.select} ${styles.cell}`}
        >
          <option value="">Category</option>
          {costs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.costName}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.001"
          value={ev.noOfUnits ?? cost.noOfUnits ?? ""}
          onChange={(e) => onChange("noOfUnits", toNum(e.target.value))}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="Units"
        />

        <input
          type="number"
          step="0.001"
          value={ev.unitPrice ?? cost.unitPrice ?? ""}
          onChange={(e) => onChange("unitPrice", toNum(e.target.value))}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="Price"
        />

        <input
          type="number"
          step="0.001"
          value={ev.percentageCharging ?? cost.percentageCharging ?? ""}
          onChange={(e) =>
            onChange("percentageCharging", toNum(e.target.value))
          }
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="%"
        />

        {/* Local amount calculated; read-only */}
        <input
          type="number"
          step="0.001"
          value={ev.amountLocalCurrency ?? cost.amountLocalCurrency ?? ""}
          readOnly
          className={`${styles.input} ${styles.cell}`}
          placeholder="Local"
        />

        {/* SEK amount */}
        <input
          type="number"
          step="0.001"
          value={
            ev.amountReportingCurrency ?? cost.amountReportingCurrency ?? ""
          }
          onChange={(e) =>
            onChange("amountReportingCurrency", toNum(e.target.value))
          }
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="SEK"
        />

        <input
          type="number"
          step="0.001"
          value={ev.amountGBP ?? cost.amountGBP ?? ""}
          onChange={(e) => onChange("amountGBP", toNum(e.target.value))}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="GBP"
        />

        <input
          type="number"
          step="0.001"
          value={ev.amountEuro ?? cost.amountEuro ?? ""}
          onChange={(e) => onChange("amountEuro", toNum(e.target.value))}
          onBlur={autoSave ? handleSubmit : undefined}
          className={`${styles.input} ${styles.cell}`}
          placeholder="EUR"
        />

        <div className={`${styles.actions} ${styles.cellActions}`}>
          <button type="submit" className={styles.actionBtn} title="Save">
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
      </form>
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
            onDelete(displayCost.costDetailId);
          }}
          className={`${styles.actionBtn} ${styles.danger}`}
          title="Delete"
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
};

export default CostDetail;
