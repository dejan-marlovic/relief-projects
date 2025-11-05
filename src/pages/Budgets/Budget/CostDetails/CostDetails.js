import React, { useEffect, useState, useCallback } from "react";
import CostDetail from "./CostDetail/CostDetail";
import styles from "./CostDetails.module.scss";

const BASE_URL = "http://localhost:8080";

const blankCostDetail = {
  costDescription: "",
  costTypeId: "",
  costId: "",
  noOfUnits: "",
  unitPrice: "",
  percentageCharging: "",
  amountLocalCurrency: "",
  amountReportingCurrency: "",
  amountGBP: "",
  amountEuro: "",
};

// helper: Required fields for creating a new cost detail
const isValidNew = (v) =>
  v &&
  v.costDescription &&
  v.costTypeId !== "" &&
  v.costId !== "" &&
  v.noOfUnits !== "" &&
  v.unitPrice !== "" &&
  v.percentageCharging !== "" &&
  v.amountLocalCurrency !== "" &&
  v.amountReportingCurrency !== "" &&
  v.amountGBP !== "" &&
  v.amountEuro !== "";

const CostDetails = ({ budgetId, refreshTrigger }) => {
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costDetails, setCostDetails] = useState([]);
  const [editingId, setEditingId] = useState(null); // number | "new" | null
  const [editedValues, setEditedValues] = useState({});

  const fetchCostDetails = useCallback(async () => {
    if (!budgetId) return;

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${BASE_URL}/api/cost-details/by-budget/${budgetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        costDescription: cost.costDescription,
        noOfUnits: cost.noOfUnits,
        unitPrice: cost.unitPrice,
        percentageCharging: cost.percentageCharging,
        costTypeId: cost.costTypeId,
        costId: cost.costId,
        amountLocalCurrency: cost.amountLocalCurrency,
        amountReportingCurrency: cost.amountReportingCurrency,
        amountGBP: cost.amountGBP,
        amountEuro: cost.amountEuro,
      },
    }));
  };

  const handleCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({
      ...prev,
      new: { ...blankCostDetail },
    }));
  };

  const handleChange = (field, value) => {
    const toNumOrBlank = (v) =>
      v === "" ? "" : Number.isNaN(Number(v)) ? v : Number(v);

    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: ["costDescription"].includes(field)
          ? value
          : toNumOrBlank(value),
      },
    }));
  };

  const handleSave = async (costId) => {
    const isCreate = costId === "new";
    const values = editedValues[costId];
    if (!values) return;

    const token = localStorage.getItem("authToken");

    if (isCreate) {
      // Block save if required fields are missing to avoid backend "must not be null"
      if (!isValidNew(values)) {
        alert(
          "Please fill in Description, Type, Category, Units, Unit price, % Charged and all Amounts before saving."
        );
        return;
      }

      const payload = {
        budgetId, // link to current budget
        costDescription: values.costDescription,
        costTypeId: Number(values.costTypeId),
        costId: Number(values.costId),
        noOfUnits: Number(values.noOfUnits),
        unitPrice: Number(values.unitPrice),
        percentageCharging:
          values.percentageCharging === ""
            ? null
            : Number(values.percentageCharging),
        amountLocalCurrency: Number(values.amountLocalCurrency),
        amountReportingCurrency: Number(values.amountReportingCurrency),
        amountGBP: Number(values.amountGBP),
        amountEuro: Number(values.amountEuro),
      };

      try {
        const response = await fetch(`${BASE_URL}/api/cost-details`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await response.text().catch(() => "");
          throw new Error(`Failed to create cost detail. ${msg}`);
        }

        await fetchCostDetails();
        setEditingId(null);
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next.new;
          return next;
        });
      } catch (err) {
        console.error("Error creating cost detail:", err);
        alert("Failed to create cost detail.");
      }
      return;
    }

    // UPDATE flow (send exactly what user set, no auto-compute)
    const original = costDetails.find((c) => c.costDetailId === costId);
    if (!original) return;

    const merged = { ...original, ...values };

    const fullPayload = {
      ...merged,
      // ensure numbers for numeric fields
      noOfUnits: Number(merged.noOfUnits),
      unitPrice: Number(merged.unitPrice),
      percentageCharging:
        merged.percentageCharging === ""
          ? null
          : Number(merged.percentageCharging),
      amountLocalCurrency:
        merged.amountLocalCurrency === ""
          ? null
          : Number(merged.amountLocalCurrency),
      amountReportingCurrency:
        merged.amountReportingCurrency === ""
          ? null
          : Number(merged.amountReportingCurrency),
      amountGBP: merged.amountGBP === "" ? null : Number(merged.amountGBP),
      amountEuro: merged.amountEuro === "" ? null : Number(merged.amountEuro),
    };

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
    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (editingId && next[editingId]) delete next[editingId];
      return next;
    });
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
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerCellDescription}>Description</div>
        <div className={styles.headerCellType}>Type</div>
        <div className={styles.headerCellCategory}>Category</div>
        <div className={styles.headerCellUnits}>Units</div>
        <div className={styles.headerCellCharged}>Price / %</div>
        <div className={styles.headerCellAmounts}>Amounts</div>
        <div className={styles.headerCellActions}></div>
      </div>

      {/* Existing data */}
      {costDetails.length === 0 ? (
        <p className={styles.noDataMessage}>
          There are no cost details for this budget.
        </p>
      ) : (
        <>
          {Object.entries(groupedData).map(([typeId, costGroups]) => {
            const type = costTypes.find((t) => t.id === parseInt(typeId, 10));
            return (
              <div key={typeId} className={styles.typeSection}>
                <h5 className={styles.typeTitle}>
                  {type?.costTypeName || "Unknown Type"}
                </h5>

                {Object.entries(costGroups).map(([costId, items]) => {
                  const category = costs.find(
                    (c) => c.id === parseInt(costId, 10)
                  );
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
                    <div key={costId} className={styles.categorySection}>
                      <h6 className={styles.categoryTitle}>
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

                      <div className={styles.categoryTotal}>
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

      {/* --- CREATE ROW placed ABOVE the button --- */}
      {editingId === "new" && (
        <CostDetail
          cost={{ costDetailId: "new", ...blankCostDetail }}
          isEditing
          editedValues={editedValues.new}
          costTypes={costTypes}
          costs={costs}
          onChange={handleChange}
          onSave={() => handleSave("new")}
          onCancel={handleCancel}
          // unused in create row:
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}

      {/* Add New button stays visible below; disabled while create row is open */}
      <div className={styles.createBar}>
        <button
          className={styles.addBtn}
          onClick={handleCreate}
          disabled={!budgetId || editingId === "new"}
        >
          + New Cost Detail
        </button>
      </div>
    </div>
  );
};

export default CostDetails;
