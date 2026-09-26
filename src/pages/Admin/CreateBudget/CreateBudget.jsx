import { budgetLimitError } from "../../../utils/budgetLimit";
import { normalizeBudgetName, budgetNameError } from "../../../utils/budgetDisplay";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";
import ErrorBanner from "../../../components/ErrorBanner/ErrorBanner";

const initialForm = {
  projectId: "",
  budgetName: "",
  budgetDescription: "",
  budgetPreparationDate: "",
  totalAmount: "",
  localCurrencyId: "",
  localCurrencyToGbpId: "",
  reportingCurrencySekId: "",
  reportingCurrencyEurId: "",
  localExchangeRateId: "",
  localExchangeRateToGbpId: "",
  reportingExchangeRateSekId: "",
  reportingExchangeRateEurId: "",
};

const validate = (values) => {
  const errors = {};
  const nameError = budgetNameError(values.budgetName);
  if (nameError) errors.budgetName = nameError;
  if (!values.projectId) errors.projectId = "Project is required.";
  if (budgetLimitError(values.totalAmount)) errors.totalAmount = budgetLimitError(values.totalAmount);
  if (!values.localCurrencyId)
    errors.localCurrencyId = "Local currency is required.";
  if (!values.localExchangeRateToGbpId) {
    errors.localExchangeRateToGbpId = "Local to GBP exchange rate is required.";
  }
  if (!values.reportingExchangeRateSekId) {
    errors.reportingExchangeRateSekId =
      "Reporting exchange rate is required.";
  }
  if (!values.reportingExchangeRateEurId) {
    errors.reportingExchangeRateEurId =
      "Reporting EUR exchange rate is required.";
  }
  return errors;
};

