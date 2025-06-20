import React, { useEffect, useState, useCallback } from "react";
import CostDetail from "./CostDetail/CostDetail";

const BASE_URL = "http://localhost:8080";

const CostDetails = ({ budgetId, refreshTrigger }) => {
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costDetails, setCostDetails] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  const fetchCostDetails = useCallback(async () => {
    if (!budgetId) return;

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${BASE_URL}/api/cost-details/by-budget/${budgetId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch cost details");
      const data = await response.json();
      setCostDetails(data);
    } catch (error) {
      console.error("Error fetching cost details:", error);
    }
  }, [budgetId]);

  const fetchCostTypes = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/cost-types/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCostTypes(data);
    } catch (err) {
      console.error("Failed to fetch cost types", err);
    }
  };

  const fetchCosts = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/costs/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCosts(data);
    } catch (err) {
      console.error("Failed to fetch costs", err);
    }
  };

  useEffect(() => {
    fetchCostDetails();
  }, [fetchCostDetails, refreshTrigger]);

  useEffect(() => {
    fetchCostTypes();
    fetchCosts();
  }, []);

  const handleEdit = (cost) => {
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

  const handleSave = async (costId) => {
    const values = editedValues[costId];
    const original = costDetails.find((c) => c.costDetailId === costId);
    if (!original || !values) return;

    const token = localStorage.getItem("authToken");
    const fullPayload = { ...original, ...values };

    try {
      const response = await fetch(`${BASE_URL}/api/cost-details/${costId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fullPayload),
      });

      if (!response.ok) throw new Error("Failed to update cost detail");

      await fetchCostDetails();
      setEditingId(null);
      setEditedValues((prev) => {
        const newValues = { ...prev };
        delete newValues[costId];
        return newValues;
      });
    } catch (err) {
      console.error("Error updating cost detail:", err);
      alert("Failed to save cost detail.");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedValues({});
  };

  const handleDelete = async (costId) => {
    if (!window.confirm("Are you sure you want to delete this cost detail?"))
      return;

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${BASE_URL}/api/cost-details/${costId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok)
        throw new Error(`Failed to delete cost detail with ID ${costId}`);

      await fetchCostDetails();
    } catch (err) {
      console.error("Error deleting cost detail:", err);
      alert("Failed to delete cost detail.");
    }
  };

  const groupCosts = () => {
    const grouped = {};
    costDetails.forEach((cost) => {
      const typeId = cost.costTypeId;
      const costId = cost.costId;
      if (!grouped[typeId]) grouped[typeId] = {};
      if (!grouped[typeId][costId]) grouped[typeId][costId] = [];
      grouped[typeId][costId].push(cost);
    });
    return grouped;
  };

  const groupedData = groupCosts();

  return (
    <div>
      {costDetails.length === 0 ? (
        <p style={{ padding: "16px", fontStyle: "italic", color: "#555" }}>
          There are no cost details for this budget.
        </p>
      ) : (
        <>
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
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#222",
                    borderBottom: "2px solid #333",
                    paddingBottom: "6px",
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
                          fontSize: "20px",
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
                          onDelete={handleDelete}
                        />
                      ))}

                      <div
                        style={{
                          marginTop: "8px",
                          fontWeight: 800,
                          fontSize: "16px",
                        }}
                      >
                        Total (Category): Local: {totals.local.toFixed(3)} |
                        GBP: {totals.gbp.toFixed(3)} | EUR:{" "}
                        {totals.eur.toFixed(3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default CostDetails;
