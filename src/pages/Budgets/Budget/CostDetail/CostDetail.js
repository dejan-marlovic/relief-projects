const CostDetail = ({ costDetails }) => {
  return (
    <div>
      <h4>Cost Details</h4>
      <ul>
        {costDetails.map((cost) => (
          <li key={cost.costDetailId}>
            {cost.costDescription} – {cost.amountLocalCurrency} {cost.unitPrice}{" "}
            x {cost.noOfUnits}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CostDetail;
