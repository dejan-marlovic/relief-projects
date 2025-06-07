import React from "react";

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
    console.log("Submitting form for cost:", cost.costDetailId);
    onSave();
  };

  const handleCancel = () => {
    console.log("Canceling edit for cost:", cost.costDetailId);
    onCancel();
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        borderBottom: "1px solid #ccc",
        padding: "8px 0",
        gap: "14px",
        fontSize: "16px",
      }}
    >
      <div style={{ flex: "1 1 150px" }}>
        <strong style={{ fontWeight: 650 }}>{cost.costDescription}</strong>
      </div>

      <div style={{ flex: "1 1 120px", color: "#666" }}>
        {isEditing ? (
          <select
            value={editedValues.costTypeId ?? cost.costTypeId}
            onChange={(e) => onChange("costTypeId", Number(e.target.value))}
            onBlur={handleSubmit}
            style={{ width: "100px" }}
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

      <div style={{ flex: "1 1 150px", color: "#888" }}>
        {isEditing ? (
          <select
            value={editedValues.costId ?? cost.costId}
            onChange={(e) => onChange("costId", Number(e.target.value))}
            onBlur={handleSubmit}
            style={{ width: "120px" }}
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

      <div style={{ flex: "1 1 100px" }}>
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
              style={{ width: "40px" }}
            />
            ×
            <input
              type="number"
              value={editedValues.unitPrice ?? cost.unitPrice}
              onChange={(e) => onChange("unitPrice", Number(e.target.value))}
              onBlur={handleSubmit}
              style={{ width: "60px" }}
            />
          </form>
        ) : (
          `${cost.noOfUnits} × ${cost.unitPrice}`
        )}
      </div>

      <div style={{ flex: "1 1 80px" }}>{cost.percentageCharging}%</div>

      <div style={{ flex: "1 1 200px" }}>
        Local: {cost.amountLocalCurrency} | GBP: {cost.amountGBP} | EUR:{" "}
        {cost.amountEuro}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        {isEditing ? (
          <>
            <button
              type="submit"
              form={`cost-detail-form-${cost.costDetailId}`}
              style={{ padding: "4px 8px" }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{ padding: "4px 8px" }}
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
              style={{ padding: "4px 8px" }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(cost.costDetailId);
              }}
              style={{
                padding: "4px 8px",
                backgroundColor: "#e74c3c",
                color: "#fff",
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CostDetail;