const CreateBudget = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const [projects, setProjects] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);

  const currencyNameById = useMemo(() => {
    return currencies.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }, [currencies]);

  const exchangeRateLabel = (rate) => {
    const base =
      currencyNameById[rate.baseCurrencyId] || `#${rate.baseCurrencyId}`;
    const quote =
      currencyNameById[rate.quoteCurrencyId] || `#${rate.quoteCurrencyId}`;
    return `${base} → ${quote} | rate: ${rate.rate} | id: ${rate.id}`;
  };

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingLists(true);

        const [projectRes, currencyRes, exchangeRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/projects/active`),
          authFetch(`${BASE_URL}/api/currencies/active`),
          authFetch(`${BASE_URL}/api/exchange-rates/active`),
        ]);

        const [projectData, currencyData, exchangeData] = await Promise.all([
          safeReadJson(projectRes),
          safeReadJson(currencyRes),
          safeReadJson(exchangeRes),
        ]);

        setProjects(Array.isArray(projectData) ? projectData : []);
        setCurrencies(Array.isArray(currencyData) ? currencyData : []);
        setExchangeRates(Array.isArray(exchangeData) ? exchangeData : []);
      } catch (err) {
        console.error("Error loading budget form data:", err);
        setFormError("Failed to load related data.");
      } finally {
        setLoadingLists(false);
      }
    };

    loadData();
  }, [authFetch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "localCurrencyId") for (const field of ["localExchangeRateToGbpId", "reportingExchangeRateSekId", "reportingExchangeRateEurId"]) next[field] = "";
      const rateField = { localCurrencyToGbpId: "localExchangeRateToGbpId", reportingCurrencySekId: "reportingExchangeRateSekId", reportingCurrencyEurId: "reportingExchangeRateEurId" }[name];
      if (rateField) next[rateField] = "";
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const resetForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setFormError("");
  };

  const toNullableNumber = (value) => (value ? Number(value) : null);

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const payload = {
        projectId: Number(form.projectId),
        budgetName: normalizeBudgetName(form.budgetName),
        budgetDescription: form.budgetDescription.trim(),
        budgetPreparationDate: form.budgetPreparationDate || null,
        totalAmount: form.totalAmount,
        localCurrencyId: Number(form.localCurrencyId),
        localCurrencyToGbpId: toNullableNumber(form.localCurrencyToGbpId),
        reportingCurrencySekId: toNullableNumber(form.reportingCurrencySekId),
        reportingCurrencyEurId: toNullableNumber(form.reportingCurrencyEurId),
        localExchangeRateId: toNullableNumber(form.localExchangeRateId),
        localExchangeRateToGbpId: Number(form.localExchangeRateToGbpId),
        reportingExchangeRateSekId: Number(form.reportingExchangeRateSekId),
        reportingExchangeRateEurId: Number(form.reportingExchangeRateEurId),
      };

      const res = await authFetch(`${BASE_URL}/api/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFieldErrors(data?.fieldErrors || {});
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the budget.",
        );
        return;
      }

      // Successful mutations are announced by the shared notification banner.
      resetForm();
    } catch (err) {
      console.error("Create budget error:", err);
      setFormError(err?.message || "Unexpected error while creating budget.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingLists) {
    return (
      <div className={styles.createContainer}>
        <div className={styles.formContainer}>
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Budget</h3>
            <p className={styles.pageSubtitle}>
              Create a budget linked to project, currencies and exchange rates.
            </p>
          </div>
        </div>

        {formError && (
          <ErrorBanner message={formError} onDismiss={() => setFormError("")} />
        )}

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Budget basics</div>
              <div className={styles.cardMeta}>Project and totals</div>
            </div>

            <div className={styles.formGroup}>
              <label>Project</label>
              <select
                className={inputClass("projectId")}
                name="projectId"
                value={form.projectId}
                onChange={handleChange}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} (id: {p.id})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor={`budget-name-${form.id || form.selectedId || "new"}`}>Budget name</label>
                <input id={`budget-name-${form.id || form.selectedId || "new"}`} name="budgetName" value={form.budgetName || ""} onChange={handleChange} className={inputClass("budgetName")} required aria-invalid={Boolean(fieldErrors.budgetName)} aria-describedby={`budget-name-error-${form.id || form.selectedId || "new"}`} placeholder="e.g. Water supply 2026" />
                <span id={`budget-name-error-${form.id || form.selectedId || "new"}`} className={styles.fieldError}>{fieldErrors.budgetName}</span>
              </div>

              <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                className={inputClass("budgetDescription")}
                name="budgetDescription"
                value={form.budgetDescription}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Preparation date</label>
              <input
                className={inputClass("budgetPreparationDate")}
                type="datetime-local"
                name="budgetPreparationDate"
                value={form.budgetPreparationDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Budget limit (local currency)</label>
              <input
                className={inputClass("totalAmount")}
                type="number"
                name="totalAmount" min="0.001" step="any"
                value={form.totalAmount}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Currencies</div>
              <div className={styles.cardMeta}>Main currency settings</div>
            </div>

            <div className={styles.formGroup}>
              <label>Local currency</label>
              <select
                className={inputClass("localCurrencyId")}
                name="localCurrencyId"
                value={form.localCurrencyId}
                onChange={handleChange}
              >
                <option value="">Select local currency</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.description}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Local currency to GBP</label>
              <select
                className={inputClass("localCurrencyToGbpId")}
                name="localCurrencyToGbpId"
                value={form.localCurrencyToGbpId}
                onChange={handleChange}
              >
                <option value="">Optional</option>
                {currencies.filter((c) => (c.name || "").toUpperCase() === "GBP").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.description}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Reporting currency</label>
              <select
                className={inputClass("reportingCurrencySekId")}
                name="reportingCurrencySekId"
                value={form.reportingCurrencySekId}
                onChange={handleChange}
              >
                <option value="">Optional</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.description}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Reporting currency EUR</label>
              <select
                className={inputClass("reportingCurrencyEurId")}
                name="reportingCurrencyEurId"
                value={form.reportingCurrencyEurId}
                onChange={handleChange}
              >
                <option value="">Optional</option>
                {currencies.filter((c) => (c.name || "").toUpperCase() === "EUR").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Exchange rates</div>
              <div className={styles.cardMeta}>Rate references</div>
            </div>

            <div className={styles.formGroup}>
              <label>Local exchange rate</label>
              <select
                className={inputClass("localExchangeRateId")}
                name="localExchangeRateId"
                value={form.localExchangeRateId}
                onChange={handleChange}
              >
                <option value="">Optional</option>
                {exchangeRates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {exchangeRateLabel(r)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Local exchange rate to GBP</label>
              <select
                className={inputClass("localExchangeRateToGbpId")}
                name="localExchangeRateToGbpId"
                value={form.localExchangeRateToGbpId}
                onChange={handleChange}
              >
                <option value="">Select exchange rate</option>
                {exchangeRates.filter((r) => String(r.baseCurrencyId) === String(form.localCurrencyId) && (!form.localCurrencyToGbpId || String(r.quoteCurrencyId) === String(form.localCurrencyToGbpId)) && Number(r.rate) > 0 && (r.baseCurrencyId !== r.quoteCurrencyId || Number(r.rate) === 1) && (currencyNameById[r.quoteCurrencyId] || "").toUpperCase() === "GBP").map((r) => (
                  <option key={r.id} value={r.id}>
                    {exchangeRateLabel(r)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Reporting exchange rate</label>
              <select
                className={inputClass("reportingExchangeRateSekId")}
                name="reportingExchangeRateSekId"
                value={form.reportingExchangeRateSekId}
                onChange={handleChange}
              >
                <option value="">Select exchange rate</option>
                {exchangeRates.filter((r) => String(r.baseCurrencyId) === String(form.localCurrencyId) && (!form.reportingCurrencySekId || String(r.quoteCurrencyId) === String(form.reportingCurrencySekId)) && Number(r.rate) > 0 && (r.baseCurrencyId !== r.quoteCurrencyId || Number(r.rate) === 1)).map((r) => (
                  <option key={r.id} value={r.id}>
                    {exchangeRateLabel(r)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Reporting exchange rate EUR</label>
              <select
                className={inputClass("reportingExchangeRateEurId")}
                name="reportingExchangeRateEurId"
                value={form.reportingExchangeRateEurId}
                onChange={handleChange}
              >
                <option value="">Select exchange rate</option>
                {exchangeRates.filter((r) => String(r.baseCurrencyId) === String(form.localCurrencyId) && (!form.reportingCurrencyEurId || String(r.quoteCurrencyId) === String(form.reportingCurrencyEurId)) && Number(r.rate) > 0 && (r.baseCurrencyId !== r.quoteCurrencyId || Number(r.rate) === 1) && (currencyNameById[r.quoteCurrencyId] || "").toUpperCase() === "EUR").map((r) => (
                  <option key={r.id} value={r.id}>
                    {exchangeRateLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={handleCreate}
            className={styles.saveButton}
            disabled={loading}
          >
            <FiSave /> Create budget
          </button>

          <button
            type="button"
            onClick={resetForm}
            className={styles.deleteButton}
            disabled={loading}
          >
            <FiX /> Reset form
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBudget;
