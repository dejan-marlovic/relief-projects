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

const CostDetails = ({ budgetId, refreshTrigger, budget, exchangeRates }) => {
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costDetails, setCostDetails] = useState([]);
  const [editingId, setEditingId] = useState(null); // number | "new" | null
  const [editedValues, setEditedValues] = useState({});

  const fetchCostDetails = useCallback(async () => {
    if (!budgetId) return [];

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${BASE_URL}/api/cost-details/by-budget/${budgetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch cost details");
      const data = await response.json();
      setCostDetails(data);
      return data;
    } catch (error) {
      console.error("Error fetching cost details:", error);
      return [];
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
    fetchCostTypes();
    fetchCosts();
  }, []);

  const getRateById = (id) => {
    if (!id || !exchangeRates || exchangeRates.length === 0) return null;
    const numericId = typeof id === "string" ? Number(id) : id;

    const rateObj = exchangeRates.find((r) => r.id === numericId);
    if (!rateObj || rateObj.rate == null) return null;

    const rate = Number(rateObj.rate);
    return Number.isNaN(rate) ? null : rate;
  };

  // ---- SHARED AMOUNT CALCULATION ----
  // Implements:
  // - Local currency (e.g. TRY) base cost
  // - Local -> GBP (budget.localExchangeRateToGbpId)
  // - Local -> SEK (budget.reportingExchangeRateSekId)
  // - Local -> EUR (budget.reportingExchangeRateEurId)
  const computeAmounts = (row) => {
    if (!budget) return row;

    const noOfUnits = Number(row.noOfUnits) || 0;
    const unitPrice = Number(row.unitPrice) || 0;
    const pct =
      row.percentageCharging === "" || row.percentageCharging == null
        ? 0
        : Number(row.percentageCharging) || 0;

    const base = noOfUnits * unitPrice;
    const gross = base * (1 + pct / 100);

    const updated = { ...row };

    // Local in budget's local currency
    updated.amountLocalCurrency = gross === 0 ? "" : Number(gross.toFixed(3));

    // Rates from budget header
    const rateSek = getRateById(budget.reportingExchangeRateSekId);
    const rateEur = getRateById(budget.reportingExchangeRateEurId);
    const rateGbp = getRateById(budget.localExchangeRateToGbpId);

    if (gross !== 0 && rateSek) {
      updated.amountReportingCurrency = Number((gross * rateSek).toFixed(3));
    }

    if (gross !== 0 && rateEur) {
      updated.amountEuro = Number((gross * rateEur).toFixed(3));
    }

    if (gross !== 0 && rateGbp) {
      updated.amountGBP = Number((gross * rateGbp).toFixed(3));
    }

    return updated;
  };

  // 🔁 Recalc + persist all cost details when budget is saved
  const recalcAllForBudget = useCallback(
    async (list) => {
      if (!budget || !Array.isArray(list) || list.length === 0) return;

      const token = localStorage.getItem("authToken");

      console.log("🔁 Recalculating all cost details with budget:", {
        sekRateId: budget.reportingExchangeRateSekId,
        eurRateId: budget.reportingExchangeRateEurId,
        gbpRateId: budget.localExchangeRateToGbpId,
      });

      const updatedList = await Promise.all(
        list.map(async (item) => {
          const before = {
            id: item.costDetailId,
            local: item.amountLocalCurrency,
            sek: item.amountReportingCurrency,
            gbp: item.amountGBP,
            eur: item.amountEuro,
          };

          const computed = computeAmounts(item);
          const merged = { ...item, ...computed };

          const after = {
            id: merged.costDetailId,
            local: merged.amountLocalCurrency,
            sek: merged.amountReportingCurrency,
            gbp: merged.amountGBP,
            eur: merged.amountEuro,
          };

          console.log("➡️ Cost detail recalc", { before, after });

          const payload = {
            ...merged,
            noOfUnits: Number(merged.noOfUnits),
            unitPrice: Number(merged.unitPrice),
            percentageCharging:
              merged.percentageCharging === "" ||
              merged.percentageCharging == null
                ? null
                : Number(merged.percentageCharging),
            amountLocalCurrency:
              merged.amountLocalCurrency === "" ||
              merged.amountLocalCurrency == null
                ? null
                : Number(merged.amountLocalCurrency),
            amountReportingCurrency:
              merged.amountReportingCurrency === "" ||
              merged.amountReportingCurrency == null
                ? null
                : Number(merged.amountReportingCurrency),
            amountGBP:
              merged.amountGBP === "" || merged.amountGBP == null
                ? null
                : Number(merged.amountGBP),
            amountEuro:
              merged.amountEuro === "" || merged.amountEuro == null
                ? null
                : Number(merged.amountEuro),
          };

          try {
            await fetch(`${BASE_URL}/api/cost-details/${item.costDetailId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            console.error(
              "Failed to recalculate cost detail",
              item.costDetailId,
              err
            );
          }

          return merged;
        })
      );

      console.log(
        "✅ Finished recalculation, updated cost details:",
        updatedList
      );
      setCostDetails(updatedList);
    },
    [budget, exchangeRates]
  );

  // 👉 fetch on mount + whenever refreshTrigger changes
  useEffect(() => {
    console.log("🔔 refreshTrigger is", refreshTrigger, "budget is", budget);
    const run = async () => {
      const data = await fetchCostDetails();

      // Only recalc after an explicit refresh (i.e. after saving budget).
      if (!budget || refreshTrigger === 0) return;

      await recalcAllForBudget(data);
    };

    run();
  }, [fetchCostDetails, recalcAllForBudget, refreshTrigger, budget]);

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

    setEditedValues((prev) => {
      const current = prev[editingId] || {};

      // basic field update
      const baseUpdated = {
        ...current,
        [field]: ["costDescription"].includes(field)
          ? value
          : toNumOrBlank(value),
      };

      // Only auto-recalculate when one of these fields change
      const shouldRecalc = [
        "noOfUnits",
        "unitPrice",
        "percentageCharging",
      ].includes(field);

      if (!shouldRecalc || !budget) {
        return {
          ...prev,
          [editingId]: baseUpdated,
        };
      }

      const recomputed = computeAmounts(baseUpdated);

      return {
        ...prev,
        [editingId]: recomputed,
      };
    });
  };

  const handleSave = async (costId) => {
    const isCreate = costId === "new";
    const values = editedValues[costId];
    if (!values) return;

    const token = localStorage.getItem("authToken");

    if (isCreate) {
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

    // UPDATE flow
    const original = costDetails.find((c) => c.costDetailId === costId);
    if (!original) return;

    const merged = { ...original, ...values };

    const fullPayload = {
      ...merged,
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
                      const computed = computeAmounts(item);
                      acc.local += computed.amountLocalCurrency || 0;
                      acc.gbp += computed.amountGBP || 0;
                      acc.eur += computed.amountEuro || 0;
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
