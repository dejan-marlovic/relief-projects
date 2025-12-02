import React, { useEffect, useState } from "react";
import styles from "./Budget.module.scss";
import CostDetails from "./CostDetails/CostDetails";
import CreateCostDetail from "./CreateCostDetail/CreateCostDetail.js";

const BASE_URL = "http://localhost:8080";

const Budget = ({ budget: initialBudget, onUpdate, onDelete }) => {
  const formatDate = (dateString) =>
    dateString ? dateString.slice(0, 16) : "";

  const [budget, setBudget] = useState(initialBudget || {});
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [refreshCostDetailsTrigger, setRefreshCostDetailsTrigger] = useState(0);

  // 🔴 form-level + field-level errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { fieldName: "Message" }

  const triggerRefreshCostDetails = () =>
    setRefreshCostDetailsTrigger((prev) => prev + 1);

  // 🔎 helper: find currency name by id
  const getCurrencyNameById = (id) => {
    if (!id || !currencies || currencies.length === 0) return "";
    const numericId = typeof id === "string" ? Number(id) : id;
    return currencies.find((c) => c.id === numericId)?.name || "";
  };

  const getCurrencyById = (id) => {
    if (!id || !currencies || currencies.length === 0) return null;
    const numericId = typeof id === "string" ? Number(id) : id;
    return currencies.find((c) => c.id === numericId) || null;
  };

  const findCurrencyIdByName = (name) => {
    if (!name || !currencies || currencies.length === 0) return null;
    return currencies.find(
      (c) => (c.name || "").toUpperCase() === name.toUpperCase()
    )?.id;
  };

  // 💱 format: "1 USD → 10.50 SEK"
  const formatRateLabel = (r) => {
    const baseName = getCurrencyNameById(r.baseCurrencyId) || r.baseCurrencyId;
    const quoteName =
      getCurrencyNameById(r.quoteCurrencyId) || r.quoteCurrencyId;
    return `1 ${baseName} → ${r.rate} ${quoteName}`;
  };

  // Filter rates for a specific currency pair
  const filterRatesForPair = (baseCurrencyId, quoteCurrencyId) => {
    if (!baseCurrencyId || !quoteCurrencyId || !exchangeRates.length) return [];
    const baseNum =
      typeof baseCurrencyId === "string"
        ? Number(baseCurrencyId)
        : baseCurrencyId;
    const quoteNum =
      typeof quoteCurrencyId === "string"
        ? Number(quoteCurrencyId)
        : quoteCurrencyId;

    return exchangeRates.filter(
      (r) => r.baseCurrencyId === baseNum && r.quoteCurrencyId === quoteNum
    );
  };

  // 🔄 Fetch: Currencies
  const fetchCurrencies = async (token) => {
    const response = await fetch(`${BASE_URL}/api/currencies/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  };

  // 🔄 Fetch: Exchange Rates
  const fetchExchangeRates = async (token) => {
    const response = await fetch(`${BASE_URL}/api/exchange-rates/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  };

  // ✅ Fetch both currencies and rates in parallel on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchFormData = async () => {
      try {
        const [currenciesData, exchangeRatesData] = await Promise.all([
          fetchCurrencies(token),
          fetchExchangeRates(token),
        ]);
        setCurrencies(currenciesData);
        setExchangeRates(exchangeRatesData);
      } catch (error) {
        console.error("Failed to fetch currency or exchange rate data", error);
      }
    };

    fetchFormData();
  }, []);

  // 🔧 Field error helpers
  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  // Names for fixed reporting currencies (for display only)
  const sekName = getCurrencyNameById(budget.reportingCurrencySekId) || "SEK";
  const eurName = getCurrencyNameById(budget.reportingCurrencyEurId) || "EUR";

  // IDs of special currencies
  const gbpCurrencyId = findCurrencyIdByName("GBP");

  // Rate lists for each dropdown
  const localToGbpRates =
    budget.localCurrencyId && gbpCurrencyId
      ? filterRatesForPair(budget.localCurrencyId, gbpCurrencyId)
      : [];

  const localToSekRates =
    budget.localCurrencyId && budget.reportingCurrencySekId
      ? filterRatesForPair(
          budget.localCurrencyId,
          budget.reportingCurrencySekId
        )
      : [];

  const localToEurRates =
    budget.localCurrencyId && budget.reportingCurrencyEurId
      ? filterRatesForPair(
          budget.localCurrencyId,
          budget.reportingCurrencyEurId
        )
      : [];

  // 💾 Save/Update Budget
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // ❗ 1) FRONTEND VALIDATION BEFORE SENDING ANYTHING
      const newFieldErrors = {};

      // total amount
      if (
        budget.totalAmount === "" ||
        budget.totalAmount == null ||
        Number(budget.totalAmount) <= 0
      ) {
        newFieldErrors.totalAmount = "Total amount must be greater than zero.";
      }

      // base required fields
      if (!budget.localCurrencyId) {
        newFieldErrors.localCurrencyId = "Local currency is required.";
      }

      // valid ID helpers
      const validLocalToGbpIds = new Set(
        localToGbpRates.map((r) => Number(r.id))
      );
      const validLocalToSekIds = new Set(
        localToSekRates.map((r) => Number(r.id))
      );
      const validLocalToEurIds = new Set(
        localToEurRates.map((r) => Number(r.id))
      );

      const localToGbpIdNum =
        budget.localExchangeRateToGbpId == null ||
        budget.localExchangeRateToGbpId === ""
          ? null
          : Number(budget.localExchangeRateToGbpId);

      const sekRateIdNum =
        budget.reportingExchangeRateSekId == null ||
        budget.reportingExchangeRateSekId === ""
          ? null
          : Number(budget.reportingExchangeRateSekId);

      const eurRateIdNum =
        budget.reportingExchangeRateEurId == null ||
        budget.reportingExchangeRateEurId === ""
          ? null
          : Number(budget.reportingExchangeRateEurId);

      // Local → GBP
      if (!localToGbpIdNum || !validLocalToGbpIds.has(localToGbpIdNum)) {
        newFieldErrors.localExchangeRateToGbpId =
          "Local → GBP exchange rate is required for the selected local currency.";
      }

      // Local → SEK
      if (!sekRateIdNum || !validLocalToSekIds.has(sekRateIdNum)) {
        newFieldErrors.reportingExchangeRateSekId =
          "SEK exchange rate is required for the selected local currency.";
      }

      // Local → EUR
      if (!eurRateIdNum || !validLocalToEurIds.has(eurRateIdNum)) {
        newFieldErrors.reportingExchangeRateEurId =
          "EUR exchange rate is required for the selected local currency.";
      }

      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
        setFormError("Please correct the highlighted fields and try again.");
        return; // ⛔ don't call backend
      }

      // 2) clear previous backend errors before new request
      setFormError("");
      setFieldErrors({});

      // 3) Build a clean payload explicitly – field names must match BudgetDTO
      const payload = {
        id: budget.id,
        projectId: budget.projectId,

        budgetDescription: budget.budgetDescription ?? "",
        budgetPreparationDate: budget.budgetPreparationDate ?? null,
        totalAmount:
          budget.totalAmount === "" || budget.totalAmount == null
            ? null
            : Number(budget.totalAmount),

        // currencies
        localCurrencyId:
          budget.localCurrencyId === "" || budget.localCurrencyId == null
            ? null
            : Number(budget.localCurrencyId),

        reportingCurrencySekId:
          budget.reportingCurrencySekId === "" ||
          budget.reportingCurrencySekId == null
            ? null
            : Number(budget.reportingCurrencySekId),

        reportingCurrencyEurId:
          budget.reportingCurrencyEurId === "" ||
          budget.reportingCurrencyEurId == null
            ? null
            : Number(budget.reportingCurrencyEurId),

        // exchange rates (FK → exchange_rates)
        localExchangeRateToGbpId: localToGbpIdNum,
        reportingExchangeRateSekId: sekRateIdNum,
        reportingExchangeRateEurId: eurRateIdNum,
      };

      console.log("🔵 Budget PUT payload:", payload);

      const response = await fetch(`${BASE_URL}/api/budgets/${budget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // 🔍 Try to read nice ApiError from backend
        let data = null;
        const text = await response.text().catch(() => "");

        console.log("🔴 Budget update error raw:", text);

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse budget error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          }
          setFormError(
            data.message || "There was a problem updating the budget."
          );
        } else {
          setFormError("There was a problem updating the budget.");
        }

        return; // stop success flow
      }

      const updated = await response.json();
      console.log("✅ Updated budget from server:", updated);
      alert("Budget updated successfully!");

      setBudget(updated);
      onUpdate?.(updated);

      const freshRates = await fetchExchangeRates(token);
      setExchangeRates(freshRates);
      triggerRefreshCostDetails();

      // clear errors after success
      setFormError("");
      setFieldErrors({});
    } catch (error) {
      console.error("Error updating budget:", error);
      setFormError("Unexpected error while saving budget.");
    }
  };

  // 🗑️ Delete Budget
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${BASE_URL}/api/budgets/${budget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete budget");

      alert("Budget deleted successfully!");
      onDelete?.(budget.id);
      setBudget({});
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Error deleting budget.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Cast obvious numeric fields to numbers or ""
    const numericFields = [
      "totalAmount",
      "localCurrencyId",
      "localExchangeRateToGbpId",
      "reportingCurrencySekId",
      "reportingCurrencyEurId",
      "reportingExchangeRateSekId",
      "reportingExchangeRateEurId",
    ];

    const castValue = numericFields.includes(name)
      ? value === ""
        ? ""
        : Number(value)
      : value;

    // 🔁 When local currency changes, force user to pick new rates by clearing them
    if (name === "localCurrencyId") {
      setBudget((prev) => ({
        ...prev,
        localCurrencyId: castValue,
        localExchangeRateToGbpId: "",
        reportingExchangeRateSekId: "",
        reportingExchangeRateEurId: "",
      }));

      // also clear related field errors so user starts fresh
      setFieldErrors((prev) => ({
        ...prev,
        localExchangeRateToGbpId: undefined,
        reportingExchangeRateSekId: undefined,
        reportingExchangeRateEurId: undefined,
      }));

      return;
    }

    setBudget((prev) => ({
      ...prev,
      [name]: castValue,
    }));
  };

  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Budget Details</h3>

        {/* 🔴 Top error banner */}
        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <form className={styles.formTwoColumn}>
          <div className={styles.formColumnLeft}>
            <div>
              <label>Description:</label>
              <textarea
                name="budgetDescription"
                className={styles.textareaInput}
                value={budget.budgetDescription || ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Preparation Date:</label>
              <input
                type="datetime-local"
                name="budgetPreparationDate"
                className={styles.textInput}
                value={formatDate(budget.budgetPreparationDate)}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Total Amount:</label>
              <input
                type="number"
                name="totalAmount"
                className={inputClass("totalAmount")}
                value={budget.totalAmount || ""}
                onChange={handleChange}
              />
              {getFieldError("totalAmount") && (
                <div className={styles.fieldError}>
                  {getFieldError("totalAmount")}
                </div>
              )}
            </div>

            <div className={styles.saveButtonContainer}>
              <button
                type="button"
                onClick={handleSave}
                className={styles.saveButton}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
              >
                Delete this budget
              </button>
            </div>
          </div>

          <div className={styles.formColumnRight}>
            {/* Local currency (e.g. TRY) and Local -> GBP rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
                <label>Local Currency:</label>
                <select
                  name="localCurrencyId"
                  className={inputClass("localCurrencyId")}
                  value={budget.localCurrencyId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {getFieldError("localCurrencyId") && (
                  <div className={styles.fieldError}>
                    {getFieldError("localCurrencyId")}
                  </div>
                )}
              </div>

              <div className={styles.formItem}>
                <label>Local → GBP Rate:</label>
                <select
                  name="localExchangeRateToGbpId"
                  className={inputClass("localExchangeRateToGbpId")}
                  value={budget.localExchangeRateToGbpId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {localToGbpRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRateLabel(r)}
                    </option>
                  ))}
                </select>
                {getFieldError("localExchangeRateToGbpId") && (
                  <div className={styles.fieldError}>
                    {getFieldError("localExchangeRateToGbpId")}
                  </div>
                )}
              </div>
            </div>

            {/* Reporting SEK (fixed, read-only) + rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
                <label>Reporting currency (SEK):</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={sekName}
                  readOnly
                />
              </div>

              <div className={styles.formItem}>
                <label>SEK Exchange Rate (Local → SEK):</label>
                <select
                  name="reportingExchangeRateSekId"
                  className={inputClass("reportingExchangeRateSekId")}
                  value={budget.reportingExchangeRateSekId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {localToSekRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRateLabel(r)}
                    </option>
                  ))}
                </select>
                {getFieldError("reportingExchangeRateSekId") && (
                  <div className={styles.fieldError}>
                    {getFieldError("reportingExchangeRateSekId")}
                  </div>
                )}
              </div>
            </div>

            {/* Reporting EUR (fixed, read-only) + rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
                <label>Reporting currency (EUR):</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={eurName}
                  readOnly
                />
              </div>

              <div className={styles.formItem}>
                <label>EUR Exchange Rate (Local → EUR):</label>
                <select
                  name="reportingExchangeRateEurId"
                  className={inputClass("reportingExchangeRateEurId")}
                  value={budget.reportingExchangeRateEurId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {localToEurRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRateLabel(r)}
                    </option>
                  ))}
                </select>
                {getFieldError("reportingExchangeRateEurId") && (
                  <div className={styles.fieldError}>
                    {getFieldError("reportingExchangeRateEurId")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {budget?.id && (
        <CostDetails
          budgetId={budget.id}
          refreshTrigger={refreshCostDetailsTrigger}
          budget={budget}
          exchangeRates={exchangeRates}
        />
      )}
    </div>
  );
};

export default Budget;
