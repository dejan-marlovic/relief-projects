import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";

import styles from "./RestoreCurrency.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreCurrency = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedCurrencies, setDeletedCurrencies] = useState([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCurrency = useMemo(() => {
    const id = Number(selectedCurrencyId);
    if (!id) return null;

    return deletedCurrencies.find((currency) => currency.id === id) || null;
  }, [selectedCurrencyId, deletedCurrencies]);

  const loadDeletedCurrencies = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/currencies/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedCurrencies([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted currencies. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextCurrencies = Array.isArray(data) ? data : [];

      setDeletedCurrencies(nextCurrencies);

      if (
        selectedCurrencyId &&
        !nextCurrencies.some(
          (currency) => currency.id === Number(selectedCurrencyId),
        )
      ) {
        setSelectedCurrencyId("");
      }
    } catch (err) {
      console.error("Error loading deleted currencies:", err);
      setDeletedCurrencies([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted currencies. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedCurrencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedCurrency) {
        setFormError("Please select a deleted currency to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/currencies/${selectedCurrency.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the currency. Backend support may be missing.",
        );
        return;
      }

      setDeletedCurrencies((prev) =>
        prev.filter((currency) => currency.id !== selectedCurrency.id),
      );

      setSuccessMessage(
        `Currency "${selectedCurrency.name}" restored successfully.`,
      );
      setSelectedCurrencyId("");
    } catch (err) {
      console.error("Restore currency error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring currency. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Currency</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted currency and restore it.
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
                  <div className={styles.cardTitle}>
                    Choose deleted currency
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreCurrencySelect">
                    Deleted currency
                  </label>

                  <select
                    id="restoreCurrencySelect"
                    className={styles.textInput}
                    value={selectedCurrencyId}
                    onChange={(e) => {
                      setSelectedCurrencyId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted currency</option>

                    {deletedCurrencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} - {currency.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/currencies/deleted </code>
                  and
                  <code> PUT /api/currencies/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected currency details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedCurrency ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedCurrency.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Name</span>
                      <span className={styles.detailValue}>
                        {selectedCurrency.name}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Description</span>
                      <span className={styles.detailValue}>
                        {selectedCurrency.description}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted currency to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedCurrencies}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedCurrency}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore currency"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreCurrency;
