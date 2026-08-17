import React, { useEffect, useState, useCallback } from "react";
import CostDetail from "./CostDetail/CostDetail";
import styles from "./CostDetails.module.scss";

import { BASE_URL } from "../../../../config/api"; // adjust path if needed
import { useAuth } from "../../../../context/AuthContext";

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

export const validateCostDetail = (values) => {
  const errors = {};
  const requiredNumber = (field, label, { minimum = 0 } = {}) => {
    const value = values?.[field];
    if (value === "" || value == null) {
      errors[field] = `${label} is required.`;
      return;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum) {
      errors[field] = `${label} must be a number of at least ${minimum}.`;
    }
  };

  if (!values?.costDescription?.trim()) {
    errors.costDescription = "Description is required.";
  }
  if (values?.costTypeId === "" || values?.costTypeId == null) {
    errors.costTypeId = "Type is required.";
  }
  if (values?.costId === "" || values?.costId == null) {
    errors.costId = "Category is required.";
  }

  requiredNumber("noOfUnits", "Units");
  requiredNumber("unitPrice", "Unit price");
  requiredNumber("percentageCharging", "% charged");
  requiredNumber("amountLocalCurrency", "Local amount");
  requiredNumber("amountReportingCurrency", "SEK amount");
  requiredNumber("amountGBP", "GBP amount");
  requiredNumber("amountEuro", "EUR amount");
  return errors;
};

export const isValidCostDetail = (values) =>
  Object.keys(validateCostDetail(values)).length === 0;

async function safeParseJsonResponse(response) {
  const raw = await response.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CostDetails = ({ budgetId, refreshTrigger, budget, exchangeRates }) => {
  const { hasAnyRole } = useAuth();
  const canEditCostDetails = hasAnyRole("ADMIN", "FINANCE");
  const canDeleteCostDetails = canEditCostDetails;
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costDetails, setCostDetails] = useState([]);
  const [editingId, setEditingId] = useState(null); // number | "new" | null
  const [editedValues, setEditedValues] = useState({});
  const [fieldErrorsById, setFieldErrorsById] = useState({});

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
  const computeAmounts = useCallback(
    (row) => {
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

      // Reporting currency = SEK
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
    },
    [budget, exchangeRates]
  );

  // 🔁 Recalc + persist all cost details when budget is saved
  const recalcAllForBudget = useCallback(
    async (list) => {
      if (!budget || !Array.isArray(list) || list.length === 0) return;

      const token = localStorage.getItem("authToken");

      const updatedList = await Promise.all(
        list.map(async (item) => {
          const computed = computeAmounts(item);
          const merged = { ...item, ...computed };

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

      setCostDetails(updatedList);
    },
    [budget, exchangeRates, computeAmounts]
  );

  // 👉 fetch on mount + whenever refreshTrigger changes
  useEffect(() => {
    const run = async () => {
      const data = await fetchCostDetails();

      // Only recalc after an explicit refresh (i.e. after saving budget).
      if (!budget || refreshTrigger === 0) return;

      await recalcAllForBudget(data);
    };

    run();
  }, [fetchCostDetails, recalcAllForBudget, refreshTrigger, budget]);

  const handleEdit = (cost) => {
    if (!canEditCostDetails) return;
    setEditingId(cost.costDetailId);
    setFieldErrorsById((current) => ({ ...current, [cost.costDetailId]: {} }));
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
    if (!canEditCostDetails) return;
    setEditingId("new");
    setFieldErrorsById((current) => ({ ...current, new: {} }));
    setEditedValues((prev) => ({
      ...prev,
      new: { ...blankCostDetail },
    }));
  };

  const handleChange = (field, value) => {
    setFieldErrorsById((current) => ({ ...current, [editingId]: {} }));
    const toNumOrBlank = (v) =>
      v === "" ? "" : Number.isNaN(Number(v)) ? v : Number(v);

    setEditedValues((prev) => {
      const current = prev[editingId] || {};

      const baseUpdated = {
        ...current,
        [field]: ["costDescription"].includes(field)
          ? value
          : toNumOrBlank(value),
      };

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
    if (!canEditCostDetails) return;
    const isCreate = costId === "new";
    const values = editedValues[costId];
    if (!values) return;

    const token = localStorage.getItem("authToken");

    if (isCreate) {
      const localErrors = validateCostDetail(values);
      if (Object.keys(localErrors).length > 0) {
        setFieldErrorsById((current) => ({ ...current, new: localErrors }));
        return;
      }

      const payload = {
        budgetId,
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
          const data = await safeParseJsonResponse(response);
          if (data?.fieldErrors) {
            setFieldErrorsById((current) => ({ ...current, new: data.fieldErrors }));
            return;
          }
          throw new Error(data?.message || "Failed to create cost detail.");
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

    const localErrors = validateCostDetail(merged);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrorsById((current) => ({ ...current, [costId]: localErrors }));
      return;
    }

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

      if (!response.ok) {
        const data = await safeParseJsonResponse(response);
        if (data?.fieldErrors) {
          setFieldErrorsById((current) => ({
            ...current,
            [costId]: data.fieldErrors,
          }));
          return;
        }
        throw new Error(data?.message || "Failed to update cost detail");
      }

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
    setFieldErrorsById((current) => {
      const next = { ...current };
      delete next[editingId];
      return next;
    });
    setEditingId(null);
    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (editingId && next[editingId]) delete next[editingId];
      return next;
    });
  };

  const handleDelete = async (costId) => {
    if (!canDeleteCostDetails) return;
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
    <div className={styles.gridContainer}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>Description</div>
        <div>Type</div>
        <div>Category</div>
        <div>Units</div>
        <div>Unit price</div>
        <div>% Charged</div>
        <div>Local</div>
        <div>SEK</div>
        <div>GBP</div>
        <div>EUR</div>
        <div></div>
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
                      acc.sek += computed.amountReportingCurrency || 0;
                      acc.gbp += computed.amountGBP || 0;
                      acc.eur += computed.amountEuro || 0;
                      return acc;
                    },
                    { local: 0, sek: 0, gbp: 0, eur: 0 }
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
                          canEdit={canEditCostDetails}
                          canDelete={canDeleteCostDetails}
                          fieldErrors={fieldErrorsById[cost.costDetailId] || {}}
                        />
                      ))}

                      <div className={styles.categoryTotal}>
                        Total (Category): Local: {totals.local.toFixed(3)} |
                        SEK: {totals.sek.toFixed(3)} | GBP:{" "}
                        {totals.gbp.toFixed(3)} | EUR: {totals.eur.toFixed(3)}
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
      {canEditCostDetails && editingId === "new" && (
        <CostDetail
          cost={{ costDetailId: "new", ...blankCostDetail }}
          isEditing
          editedValues={editedValues.new}
          costTypes={costTypes}
          costs={costs}
          onChange={handleChange}
          onSave={() => handleSave("new")}
          onCancel={handleCancel}
          onEdit={() => {}}
          onDelete={() => {}}
          canEdit={canEditCostDetails}
          canDelete={canDeleteCostDetails}
          fieldErrors={fieldErrorsById.new || {}}
        />
      )}

      {/* Add New button stays visible below; disabled while create row is open */}
      {canEditCostDetails && <div className={styles.createBar}>
        <button
          className={styles.addBtn}
          onClick={handleCreate}
          disabled={!budgetId || editingId === "new"}
        >
          + New Cost Detail
        </button>
      </div>}
    </div>
  );
};

export default CostDetails;
