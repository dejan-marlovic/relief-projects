import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";

import styles from "./RestoreBudget.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreBudget = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedBudgets, setDeletedBudgets] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [currenciesById, setCurrenciesById] = useState({});
  const [exchangeRatesById, setExchangeRatesById] = useState({});

  const [selectedBudgetId, setSelectedBudgetId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedBudget = useMemo(() => {
    const id = Number(selectedBudgetId);
    if (!id) return null;

    return deletedBudgets.find((budget) => budget.id === id) || null;
  }, [selectedBudgetId, deletedBudgets]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    return String(value).replace("T", " ");
  };

  const getProjectLabel = (projectId) => {
    if (!projectId) return "N/A";

    const project = projectsById[projectId];

    if (!project) {
      return `Project id: ${projectId}`;
    }

    const code = project.projectCode ? `${project.projectCode} - ` : "";

    return `${code}${project.projectName || `Project id: ${projectId}`}`;
  };

  const getCurrencyLabel = (currencyId) => {
    if (!currencyId) return "N/A";

    const currency = currenciesById[currencyId];

    if (!currency) {
      return `Currency id: ${currencyId}`;
    }

    return currency.description
      ? `${currency.name} (${currency.description})`
      : currency.name || `Currency id: ${currencyId}`;
  };

  const getExchangeRateLabel = (exchangeRateId) => {
    if (!exchangeRateId) return "N/A";

    const exchangeRate = exchangeRatesById[exchangeRateId];

    if (!exchangeRate) {
      return `Exchange rate id: ${exchangeRateId}`;
    }

    const baseCurrency = getCurrencyLabel(exchangeRate.baseCurrencyId);
    const quoteCurrency = getCurrencyLabel(exchangeRate.quoteCurrencyId);
    const rate = exchangeRate.rate || "N/A";
    const date = formatDate(exchangeRate.rateDate);

    return `${baseCurrency} → ${quoteCurrency} | rate: ${rate} | date: ${date}`;
  };

  const getAmountLabel = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return "N/A";
    }

    return amount;
  };

  const getBudgetLabel = (budget) => {
    if (!budget) return "N/A";

    const project = getProjectLabel(budget.projectId);
    const amount = getAmountLabel(budget.totalAmount);
    const currency = getCurrencyLabel(budget.localCurrencyId);
    const date = formatDate(budget.budgetPreparationDate);

    return `${project} | amount: ${amount} ${currency} | date: ${date}`;
  };

  const loadDeletedBudgets = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [budgetsRes, projectsRes, currenciesRes, exchangeRatesRes] =
        await Promise.all([
          authFetch(`${BASE_URL}/api/budgets/deleted`, {
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

      if (!budgetsRes.ok && budgetsRes.status !== 204) {
        const data = await safeReadJson(budgetsRes);
        setDeletedBudgets([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted budgets. Backend support may be missing.",
        );
        return;
      }

      const budgetsData = await safeReadJson(budgetsRes);
      const nextBudgets = Array.isArray(budgetsData) ? budgetsData : [];

      let nextProjectsById = {};
      let nextCurrenciesById = {};
      let nextExchangeRatesById = {};

      if (projectsRes.ok || projectsRes.status === 204) {
        const projectsData = await safeReadJson(projectsRes);
        const nextProjects = Array.isArray(projectsData) ? projectsData : [];
        nextProjectsById = buildLookupById(nextProjects);
      }

      if (currenciesRes.ok || currenciesRes.status === 204) {
        const currenciesData = await safeReadJson(currenciesRes);
        const nextCurrencies = Array.isArray(currenciesData)
          ? currenciesData
          : [];
        nextCurrenciesById = buildLookupById(nextCurrencies);
      }

      if (exchangeRatesRes.ok || exchangeRatesRes.status === 204) {
        const exchangeRatesData = await safeReadJson(exchangeRatesRes);
        const nextExchangeRates = Array.isArray(exchangeRatesData)
          ? exchangeRatesData
          : [];
        nextExchangeRatesById = buildLookupById(nextExchangeRates);
      }

      setDeletedBudgets(nextBudgets);
      setProjectsById(nextProjectsById);
      setCurrenciesById(nextCurrenciesById);
      setExchangeRatesById(nextExchangeRatesById);

      if (
        selectedBudgetId &&
        !nextBudgets.some((budget) => budget.id === Number(selectedBudgetId))
      ) {
        setSelectedBudgetId("");
      }
    } catch (err) {
      console.error("Error loading deleted budgets:", err);
      setDeletedBudgets([]);
      setProjectsById({});
      setCurrenciesById({});
      setExchangeRatesById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted budgets. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedBudget) {
        setFormError("Please select a deleted budget to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/budgets/${selectedBudget.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the budget. Backend support may be missing.",
        );
        return;
      }

      setDeletedBudgets((prev) =>
        prev.filter((budget) => budget.id !== selectedBudget.id),
      );

      setSuccessMessage(
        `Budget for "${getProjectLabel(
          selectedBudget.projectId,
        )}" restored successfully.`,
      );
      setSelectedBudgetId("");
    } catch (err) {
      console.error("Restore budget error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring budget. Backend support may be missing.",
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className={styles.restoreContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Restore Budget</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted budget and restore it.
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
            <FiDollarSign />
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
                  <div className={styles.cardTitle}>Choose deleted budget</div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreBudgetSelect">Deleted budget</label>

                  <select
                    id="restoreBudgetSelect"
                    className={styles.textInput}
                    value={selectedBudgetId}
                    onChange={(e) => {
                      setSelectedBudgetId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted budget</option>

                    {deletedBudgets.map((budget) => (
                      <option key={budget.id} value={budget.id}>
                        {getBudgetLabel(budget)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/budgets/deleted </code>,
                  <code> GET /api/projects/active </code>,
                  <code> GET /api/currencies/active </code>,
                  <code> GET /api/exchange-rates/active </code>
                  and
                  <code> PUT /api/budgets/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected budget details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedBudget ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedBudget.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project</span>
                      <span className={styles.detailValue}>
                        {getProjectLabel(selectedBudget.projectId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Description</span>
                      <span className={styles.detailValue}>
                        {selectedBudget.budgetDescription || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Preparation date
                      </span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedBudget.budgetPreparationDate)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Total amount</span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedBudget.totalAmount)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Local currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(selectedBudget.localCurrencyId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Local currency to GBP
                      </span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(selectedBudget.localCurrencyToGbpId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Reporting currency SEK
                      </span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(
                          selectedBudget.reportingCurrencySekId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Reporting currency EUR
                      </span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(
                          selectedBudget.reportingCurrencyEurId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Local exchange rate
                      </span>
                      <span className={styles.detailValue}>
                        {getExchangeRateLabel(
                          selectedBudget.localExchangeRateId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Local to GBP rate
                      </span>
                      <span className={styles.detailValue}>
                        {getExchangeRateLabel(
                          selectedBudget.localExchangeRateToGbpId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        SEK exchange rate
                      </span>
                      <span className={styles.detailValue}>
                        {getExchangeRateLabel(
                          selectedBudget.reportingExchangeRateSekId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        EUR exchange rate
                      </span>
                      <span className={styles.detailValue}>
                        {getExchangeRateLabel(
                          selectedBudget.reportingExchangeRateEurId,
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted budget to preview details before restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedBudgets}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedBudget}
              >
                <FiRotateCcw /> {restoring ? "Restoring..." : "Restore budget"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreBudget;
