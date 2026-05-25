import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

import styles from "./RestoreTransactionStatus.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreTransactionStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedTransactionStatuses, setDeletedTransactionStatuses] = useState(
    [],
  );
  const [selectedTransactionStatusId, setSelectedTransactionStatusId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedTransactionStatus = useMemo(() => {
    const id = Number(selectedTransactionStatusId);
    if (!id) return null;

    return (
      deletedTransactionStatuses.find(
        (transactionStatus) => transactionStatus.id === id,
      ) || null
    );
  }, [selectedTransactionStatusId, deletedTransactionStatuses]);

  const loadDeletedTransactionStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(
        `${BASE_URL}/api/transaction-statuses/deleted`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedTransactionStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted transaction statuses. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextTransactionStatuses = Array.isArray(data) ? data : [];

      setDeletedTransactionStatuses(nextTransactionStatuses);

      if (
        selectedTransactionStatusId &&
        !nextTransactionStatuses.some(
          (transactionStatus) =>
            transactionStatus.id === Number(selectedTransactionStatusId),
        )
      ) {
        setSelectedTransactionStatusId("");
      }
    } catch (err) {
      console.error("Error loading deleted transaction statuses:", err);
      setDeletedTransactionStatuses([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted transaction statuses. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedTransactionStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedTransactionStatus) {
        setFormError("Please select a deleted transaction status to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/transaction-statuses/${selectedTransactionStatus.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the transaction status. Backend support may be missing.",
        );
        return;
      }

      setDeletedTransactionStatuses((prev) =>
        prev.filter(
          (transactionStatus) =>
            transactionStatus.id !== selectedTransactionStatus.id,
        ),
      );

      setSuccessMessage(
        `Transaction status "${selectedTransactionStatus.transactionStatusName}" restored successfully.`,
      );
      setSelectedTransactionStatusId("");
    } catch (err) {
      console.error("Restore transaction status error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring transaction status. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Transaction Status</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted transaction status and restore it.
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
            <FiCheckCircle />
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
                    Choose deleted transaction status
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreTransactionStatusSelect">
                    Deleted transaction status
                  </label>

                  <select
                    id="restoreTransactionStatusSelect"
                    className={styles.textInput}
                    value={selectedTransactionStatusId}
                    onChange={(e) => {
                      setSelectedTransactionStatusId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted transaction status</option>

                    {deletedTransactionStatuses.map((transactionStatus) => (
                      <option
                        key={transactionStatus.id}
                        value={transactionStatus.id}
                      >
                        {transactionStatus.transactionStatusName} - id:{" "}
                        {transactionStatus.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/transaction-statuses/deleted </code>
                  and
                  <code> PUT /api/transaction-statuses/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected transaction status details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted transaction status to preview details
                    before restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedTransactionStatuses}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedTransactionStatus}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore transaction status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreTransactionStatus;
