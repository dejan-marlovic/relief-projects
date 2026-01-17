import React, { useState, useEffect, useContext, useMemo } from "react";
import styles from "../Budget/Budget.module.scss"; // ✅ reuse Budget styling
import { ProjectContext } from "../../../context/ProjectContext";

// ✅ Icons to match Budget/Project vibe
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import { BASE_URL } from "../../../config/api"; // adjust path if needed

const CreateNewBudget = ({ onClose, onBudgetCreated }) => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (!id || !currencies?.length) return "";
    const numericId = typeof id === "string" ? Number(id) : id;
    return currencies.find((c) => c.id === numericId)?.name || "";
  };

  const findCurrencyIdByName = (name) => {
    if (!name || !currencies?.length) return null;
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

  // 🔄 Fetch: Currencies + Exchange Rates
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchData = async () => {
      try {
        setLoading(true);

        const [currenciesRes, ratesRes] = await Promise.all([
          fetch(`${BASE_URL}/api/currencies/active`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/exchange-rates/active`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const currenciesData = await currenciesRes.json();
        const exchangeRatesData = await ratesRes.json();

        setCurrencies(Array.isArray(currenciesData) ? currenciesData : []);
        setExchangeRates(
          Array.isArray(exchangeRatesData) ? exchangeRatesData : []
        );

        // Auto-set reporting currencies to SEK and EUR if present
        const sekCurrency = (
          Array.isArray(currenciesData) ? currenciesData : []
        ).find((c) => (c.name || "").toUpperCase() === "SEK");
        const eurCurrency = (
          Array.isArray(currenciesData) ? currenciesData : []
        ).find((c) => (c.name || "").toUpperCase() === "EUR");

        setBudget((prev) => ({
          ...prev,
          reportingCurrencySekId:
            prev.reportingCurrencySekId || (sekCurrency?.id ?? ""),
          reportingCurrencyEurId:
            prev.reportingCurrencyEurId || (eurCurrency?.id ?? ""),
        }));
      } catch (err) {
        console.error("Error fetching form data", err);
        setCurrencies([]);
        setExchangeRates([]);
      } finally {
        setLoading(false);
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

    // If local currency changes, clear the dependent rates (same UX as Budget)
    if (name === "localCurrencyId") {
      setBudget((prev) => ({
        ...prev,
        localCurrencyId: castValue,
        localExchangeRateToGbpId: "",
        reportingExchangeRateSekId: "",
        reportingExchangeRateEurId: "",
      }));

      setFieldErrors((prev) => ({
        ...prev,
        localExchangeRateToGbpId: undefined,
        reportingExchangeRateSekId: undefined,
        reportingExchangeRateEurId: undefined,
      }));
      return;
    }

    setBudget((prev) => ({ ...prev, [name]: castValue }));
  };

  // Derived labels
  const sekName = getCurrencyNameById(budget.reportingCurrencySekId) || "SEK";
  const eurName = getCurrencyNameById(budget.reportingCurrencyEurId) || "EUR";

  // IDs of special currencies
  const gbpCurrencyId = findCurrencyIdByName("GBP");

  // Rate lists for each dropdown (memoized to avoid churn)
  const localToGbpRates = useMemo(() => {
    return budget.localCurrencyId && gbpCurrencyId
      ? filterRatesForPair(budget.localCurrencyId, gbpCurrencyId)
      : [];
  }, [budget.localCurrencyId, gbpCurrencyId, exchangeRates]);

  const localToSekRates = useMemo(() => {
    return budget.localCurrencyId && budget.reportingCurrencySekId
      ? filterRatesForPair(
          budget.localCurrencyId,
          budget.reportingCurrencySekId
        )
      : [];
  }, [budget.localCurrencyId, budget.reportingCurrencySekId, exchangeRates]);

  const localToEurRates = useMemo(() => {
    return budget.localCurrencyId && budget.reportingCurrencyEurId
      ? filterRatesForPair(
          budget.localCurrencyId,
          budget.reportingCurrencyEurId
        )
      : [];
  }, [budget.localCurrencyId, budget.reportingCurrencyEurId, exchangeRates]);

  const handleSave = async () => {
    const token = localStorage.getItem("authToken");

    // Clear previous errors
    setFormError("");
    setFieldErrors({});

    try {
      setLoading(true);

      // ✅ lightweight frontend validation (matches Budget behavior)
      const newFieldErrors = {};

      if (
        budget.totalAmount === "" ||
        budget.totalAmount == null ||
        Number(budget.totalAmount) <= 0
      ) {
        newFieldErrors.totalAmount = "Total amount must be greater than zero.";
      }

      if (!budget.localCurrencyId) {
        newFieldErrors.localCurrencyId = "Local currency is required.";
      }

      if (!budget.localExchangeRateToGbpId) {
        newFieldErrors.localExchangeRateToGbpId =
          "Local → GBP rate is required.";
      }

      if (!budget.reportingExchangeRateSekId) {
        newFieldErrors.reportingExchangeRateSekId =
          "SEK exchange rate is required.";
      }

      if (!budget.reportingExchangeRateEurId) {
        newFieldErrors.reportingExchangeRateEurId =
          "EUR exchange rate is required.";
      }

      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
        setFormError("Please correct the highlighted fields and try again.");
        return;
      }

      const payload = {
        projectId: selectedProjectId ? Number(selectedProjectId) : null,

        budgetDescription: budget.budgetDescription ?? "",
        budgetPreparationDate: budget.budgetPreparationDate || null,
        totalAmount:
          budget.totalAmount === "" || budget.totalAmount == null
            ? null
            : Number(budget.totalAmount),

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
        const text = await res.text().catch(() => "");

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) setFieldErrors(data.fieldErrors);
          setFormError(
            data.message || "There was a problem creating the budget."
          );
        } else {
          setFormError("There was a problem creating the budget.");
        }
        return;
      }

      const created = await res.json();
      onBudgetCreated?.(created);

      setFormError("");
      setFieldErrors({});
      onClose?.();
    } catch (err) {
      console.error("Create budget error:", err);
      setFormError("Unexpected error while creating budget.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        {/* Header like Budget */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create New Budget</h3>
            <p className={styles.pageSubtitle}>
              Fill in totals and select exchange rates for the selected project.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={handleSave}
              className={styles.saveButton}
              disabled={loading}
            >
              <FiSave />
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.deleteButton}
              disabled={loading}
              title="Cancel"
            >
              <FiX />
              Cancel
            </button>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {loading ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ) : (
          <div className={styles.grid}>
            {/* Left card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Summary</div>
                <div className={styles.cardMeta}>Description & totals</div>
              </div>

              <div className={styles.formGroup}>
                <label>Budget Description:</label>
                <textarea
                  name="budgetDescription"
                  className={styles.textareaInput}
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

              <div className={styles.row2}>
                <div className={styles.formGroup}>
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
                </div>

                <div className={styles.formGroup}>
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
            </div>

            {/* Right card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Currencies & rates</div>
                <div className={styles.cardMeta}>Local + reporting</div>
              </div>

              <div className={styles.row2}>
                <div className={styles.formGroup}>
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

                <div className={styles.formGroup}>
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

              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label>Reporting currency (SEK):</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={sekName}
                    readOnly
                  />
                </div>

                <div className={styles.formGroup}>
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

              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label>Reporting currency (EUR):</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={eurName}
                    readOnly
                  />
                </div>

                <div className={styles.formGroup}>
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
          </div>
        )}

        {/* Bottom actions (same as Budget/Project) */}
        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={handleSave}
            className={styles.saveButton}
            disabled={loading}
          >
            <FiSave />
            Create budget
          </button>
          <button
            type="button"
            onClick={onClose}
            className={styles.deleteButton}
            disabled={loading}
          >
            <FiX />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNewBudget;
