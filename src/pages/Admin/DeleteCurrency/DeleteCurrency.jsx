import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";

import styles from "./DeleteCurrency.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteCurrency = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCurrency = useMemo(() => {
    const id = Number(selectedCurrencyId);
    if (!id) return null;
    return currencies.find((currency) => currency.id === id) || null;
  }, [selectedCurrencyId, currencies]);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/currencies/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setCurrencies([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active currencies.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextCurrencies = Array.isArray(data) ? data : [];

      setCurrencies(nextCurrencies);

      if (
        selectedCurrencyId &&
        !nextCurrencies.some(
          (currency) => currency.id === Number(selectedCurrencyId),
        )
      ) {
        setSelectedCurrencyId("");
      }
    } catch (err) {
      console.error("Error loading currencies:", err);
      setCurrencies([]);
      setFormError(
        err?.message || "Unexpected error while loading currencies.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedCurrencyId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedCurrency) {
        setFormError("Please select a currency to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete currency "${selectedCurrency.name}" (id: ${selectedCurrency.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/currencies/${selectedCurrency.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Currency was not found. It may already have been deleted.",
        );
        await loadCurrencies();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the currency.",
        );
        return;
      }

      const deletedCurrencyName = selectedCurrency.name;

      setCurrencies((prev) =>
        prev.filter((currency) => currency.id !== selectedCurrency.id),
      );
      setSelectedCurrencyId("");
      setSuccessMessage(
        `Currency "${deletedCurrencyName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete currency error:", err);
      setFormError(err?.message || "Unexpected error while deleting currency.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedCurrencyId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Currency</h3>
            <p className={styles.pageSubtitle}>
              Select an active currency and soft delete it.
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
                  <div className={styles.cardTitle}>Choose currency</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/currencies/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteCurrencySelect">Currency</label>
                  <select
                    id="deleteCurrencySelect"
                    className={inputClass}
                    value={selectedCurrencyId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} ({currency.description}) - id:{" "}
                        {currency.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active currencies are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected currency details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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
                        {selectedCurrency.description || "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the currency is soft deleted through
                      <code> @SQLDelete </code>
                      which updates
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a currency to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadCurrencies}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedCurrency}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete currency"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteCurrency;
