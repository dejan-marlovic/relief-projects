// CostDetails.js
import CostDetail from "./CostDetail/CostDetail"; // Adjust path if needed
import React, { useEffect, useState } from "react";

const CostDetails = ({ costDetails }) => {
  const [costTypes, setCostTypes] = useState([]);

  useEffect(() => {
    const fetchCostTypes = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          "http://localhost:8080/api/cost-types/active",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch cost types");
        const data = await response.json();
        setCostTypes(data);
      } catch (error) {
        console.error("Error fetching cost types:", error);
      }
    };

    fetchCostTypes();
  }, []);

  return (
    <div>
      <h4>Cost Details</h4>
      {costDetails.map((cost) => {
        const costType = costTypes.find((type) => type.id === cost.costTypeId); // match by ID
        return (
          <CostDetail key={cost.costDetailId} cost={cost} costType={costType} />
        );
      })}
    </div>
  );
};

export default CostDetails;
