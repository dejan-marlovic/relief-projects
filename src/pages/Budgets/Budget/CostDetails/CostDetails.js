// CostDetails.js
import CostDetail from "./CostDetail/CostDetail"; // Adjust path if needed

const CostDetails = ({ costDetails }) => {
  return (
    <div>
      <h4>Cost Details</h4>
      {costDetails.map((cost) => (
        <CostDetail key={cost.costDetailId} cost={cost} />
      ))}
    </div>
  );
};

export default CostDetails;
