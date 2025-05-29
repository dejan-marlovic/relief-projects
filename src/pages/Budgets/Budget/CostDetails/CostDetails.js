import React, { useEffect, useState } from "react";
import CostDetail from "./CostDetail/CostDetail";

const CostDetails = ({ costDetails: initialCostDetails = [] }) => {
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [localCosts, setLocalCosts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  useEffect(() => {
    setLocalCosts(initialCostDetails || []);
  }, [initialCostDetails]);

  const handleEdit = (cost) => {
    console.log("Entering edit mode for cost:", cost.costDetailId);
    setEditingId(cost.costDetailId);
    setEditedValues((prev) => ({
      ...prev,
      [cost.costDetailId]: {
        noOfUnits: cost.noOfUnits,
        unitPrice: cost.unitPrice,
        costTypeId: cost.costTypeId,
        costId: cost.costId,
      },
    }));
  };

  const handleChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: value,
      },
    }));
  };

  const handleSave = (costId) => {
    console.log("Saving cost:", costId, editedValues[costId]);
    const values = editedValues[costId];
    if (
      values &&
      values.noOfUnits != null &&
      values.unitPrice != null &&
      values.costTypeId != null &&
      values.costId != null
    ) {
      setLocalCosts((prev) =>
        prev.map((cost) =>
          cost.costDetailId === costId ? { ...cost, ...values } : cost
        )
      );
      setEditingId(null);
      setEditedValues((prev) => {
        const newValues = { ...prev };
        delete newValues[costId];
        return newValues;
      });
    } else {
      console.warn("Invalid values, not saving:", values);
    }
  };

  const handleCancel = () => {
    console.log("Canceling edit for cost:", editingId);
    setEditingId(null);
    setEditedValues({});
  };

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
    localCosts.forEach((cost) => {
      const typeId = cost.costTypeId;
      const costId = cost.costId;
      if (!grouped[typeId]) grouped[typeId] = {};
      if (!grouped[typeId][costId]) grouped[typeId][costId] = [];
      grouped[typeId][costId].push(cost);
    });
    return grouped;
  };

  const groupedData = groupCosts();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    console.log("Prevented parent form submission");
  };

  const handleClick = (e) => {
    e.stopPropagation();
    console.log("Click event in CostDetails:", e.target);
  };

  return (
    <div onSubmit={handleFormSubmit} onClick={handleClick}>
      <div
        style={{
          fontWeight: "bold",
          display: "flex",
          gap: "16px",
          paddingBottom: "8px",
          borderBottom: "2px solid #000",
        }}
      >
        <div style={{ flex: "1 1 150px" }}>Description</div>
        <div style={{ flex: "1 1 120px" }}>Type</div>
        <div style={{ flex: "1 1 150px" }}>Category</div>
        <div style={{ flex: "1 1 100px" }}>Units × Price</div>
        <div style={{ flex: "1 1 80px" }}>Charged</div>
        <div style={{ flex: "1 1 200px" }}>Amounts</div>
      </div>

      {Object.entries(groupedData).map(([typeId, costGroups]) => {
        const type = costTypes.find((t) => t.id === parseInt(typeId));
        return (
          <div key={typeId} style={{ marginBottom: "24px" }}>
            <h5
              style={{
                fontSize: "20px", // Slightly larger for stronger emphasis
                fontWeight: 800, // Equivalent to 'bold', but clearer numerically
                color: "#222", // A bit darker for sharper contrast
                borderBottom: "2px solid #333",
                paddingBottom: "6px", // Extra spacing for visual separation
                marginBottom: "8px",
              }}
            >
              {type?.costTypeName || "Unknown Type"}
            </h5>

            {Object.entries(costGroups).map(([costId, items]) => {
              const category = costs.find((c) => c.id === parseInt(costId));

              const totals = items.reduce(
                (acc, item) => {
                  acc.local += item.amountLocalCurrency || 0;
                  acc.gbp += item.amountGBP || 0;
                  acc.eur += item.amountEuro || 0;
                  return acc;
                },
                { local: 0, gbp: 0, eur: 0 }
              );

              return (
                <div
                  key={costId}
                  style={{ marginLeft: "16px", marginBottom: "16px" }}
                >
                  <h6
                    style={{
                      borderBottom: "1px dashed #aaa",
                      paddingBottom: "2px",
                      fontSize: "18px",
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
                      costTypes={costTypes}
                      costs={costs}
                      isEditing={editingId === cost.costDetailId}
                      editedValues={editedValues[cost.costDetailId] || {}}
                      onEdit={() => handleEdit(cost)}
                      onChange={handleChange}
                      onSave={() => handleSave(cost.costDetailId)}
                      onCancel={handleCancel}
                    />
                  ))}

                  <div
                    style={{
                      marginTop: "8px",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    Total (Category): Local: {totals.local.toFixed(3)} | GBP:{" "}
                    {totals.gbp.toFixed(3)} | EUR: {totals.eur.toFixed(3)}
                  </div>
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
