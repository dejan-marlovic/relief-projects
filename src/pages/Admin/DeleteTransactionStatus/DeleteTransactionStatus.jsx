import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiRepeat } from "react-icons/fi";

import styles from "./DeleteTransactionStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteTransactionStatus = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [transactionStatuses, setTransactionStatuses] = useState([]);
  const [selectedTransactionStatusId, setSelectedTransactionStatusId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedTransactionStatus = useMemo(() => {
    const id = Number(selectedTransactionStatusId);
    if (!id) return null;
    return transactionStatuses.find((status) => status.id === id) || null;
  }, [selectedTransactionStatusId, transactionStatuses]);

  const loadTransactionStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(
        `${BASE_URL}/api/transaction-statuses/active`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setTransactionStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load active transaction statuses.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextTransactionStatuses = Array.isArray(data) ? data : [];

      setTransactionStatuses(nextTransactionStatuses);

      if (
        selectedTransactionStatusId &&
        !nextTransactionStatuses.some(
          (status) => status.id === Number(selectedTransactionStatusId),
        )
      ) {
        setSelectedTransactionStatusId("");
      }
    } catch (err) {
      console.error("Error loading transaction statuses:", err);
      setTransactionStatuses([]);
      setFormError(
        err?.message || "Unexpected error while loading transaction statuses.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactionStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedTransactionStatusId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedTransactionStatus) {
        setFormError("Please select a transaction status to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete transaction status "${selectedTransactionStatus.transactionStatusName}" (id: ${selectedTransactionStatus.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/transaction-statuses/${selectedTransactionStatus.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Transaction status was not found. It may already have been deleted.",
        );
        await loadTransactionStatuses();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to delete the transaction status.",
        );
        return;
      }

      const deletedStatusName = selectedTransactionStatus.transactionStatusName;

      setTransactionStatuses((prev) =>
        prev.filter((status) => status.id !== selectedTransactionStatus.id),
      );
      setSelectedTransactionStatusId("");
      setSuccessMessage(
        `Transaction status "${deletedStatusName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete transaction status error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting transaction status.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${
    formError && !selectedTransactionStatusId ? styles.inputError : ""
  }`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Transaction Status</h3>
            <p className={styles.pageSubtitle}>
              Select an active transaction status and soft delete it.
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
            <FiRepeat />
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
                    Choose transaction status
                  </div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/transaction-statuses/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteTransactionStatusSelect">
                    Transaction status
                  </label>
                  <select
                    id="deleteTransactionStatusSelect"
                    className={inputClass}
                    value={selectedTransactionStatusId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select transaction status</option>
                    {transactionStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.transactionStatusName} (id: {status.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active transaction statuses are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected transaction status details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedTransactionStatus ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedTransactionStatus.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Transaction status name
                      </span>
                      <span className={styles.detailValue}>
                        {selectedTransactionStatus.transactionStatusName}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the transaction status is soft deleted by
                      setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a transaction status to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadTransactionStatuses}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedTransactionStatus}
              >
                <FiTrash2 />{" "}
                {deleting ? "Deleting..." : "Delete transaction status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteTransactionStatus;
