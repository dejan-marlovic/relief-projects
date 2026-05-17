import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiEdit3,
} from "react-icons/fi";

import styles from "./RestoreSignatureStatus.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreSignatureStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedSignatureStatuses, setDeletedSignatureStatuses] = useState([]);
  const [selectedSignatureStatusId, setSelectedSignatureStatusId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSignatureStatus = useMemo(() => {
    const id = Number(selectedSignatureStatusId);
    if (!id) return null;

    return (
      deletedSignatureStatuses.find(
        (signatureStatus) => signatureStatus.id === id,
      ) || null
    );
  }, [selectedSignatureStatusId, deletedSignatureStatuses]);

  const loadDeletedSignatureStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(
        `${BASE_URL}/api/signature-statuses/deleted`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedSignatureStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted signature statuses. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextSignatureStatuses = Array.isArray(data) ? data : [];

      setDeletedSignatureStatuses(nextSignatureStatuses);

      if (
        selectedSignatureStatusId &&
        !nextSignatureStatuses.some(
          (signatureStatus) =>
            signatureStatus.id === Number(selectedSignatureStatusId),
        )
      ) {
        setSelectedSignatureStatusId("");
      }
    } catch (err) {
      console.error("Error loading deleted signature statuses:", err);
      setDeletedSignatureStatuses([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted signature statuses. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedSignatureStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedSignatureStatus) {
        setFormError("Please select a deleted signature status to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/signature-statuses/${selectedSignatureStatus.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the signature status. Backend support may be missing.",
        );
        return;
      }

      setDeletedSignatureStatuses((prev) =>
        prev.filter(
          (signatureStatus) =>
            signatureStatus.id !== selectedSignatureStatus.id,
        ),
      );

      setSuccessMessage(
        `Signature status "${selectedSignatureStatus.name}" restored successfully.`,
      );
      setSelectedSignatureStatusId("");
    } catch (err) {
      console.error("Restore signature status error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring signature status. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Signature Status</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted signature status and restore it.
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
                  <div className={styles.cardTitle}>
                    Choose deleted signature status
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreSignatureStatusSelect">
                    Deleted signature status
                  </label>

                  <select
                    id="restoreSignatureStatusSelect"
                    className={styles.textInput}
                    value={selectedSignatureStatusId}
                    onChange={(e) => {
                      setSelectedSignatureStatusId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted signature status</option>

                    {deletedSignatureStatuses.map((signatureStatus) => (
                      <option
                        key={signatureStatus.id}
                        value={signatureStatus.id}
                      >
                        {signatureStatus.name} - id: {signatureStatus.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/signature-statuses/deleted </code>
                  and
                  <code> PUT /api/signature-statuses/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected signature status details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedSignatureStatus ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedSignatureStatus.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Signature status name
                      </span>
                      <span className={styles.detailValue}>
                        {selectedSignatureStatus.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted signature status to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedSignatureStatuses}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedSignatureStatus}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore signature status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreSignatureStatus;
