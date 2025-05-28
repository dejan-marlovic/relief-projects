import React, { useEffect, useState } from "react";
import CostDetail from "./CostDetail/CostDetail";

const CostDetails = ({ costDetails }) => {
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);

  useEffect(() => {
    const fetchCostTypes = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          "http://localhost:8080/api/cost-types/active",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch cost types");
        const data = await response.json();
        setCostTypes(data);
      } catch (error) {
        console.error("Error fetching cost types:", error);
      }
    };

    const fetchCosts = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch("http://localhost:8080/api/costs/active", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch costs");
        const data = await response.json();
        setCosts(data);
      } catch (error) {
        console.error("Error fetching costs:", error);
      }
    };

    fetchCostTypes();
    fetchCosts();
  }, []);

  const groupCosts = () => {
    const grouped = {};

    costDetails.forEach((cost) => {
      const typeId = cost.costTypeId;
      const costId = cost.costId;

      if (!grouped[typeId]) {
        grouped[typeId] = {};
      }

      if (!grouped[typeId][costId]) {
        grouped[typeId][costId] = [];
      }

      grouped[typeId][costId].push(cost);
    });

    return grouped;
  };

  const groupedData = groupCosts();

  return (
    <div>
      <h4>Cost Details</h4>

      {Object.entries(groupedData).map(([typeId, costGroups]) => {
        const type = costTypes.find((t) => t.id === parseInt(typeId));
        return (
          <div key={typeId} style={{ marginBottom: "24px" }}>
            <h5
              style={{ borderBottom: "2px solid #333", paddingBottom: "4px" }}
            >
              {type?.costTypeName || "Unknown Type"}
            </h5>

            {Object.entries(costGroups).map(([costId, items]) => {
              const category = costs.find((c) => c.id === parseInt(costId));
              return (
                <div
                  key={costId}
                  style={{ marginLeft: "16px", marginBottom: "16px" }}
                >
                  <h6
                    style={{
                      borderBottom: "1px dashed #aaa",
                      paddingBottom: "2px",
                    }}
                  >
                    {category?.costName || "Unknown Category"}
                  </h6>

                  {items.map((cost) => (
                    <CostDetail
                      key={cost.costDetailId}
                      cost={cost}
                      costType={type}
                      costCategory={category}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default CostDetails;
