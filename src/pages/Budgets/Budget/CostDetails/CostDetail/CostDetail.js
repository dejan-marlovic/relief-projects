// CostDetail.js
const CostDetail = ({ cost }) => {
  return (
    <div
      style={{ border: "1px solid #ccc", padding: "8px", marginBottom: "8px" }}
    >
      <strong>{cost.costDescription}</strong>
      <br />
      Units: {cost.noOfUnits} × {cost.unitPrice}
      <br />
      Charged: {cost.percentageCharging}%<br />
      Local: {cost.amountLocalCurrency} | GBP: {cost.amountGBP} | EUR:{" "}
      {cost.amountEURO}
    </div>
  );
};

export default CostDetail;
