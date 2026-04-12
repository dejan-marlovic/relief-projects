import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiTrendingUp,
} from "react-icons/fi";

import styles from "./DeleteExchangeRate.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteExchangeRate = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [exchangeRates, setExchangeRates] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedExchangeRateId, setSelectedExchangeRateId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currencyNameById = useMemo(() => {
    return currencies.reduce((acc, currency) => {
      acc[currency.id] = currency.name;
      return acc;
    }, {});
  }, [currencies]);

  const selectedExchangeRate = useMemo(() => {
    const id = Number(selectedExchangeRateId);
    if (!id) return null;
    return exchangeRates.find((exchangeRate) => exchangeRate.id === id) || null;
  }, [selectedExchangeRateId, exchangeRates]);

  const formatRateDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
  };

  const getCurrencyLabel = (currencyId) => {
    if (!currencyId) return "N/A";
    return currencyNameById[currencyId] || `Currency id: ${currencyId}`;
  };

  const loadCurrencies = async () => {
    const res = await authFetch(`${BASE_URL}/api/currencies/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active currencies.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadExchangeRates = async () => {
    const res = await authFetch(`${BASE_URL}/api/exchange-rates/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message ||
          data?.detail ||
          "Failed to load active exchange rates.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [nextCurrencies, nextExchangeRates] = await Promise.all([
        loadCurrencies(),
        loadExchangeRates(),
      ]);

      setCurrencies(nextCurrencies);
      setExchangeRates(nextExchangeRates);

      if (
        selectedExchangeRateId &&
        !nextExchangeRates.some(
          (exchangeRate) => exchangeRate.id === Number(selectedExchangeRateId),
        )
      ) {
        setSelectedExchangeRateId("");
      }
    } catch (err) {
      console.error("Error loading exchange-rate delete data:", err);
      setCurrencies([]);
      setExchangeRates([]);
      setFormError(err?.message || "Unexpected error while loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedExchangeRateId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedExchangeRate) {
        setFormError("Please select an exchange rate to delete.");
        return;
      }

      const baseLabel = getCurrencyLabel(selectedExchangeRate.baseCurrencyId);
      const quoteLabel = getCurrencyLabel(selectedExchangeRate.quoteCurrencyId);

      const confirmed = window.confirm(
        `Are you sure you want to delete exchange rate "${baseLabel} -> ${quoteLabel}" (id: ${selectedExchangeRate.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/exchange-rates/${selectedExchangeRate.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Exchange rate was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to delete the exchange rate.",
        );
        return;
      }

      const deletedExchangeRateLabel = `${baseLabel} -> ${quoteLabel}`;

      setExchangeRates((prev) =>
        prev.filter(
          (exchangeRate) => exchangeRate.id !== selectedExchangeRate.id,
        ),
      );
      setSelectedExchangeRateId("");
      setSuccessMessage(
        `Exchange rate "${deletedExchangeRateLabel}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete exchange rate error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting exchange rate.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedExchangeRateId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Exchange Rate</h3>
            <p className={styles.pageSubtitle}>
              Select an active exchange rate and soft delete it.
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
                  <div className={styles.cardTitle}>Choose exchange rate</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/exchange-rates/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteExchangeRateSelect">
                    Exchange rate
                  </label>
                  <select
                    id="deleteExchangeRateSelect"
                    className={inputClass}
                    value={selectedExchangeRateId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select exchange rate</option>
                    {exchangeRates.map((exchangeRate) => (
                      <option key={exchangeRate.id} value={exchangeRate.id}>
                        {getCurrencyLabel(exchangeRate.baseCurrencyId)} →{" "}
                        {getCurrencyLabel(exchangeRate.quoteCurrencyId)} | Rate:{" "}
                        {exchangeRate.rate} | Date:{" "}
                        {formatRateDate(exchangeRate.rateDate)} | Id:{" "}
                        {exchangeRate.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active exchange rates are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected exchange rate details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the exchange rate is soft deleted through
                      <code> @SQLDelete </code>
                      which updates
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select an exchange rate to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedExchangeRate}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete exchange rate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteExchangeRate;
