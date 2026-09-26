import { appFetch as fetch } from "../../../../utils/appFetch";
import { calculationErrors, costDetailInputs, previewAmounts, sumDecimals } from "../../../../utils/budgetCalculations";
import React, { useEffect, useState, useCallback } from "react";
import CostDetail from "./CostDetail/CostDetail";
import styles from "./CostDetails.module.scss";

import { BASE_URL } from "../../../../config/api"; // adjust path if needed
import { useAuth } from "../../../../context/AuthContext";
import { readApiError } from "../../../../utils/apiErrors";
import ErrorBanner from "../../../../components/ErrorBanner/ErrorBanner";
import { useUnsavedChange } from "../../../../context/UnsavedChangesContext";

const blankCostDetail = {
  costDescription: "",
  costTypeId: "",
  costId: "",
  noOfUnits: "1",
  frequencyMonths: "1",
  unitPrice: "0.00",
  percentageCharging: "100",
  amountLocalCurrency: "",
  amountReportingCurrency: "",
  amountGBP: "",
  amountEuro: "",
};

export const validateCostDetail = (values, costs = []) => {
  const errors = {};
  if (!values?.costDescription?.trim()) {
    errors.costDescription = "Description is required.";
  }
  if (values?.costTypeId === "" || values?.costTypeId == null) {
    errors.costTypeId = "Type is required.";
  }
  if (values?.costId === "" || values?.costId == null) {
    errors.costId = "Category is required.";
  } else if (costs.length > 0 && values?.costTypeId !== "" && values?.costTypeId != null) {
    const selectedCost = costs.find(
      (cost) => Number(cost.id) === Number(values.costId),
    );
    if (!selectedCost) {
      errors.costId = "Selected category is unavailable.";
    } else if (Number(selectedCost.costTypeId) !== Number(values.costTypeId)) {
      errors.costId = "Category must belong to the selected type.";
    }
  }

  Object.assign(errors, calculationErrors(values));
  return errors;
};

export const isValidCostDetail = (values, costs = []) =>
  Object.keys(validateCostDetail(values, costs)).length === 0;

