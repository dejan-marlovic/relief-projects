import React from "react";

const CostDetail = ({
  cost,
  costType,
  costCategory,
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
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
        gap: "16px",
        fontSize: "14px",
      }}
    >
      <div style={{ flex: "1 1 150px" }}>
        <strong>{cost.costDescription}</strong>
      </div>

      <div style={{ flex: "1 1 120px", color: "#666" }}>
        {costType?.costTypeName || "-"}
      </div>

      <div style={{ flex: "1 1 150px", color: "#888" }}>
        {costCategory ? `Category: ${costCategory.costName}` : "-"}
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
        )}
      </div>
    </div>
  );
};

export default CostDetail;
