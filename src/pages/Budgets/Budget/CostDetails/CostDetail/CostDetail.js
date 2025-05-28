// CostDetail.js
const CostDetail = ({ cost, costType }) => {
  return (
    <div
      style={{ border: "1px solid #ccc", padding: "8px", marginBottom: "8px" }}
    >
      <strong>{cost.costDescription}</strong>
      {costType && (
        <div style={{ fontStyle: "italic", color: "#666" }}>
          {costType.costTypeName}
        </div>
      )}
      <div>
        Units: {cost.noOfUnits} × {cost.unitPrice}
      </div>
      <div>Charged: {cost.percentageCharging}%</div>
      <div>
        Local: {cost.amountLocalCurrency} | GBP: {cost.amountGBP} | EUR:{" "}
        {cost.amountEURO}
      </div>
    </div>
  );
};

export default CostDetail;