export const readCostDetailsResponse = async (response) => {
  if (response.status === 204) return [];
  if (!response.ok) throw new Error("Failed to fetch cost details");

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

async function safeParseJsonResponse(response) {
  const raw = await response.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CostDetails = ({ budgetId, refreshTrigger, budget, exchangeRates, onMutationSuccess, onEditingChange, disabled = false, externalFieldErrors = {} }) => {
  const { hasAnyRole } = useAuth();
  const isBudgetEditable = ["DRAFT", "RETURNED"].includes(
    budget?.lifecycleStatus || "DRAFT",
  );
  const canEditCostDetails =
    hasAnyRole("ADMIN", "FINANCE") && isBudgetEditable;
  const canDeleteCostDetails = canEditCostDetails;
  const [costTypes, setCostTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costDetails, setCostDetails] = useState([]);
  const [editingId, setEditingId] = useState(null); // number | "new" | null
  const [editedValues, setEditedValues] = useState({});
  useUnsavedChange(`cost-details-${budgetId}`, editingId !== null);
  const [fieldErrorsById, setFieldErrorsById] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  useEffect(() => { onEditingChange?.(editingId !== null || saving); }, [editingId, saving, onEditingChange]);

  useEffect(() => {
    if (canEditCostDetails) return;
    setEditingId(null);
    setEditedValues({});
    setFieldErrorsById({});
  }, [canEditCostDetails]);

  const fetchCostDetails = useCallback(async () => {
    if (!budgetId) return [];

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${BASE_URL}/api/cost-details/by-budget/${budgetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await readCostDetailsResponse(response);
      setCostDetails(data);
      return data;
    } catch (error) {
      console.error("Error fetching cost details:", error);
      setFormError("Could not refresh saved cost details. Reload before making further changes.");
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

  const computeAmounts = (row) => ({ ...row, ...previewAmounts(row, budget, exchangeRates) });
  useEffect(() => { fetchCostDetails(); }, [fetchCostDetails, refreshTrigger]);

  const handleEdit = (cost) => {
    if (!canEditCostDetails || disabled || saving) return;
    setEditingId(cost.costDetailId);
    setFieldErrorsById((current) => ({ ...current, [cost.costDetailId]: {} }));
    setEditedValues((prev) => ({
      ...prev,
      [cost.costDetailId]: {
        costDescription: cost.costDescription,
        noOfUnits: cost.noOfUnits,
        frequencyMonths: cost.frequencyMonths,
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
    if (!canEditCostDetails || disabled || saving) return;
    setEditingId("new");
    setFieldErrorsById((current) => ({ ...current, new: {} }));
    setEditedValues((prev) => ({
      ...prev,
      new: computeAmounts(blankCostDetail),
    }));
  };

  const handleChange = (field, value) => {
    setFieldErrorsById((current) => ({ ...current, [editingId]: {} }));
    setEditedValues((prev) => {
      const current = prev[editingId] || {};

      const baseUpdated = {
        ...current,
        [field]: value,
      };

      const shouldRecalc = [
        "noOfUnits",
        "frequencyMonths",
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
    if (!canEditCostDetails || disabled || saving) return;
    const isCreate = costId === "new";
    const values = editedValues[costId];
    if (!values) return;

    const token = localStorage.getItem("authToken");

    if (isCreate) {
      const localErrors = validateCostDetail(values, costs);
      if (Object.keys(localErrors).length > 0) {
        setFieldErrorsById((current) => ({ ...current, new: localErrors }));
        return;
      }

      const payload = costDetailInputs(values, budgetId);

      setSaving(true); setFormError("");
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
          setFormError(Object.entries(data.fieldErrors).map(([field, message]) => `${field}: ${message}`).join(" "));
            setFieldErrorsById((current) => ({ ...current, new: data.fieldErrors }));
            return;
          }
          throw new Error(data?.message || "Failed to create cost detail.");
        }

        const saved = await response.json();
        setCostDetails((rows) => [...rows, saved]);
        await fetchCostDetails();
        onMutationSuccess?.();
        setEditingId(null);
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next.new;
          return next;
        });
      } catch (err) {
        console.error("Error creating cost detail:", err);
        setFormError(err.message || "Failed to create cost detail.");
      } finally { setSaving(false); }
      return;
    }

    // UPDATE flow
    const original = costDetails.find((c) => c.costDetailId === costId);
    if (!original) return;

    const merged = { ...original, ...values };

    const localErrors = validateCostDetail(merged, costs);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrorsById((current) => ({ ...current, [costId]: localErrors }));
      return;
    }

    const fullPayload = costDetailInputs(merged, budgetId);

    setSaving(true); setFormError("");
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
          setFormError(Object.entries(data.fieldErrors).map(([field, message]) => `${field}: ${message}`).join(" "));
          setFieldErrorsById((current) => ({
            ...current,
            [costId]: data.fieldErrors,
          }));
          return;
        }
        throw new Error(data?.message || "Failed to update cost detail");
      }

      const saved = await response.json();
      setCostDetails((rows) => rows.map((row) => row.costDetailId === costId ? saved : row));
      await fetchCostDetails();
      onMutationSuccess?.();
      setEditingId(null);
      setEditedValues((prev) => {
        const newValues = { ...prev };
        delete newValues[costId];
        return newValues;
      });
    } catch (err) {
      console.error("Error updating cost detail:", err);
      setFormError(err.message || "Failed to save cost detail.");
    } finally { setSaving(false); }
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
    if (!canDeleteCostDetails || disabled || saving) return;
    if (!window.confirm("Are you sure you want to delete this cost detail?"))
      return;

    const token = localStorage.getItem("authToken");

    setSaving(true); setFormError("");
    try {
      const response = await fetch(`${BASE_URL}/api/cost-details/${costId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to delete cost detail."),
        );
      }

      await fetchCostDetails();
      onMutationSuccess?.();
    } catch (err) {
      console.error("Error deleting cost detail:", err);
      setFormError(err.message || "Failed to delete cost detail.");
    } finally { setSaving(false); }
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
      {formError && (
        <ErrorBanner
          message={formError}
          onDismiss={() => setFormError("")}
        />
      )}

      <aside className={styles.calculationNote} aria-label="Cost calculation">
        <p className={styles.calculationFormula}>
          Local amount = units × unit price × periods × allocated % ÷ 100
        </p>
        <p className={styles.calculationHint}>
          Use 1 period for a one-off cost and 100% for the full cost. Currency amounts use the budget’s selected exchange rates. Previews are confirmed when you save.
        </p>
      </aside>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>Description</div>
        <div>Type</div>
        <div>Category</div>
        <div>Units</div>
        <div>Periods</div>
        <div>Unit price</div>
        <div title="Cost allocated to this budget (%)">Allocated %</div>
        <div>Local</div>
        <div>Reporting</div>
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
                  const totals = Object.fromEntries(Object.entries({ local: "amountLocalCurrency", sek: "amountReportingCurrency", gbp: "amountGBP", eur: "amountEuro" }).map(([key, field]) => [key, sumDecimals(items.map((row) => row[field]))]));

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
                          busy={saving || disabled}
                          canEdit={canEditCostDetails && !disabled && !saving && editingId === null}
                          canDelete={canDeleteCostDetails && !disabled && !saving && editingId === null}
                          fieldErrors={{ ...Object.fromEntries(Object.entries(externalFieldErrors).filter(([key]) => key.startsWith(`costDetails[${cost.costDetailId}].`)).map(([key, value]) => [key.split(".").pop(), value])), ...fieldErrorsById[cost.costDetailId] }}
                        />
                      ))}

                      <div className={styles.categoryTotal}>
                        Total (Category): Local: {totals.local} |
                        Reporting: {totals.sek} | GBP:{" "}
                        {totals.gbp} | EUR: {totals.eur}
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
          busy={saving || disabled}
                          canEdit={canEditCostDetails && !disabled && !saving && editingId === null}
          canDelete={canDeleteCostDetails && !disabled && !saving && editingId === null}
          fieldErrors={fieldErrorsById.new || {}}
        />
      )}

      {/* Add New button stays visible below; disabled while create row is open */}
      {canEditCostDetails && <div className={styles.createBar}>
        <button
          className={styles.addBtn}
          onClick={handleCreate}
          disabled={saving || disabled || !budgetId || editingId !== null}
        >
          + New Cost Detail
        </button>
      </div>}
    </div>
  );
};

export default CostDetails;
