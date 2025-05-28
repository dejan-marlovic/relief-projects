const CostDetail = ({ cost, costType, costCategory }) => {
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
        {cost.noOfUnits} × {cost.unitPrice}
      </div>
      <div style={{ flex: "1 1 80px" }}>{cost.percentageCharging}%</div>
      <div style={{ flex: "1 1 200px" }}>
        Local: {cost.amountLocalCurrency} | GBP: {cost.amountGBP} | EUR:{" "}
        {cost.amountEURO}
      </div>
    </div>
  );
};

export default CostDetail;
