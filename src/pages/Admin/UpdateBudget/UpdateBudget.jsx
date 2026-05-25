import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "../UpdateUser/UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

const initialForm = {
  selectedId: "",
  projectId: "",
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

const toInputDateTime = (value) => {
  if (!value) return "";
  try {
    return String(value).slice(0, 16);
  } catch {
    return "";
  }
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select a budget.";
  if (!values.projectId) errors.projectId = "Project is required.";
  if (!values.totalAmount || Number(values.totalAmount) <= 0) {
    errors.totalAmount = "Total amount must be greater than zero.";
  }
  if (!values.localCurrencyId)
    errors.localCurrencyId = "Local currency is required.";
  if (!values.localExchangeRateToGbpId) {
    errors.localExchangeRateToGbpId = "Local → GBP exchange rate is required.";
  }
  if (!values.reportingExchangeRateSekId) {
    errors.reportingExchangeRateSekId = "SEK exchange rate is required.";
  }
  if (!values.reportingExchangeRateEurId) {
    errors.reportingExchangeRateEurId = "EUR exchange rate is required.";
  }

  return errors;
};

const UpdateBudget = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedBudget = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return budgets.find((item) => item.id === id) || null;
  }, [form.selectedId, budgets]);

  const projectNameById = useMemo(() => {
    return projects.reduce((acc, item) => {
      acc[item.id] = item.projectName || item.name || `Project #${item.id}`;
      return acc;
    }, {});
  }, [projects]);

  const currencyNameById = useMemo(() => {
    return currencies.reduce((acc, item) => {
      acc[item.id] = item.name || `Currency #${item.id}`;
      return acc;
    }, {});
  }, [currencies]);

  const exchangeRateLabel = (rate) => {
    const base =
      currencyNameById[rate.baseCurrencyId] || `#${rate.baseCurrencyId}`;
    const quote =
      currencyNameById[rate.quoteCurrencyId] || `#${rate.quoteCurrencyId}`;
    const date = rate.rateDate ? String(rate.rateDate).slice(0, 10) : "no date";
    return `${base} → ${quote} | rate: ${rate.rate} | ${date} (id: ${rate.id})`;
  };

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [budgetRes, projectRes, currencyRes, exchangeRateRes] =
        await Promise.all([
          authFetch(`${BASE_URL}/api/budgets/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/projects/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/currencies/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/exchange-rates/active`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

      const budgetData = await safeReadJson(budgetRes);
      const projectData = await safeReadJson(projectRes);
      const currencyData = await safeReadJson(currencyRes);
      const exchangeRateData = await safeReadJson(exchangeRateRes);

      setBudgets(Array.isArray(budgetData) ? budgetData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setCurrencies(Array.isArray(currencyData) ? currencyData : []);
      setExchangeRates(Array.isArray(exchangeRateData) ? exchangeRateData : []);
    } catch (err) {
      console.error("Load budgets error:", err);
      setBudgets([]);
      setProjects([]);
      setCurrencies([]);
      setExchangeRates([]);
      setFormError(
        err?.message || "Unexpected error while loading budget data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    if (!selectedId) {
      setForm(initialForm);
      return;
    }

    const selected = budgets.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      projectId: selected?.projectId ? String(selected.projectId) : "",
      budgetDescription: selected?.budgetDescription || "",
      budgetPreparationDate: toInputDateTime(selected?.budgetPreparationDate),
      totalAmount:
        selected?.totalAmount !== undefined && selected?.totalAmount !== null
          ? String(selected.totalAmount)
          : "",
      localCurrencyId: selected?.localCurrencyId
        ? String(selected.localCurrencyId)
        : "",
      localCurrencyToGbpId: selected?.localCurrencyToGbpId
        ? String(selected.localCurrencyToGbpId)
        : "",
      reportingCurrencySekId: selected?.reportingCurrencySekId
        ? String(selected.reportingCurrencySekId)
        : "",
      reportingCurrencyEurId: selected?.reportingCurrencyEurId
        ? String(selected.reportingCurrencyEurId)
        : "",
      localExchangeRateId: selected?.localExchangeRateId
        ? String(selected.localExchangeRateId)
        : "",
      localExchangeRateToGbpId: selected?.localExchangeRateToGbpId
        ? String(selected.localExchangeRateToGbpId)
        : "",
      reportingExchangeRateSekId: selected?.reportingExchangeRateSekId
        ? String(selected.reportingExchangeRateSekId)
        : "",
      reportingExchangeRateEurId: selected?.reportingExchangeRateEurId
        ? String(selected.reportingExchangeRateEurId)
        : "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedBudget) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedBudget.id),
      projectId: selectedBudget.projectId
        ? String(selectedBudget.projectId)
        : "",
      budgetDescription: selectedBudget.budgetDescription || "",
      budgetPreparationDate: toInputDateTime(
        selectedBudget.budgetPreparationDate,
      ),
      totalAmount:
        selectedBudget.totalAmount !== undefined &&
        selectedBudget.totalAmount !== null
          ? String(selectedBudget.totalAmount)
          : "",
      localCurrencyId: selectedBudget.localCurrencyId
        ? String(selectedBudget.localCurrencyId)
        : "",
      localCurrencyToGbpId: selectedBudget.localCurrencyToGbpId
        ? String(selectedBudget.localCurrencyToGbpId)
        : "",
      reportingCurrencySekId: selectedBudget.reportingCurrencySekId
        ? String(selectedBudget.reportingCurrencySekId)
        : "",
      reportingCurrencyEurId: selectedBudget.reportingCurrencyEurId
        ? String(selectedBudget.reportingCurrencyEurId)
        : "",
      localExchangeRateId: selectedBudget.localExchangeRateId
        ? String(selectedBudget.localExchangeRateId)
        : "",
      localExchangeRateToGbpId: selectedBudget.localExchangeRateToGbpId
        ? String(selectedBudget.localExchangeRateToGbpId)
        : "",
      reportingExchangeRateSekId: selectedBudget.reportingExchangeRateSekId
        ? String(selectedBudget.reportingExchangeRateSekId)
        : "",
      reportingExchangeRateEurId: selectedBudget.reportingExchangeRateEurId
        ? String(selectedBudget.reportingExchangeRateEurId)
        : "",
    });

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    try {
      setFormError("");
      setSuccessMessage("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setSaving(true);

      const payload = {
        projectId: Number(form.projectId),
        budgetDescription: form.budgetDescription.trim(),
        budgetPreparationDate: form.budgetPreparationDate || null,
        totalAmount: Number(form.totalAmount),
        localCurrencyId: Number(form.localCurrencyId),
        localCurrencyToGbpId: form.localCurrencyToGbpId
          ? Number(form.localCurrencyToGbpId)
          : null,
        reportingCurrencySekId: form.reportingCurrencySekId
          ? Number(form.reportingCurrencySekId)
          : null,
        reportingCurrencyEurId: form.reportingCurrencyEurId
          ? Number(form.reportingCurrencyEurId)
          : null,
        localExchangeRateId: form.localExchangeRateId
          ? Number(form.localExchangeRateId)
          : null,
        localExchangeRateToGbpId: Number(form.localExchangeRateToGbpId),
        reportingExchangeRateSekId: Number(form.reportingExchangeRateSekId),
        reportingExchangeRateEurId: Number(form.reportingExchangeRateEurId),
      };

      const res = await authFetch(
        `${BASE_URL}/api/budgets/${Number(form.selectedId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await safeReadJson(res);

      if (!res.ok) {
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem updating the budget.",
        );
        return;
      }

      setBudgets((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                ...payload,
                id: item.id,
              }
            : item,
        ),
      );

      setSuccessMessage("Budget updated successfully.");
    } catch (err) {
      console.error("Update budget error:", err);
      setFormError(err?.message || "Unexpected error while updating budget.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Budget</h3>
            <p className={styles.pageSubtitle}>
              Select an active budget and update its values and references.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            <FiEdit3 />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Choose budget</div>
                  <div className={styles.cardMeta}>Readable project labels</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Budget</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select budget</option>
                    {budgets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {projectNameById[item.projectId] ||
                          `Project #${item.projectId}`}{" "}
                        - total: {item.totalAmount} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBudget && (
                  <div className={styles.mutedHint}>
                    Project:{" "}
                    {projectNameById[selectedBudget.projectId] ||
                      `Project #${selectedBudget.projectId}`}
                  </div>
                )}
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>
                    Project, amounts, currencies and rates
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project</label>
                  <select
                    className={inputClass("projectId")}
                    name="projectId"
                    value={form.projectId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select project</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.projectName || item.name || `Project #${item.id}`}{" "}
                        (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Budget description</label>
                  <input
                    className={inputClass("budgetDescription")}
                    name="budgetDescription"
                    value={form.budgetDescription}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Budget preparation date</label>
                  <input
                    className={inputClass("budgetPreparationDate")}
                    type="datetime-local"
                    name="budgetPreparationDate"
                    value={form.budgetPreparationDate}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Total amount</label>
                  <input
                    className={inputClass("totalAmount")}
                    type="number"
                    step="0.01"
                    name="totalAmount"
                    value={form.totalAmount}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Local currency</label>
                  <select
                    className={inputClass("localCurrencyId")}
                    name="localCurrencyId"
                    value={form.localCurrencyId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.description} (id: {item.id})
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
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.description} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Reporting currency SEK</label>
                  <select
                    className={inputClass("reportingCurrencySekId")}
                    name="reportingCurrencySekId"
                    value={form.reportingCurrencySekId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.description} (id: {item.id})
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
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.description} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Local exchange rate</label>
                  <select
                    className={inputClass("localExchangeRateId")}
                    name="localExchangeRateId"
                    value={form.localExchangeRateId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select exchange rate</option>
                    {exchangeRates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {exchangeRateLabel(item)}
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
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select exchange rate</option>
                    {exchangeRates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {exchangeRateLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Reporting exchange rate SEK</label>
                  <select
                    className={inputClass("reportingExchangeRateSekId")}
                    name="reportingExchangeRateSekId"
                    value={form.reportingExchangeRateSekId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select exchange rate</option>
                    {exchangeRates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {exchangeRateLabel(item)}
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
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select exchange rate</option>
                    {exchangeRates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {exchangeRateLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || saving}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={resetForm}
                className={styles.secondaryButton}
                disabled={saving}
              >
                <FiRefreshCw /> Reset form
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className={styles.saveButton}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Update budget"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateBudget;
