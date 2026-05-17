import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiTrendingUp,
} from "react-icons/fi";

import styles from "./RestoreExchangeRate.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreExchangeRate = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedExchangeRates, setDeletedExchangeRates] = useState([]);
  const [currenciesById, setCurrenciesById] = useState({});
  const [selectedExchangeRateId, setSelectedExchangeRateId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedExchangeRate = useMemo(() => {
    const id = Number(selectedExchangeRateId);
    if (!id) return null;

    return (
      deletedExchangeRates.find((exchangeRate) => exchangeRate.id === id) ||
      null
    );
  }, [selectedExchangeRateId, deletedExchangeRates]);

  const formatRateDate = (rateDate) => {
    if (!rateDate) return "N/A";

    return String(rateDate).replace("T", " ");
  };

  const getCurrencyLabel = (currencyId) => {
    if (!currencyId) return "N/A";

    const currency = currenciesById[currencyId];

    if (!currency) {
      return `Currency id: ${currencyId}`;
    }

    return currency.description
      ? `${currency.name} (${currency.description})`
      : currency.name;
  };

  const getExchangeRateLabel = (exchangeRate) => {
    const baseCurrencyLabel = getCurrencyLabel(exchangeRate.baseCurrencyId);
    const quoteCurrencyLabel = getCurrencyLabel(exchangeRate.quoteCurrencyId);

    return `${baseCurrencyLabel} → ${quoteCurrencyLabel}`;
  };

  const loadDeletedExchangeRates = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [exchangeRatesRes, currenciesRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/exchange-rates/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/currencies/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!exchangeRatesRes.ok && exchangeRatesRes.status !== 204) {
        const data = await safeReadJson(exchangeRatesRes);
        setDeletedExchangeRates([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted exchange rates. Backend support may be missing.",
        );
        return;
      }

      if (!currenciesRes.ok && currenciesRes.status !== 204) {
        const data = await safeReadJson(currenciesRes);
        setCurrenciesById({});
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load currencies for display names.",
        );
        return;
      }

      const exchangeRatesData = await safeReadJson(exchangeRatesRes);
      const currenciesData = await safeReadJson(currenciesRes);

      const nextExchangeRates = Array.isArray(exchangeRatesData)
        ? exchangeRatesData
        : [];

      const nextCurrencies = Array.isArray(currenciesData)
        ? currenciesData
        : [];

      const nextCurrenciesById = nextCurrencies.reduce((acc, currency) => {
        acc[currency.id] = currency;
        return acc;
      }, {});

      setDeletedExchangeRates(nextExchangeRates);
      setCurrenciesById(nextCurrenciesById);

      if (
        selectedExchangeRateId &&
        !nextExchangeRates.some(
          (exchangeRate) => exchangeRate.id === Number(selectedExchangeRateId),
        )
      ) {
        setSelectedExchangeRateId("");
      }
    } catch (err) {
      console.error("Error loading deleted exchange rates:", err);
      setDeletedExchangeRates([]);
      setCurrenciesById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted exchange rates. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedExchangeRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedExchangeRate) {
        setFormError("Please select a deleted exchange rate to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/exchange-rates/${selectedExchangeRate.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the exchange rate. Backend support may be missing.",
        );
        return;
      }

      setDeletedExchangeRates((prev) =>
        prev.filter(
          (exchangeRate) => exchangeRate.id !== selectedExchangeRate.id,
        ),
      );

      setSuccessMessage(
        `Exchange rate "${getExchangeRateLabel(
          selectedExchangeRate,
        )}" restored successfully.`,
      );
      setSelectedExchangeRateId("");
    } catch (err) {
      console.error("Restore exchange rate error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring exchange rate. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Exchange Rate</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted exchange rate and restore it.
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
            <FiTrendingUp />
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
                  <div className={styles.cardTitle}>
                    Choose deleted exchange rate
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreExchangeRateSelect">
                    Deleted exchange rate
                  </label>

                  <select
                    id="restoreExchangeRateSelect"
                    className={styles.textInput}
                    value={selectedExchangeRateId}
                    onChange={(e) => {
                      setSelectedExchangeRateId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted exchange rate</option>

                    {deletedExchangeRates.map((exchangeRate) => (
                      <option key={exchangeRate.id} value={exchangeRate.id}>
                        {getExchangeRateLabel(exchangeRate)} | rate:{" "}
                        {exchangeRate.rate} | date:{" "}
                        {formatRateDate(exchangeRate.rateDate)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/exchange-rates/deleted </code>,
                  <code> GET /api/currencies/active </code>
                  and
                  <code> PUT /api/exchange-rates/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected exchange rate details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedExchangeRate ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedExchangeRate.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Base currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(selectedExchangeRate.baseCurrencyId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Quote currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(selectedExchangeRate.quoteCurrencyId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Rate</span>
                      <span className={styles.detailValue}>
                        {selectedExchangeRate.rate}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Rate date</span>
                      <span className={styles.detailValue}>
                        {formatRateDate(selectedExchangeRate.rateDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted exchange rate to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedExchangeRates}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedExchangeRate}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore exchange rate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreExchangeRate;
