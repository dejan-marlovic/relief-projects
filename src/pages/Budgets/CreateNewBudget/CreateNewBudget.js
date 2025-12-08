import React, { useState, useEffect, useContext } from "react";
import styles from "../Budget/Budget.module.scss"; // use SAME styles as Budget
import { ProjectContext } from "../../../context/ProjectContext";

const BASE_URL = "http://localhost:8080";

const CreateNewBudget = ({ onClose, onBudgetCreated }) => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);

  const [budget, setBudget] = useState({
    budgetDescription: "",
    totalAmount: "",
    budgetPreparationDate: "",
    localCurrencyId: "",
    reportingCurrencySekId: "",
    reportingCurrencyEurId: "",
    localExchangeRateToGbpId: "",
    reportingExchangeRateSekId: "",
    reportingExchangeRateEurId: "",
  });

  // 🔴 Error state
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  // 🔎 helper: find currency name by id
  const getCurrencyNameById = (id) => {
    if (!id || !currencies || currencies.length === 0) return "";
    const numericId = typeof id === "string" ? Number(id) : id;
    return currencies.find((c) => c.id === numericId)?.name || "";
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
    const res = await fetch(`${BASE_URL}/api/currencies/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  // 🔄 Fetch: Exchange Rates
  const fetchExchangeRates = async (token) => {
    const res = await fetch(`${BASE_URL}/api/exchange-rates/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  // ⏳ On mount, fetch form dropdown data
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchData = async () => {
      try {
        const [currenciesData, exchangeRatesData] = await Promise.all([
          fetchCurrencies(token),
          fetchExchangeRates(token),
        ]);
        setCurrencies(currenciesData);
        setExchangeRates(exchangeRatesData);

        // Auto-set reporting currencies to SEK and EUR if present
        const sekCurrency = currenciesData.find(
          (c) => (c.name || "").toUpperCase() === "SEK"
        );
        const eurCurrency = currenciesData.find(
          (c) => (c.name || "").toUpperCase() === "EUR"
        );

        setBudget((prev) => ({
          ...prev,
          reportingCurrencySekId:
            prev.reportingCurrencySekId || (sekCurrency?.id ?? ""),
          reportingCurrencyEurId:
            prev.reportingCurrencyEurId || (eurCurrency?.id ?? ""),
        }));
      } catch (err) {
        console.error("Error fetching form data", err);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

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

    setBudget((prev) => ({ ...prev, [name]: castValue }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem("authToken");

    // Clear previous errors
    setFormError("");
    setFieldErrors({});

    try {
      const payload = {
        // required by backend
        projectId: selectedProjectId ? Number(selectedProjectId) : null,

        budgetDescription: budget.budgetDescription ?? "",
        budgetPreparationDate: budget.budgetPreparationDate || null,
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

        // exchange rates – match BudgetDTO
        localExchangeRateToGbpId:
          budget.localExchangeRateToGbpId === "" ||
          budget.localExchangeRateToGbpId == null
            ? null
            : Number(budget.localExchangeRateToGbpId),

        reportingExchangeRateSekId:
          budget.reportingExchangeRateSekId === "" ||
          budget.reportingExchangeRateSekId == null
            ? null
            : Number(budget.reportingExchangeRateSekId),

        reportingExchangeRateEurId:
          budget.reportingExchangeRateEurId === "" ||
          budget.reportingExchangeRateEurId == null
            ? null
            : Number(budget.reportingExchangeRateEurId),
      };

      const res = await fetch(`${BASE_URL}/api/budgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let data = null;
        const text = await res.text();

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          }
          setFormError(
            data.message || "There was a problem creating the budget."
          );
        } else {
          setFormError("There was a problem creating the budget.");
        }

        return; // stop success flow
      }

      const created = await res.json();
      onBudgetCreated(created);

      // Reset form + errors, then close
      setFormError("");
      setFieldErrors({});
      onClose();
    } catch (err) {
      console.error("Create budget error:", err);
      setFormError("Unexpected error while creating budget.");
    }
  };

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

  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Create New Budget</h3>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <form className={styles.formTwoColumn}>
          {/* Left Column */}
          <div className={styles.formColumnLeft}>
            <div className={styles.formItem}>
              <label>Budget Description:</label>
              <textarea
                name="budgetDescription"
                className={`${styles.textareaInput} ${
                  hasError("budgetDescription") ? styles.inputError : ""
                }`}
                placeholder="Enter a brief description of the budget purpose"
                value={budget.budgetDescription}
                onChange={handleChange}
              />
              {getFieldError("budgetDescription") && (
                <div className={styles.fieldError}>
                  {getFieldError("budgetDescription")}
                </div>
              )}
            </div>

            <div className={styles.formItem}>
              <label>Preparation Date:</label>
              <input
                type="datetime-local"
                name="budgetPreparationDate"
                className={inputClass("budgetPreparationDate")}
                value={budget.budgetPreparationDate}
                onChange={handleChange}
              />
              {getFieldError("budgetPreparationDate") && (
                <div className={styles.fieldError}>
                  {getFieldError("budgetPreparationDate")}
                </div>
              )}
              <small className={styles.helperText}>
                Date the budget was prepared.
              </small>
            </div>

            <div className={styles.formItem}>
              <label>Total Amount:</label>
              <input
                type="number"
                name="totalAmount"
                className={inputClass("totalAmount")}
                placeholder="Enter total budget amount"
                value={budget.totalAmount}
                onChange={handleChange}
              />
              {getFieldError("totalAmount") && (
                <div className={styles.fieldError}>
                  {getFieldError("totalAmount")}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
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

        {/* same button styling as Budget component */}
        <div className={styles.saveButtonContainer}>
          <button onClick={handleSave} className={styles.saveButton}>
            Save
          </button>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNewBudget;
