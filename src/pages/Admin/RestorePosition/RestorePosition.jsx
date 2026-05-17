import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiBriefcase,
} from "react-icons/fi";

import styles from "./RestorePosition.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestorePosition = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedPositions, setDeletedPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedPosition = useMemo(() => {
    const id = Number(selectedPositionId);
    if (!id) return null;

    return deletedPositions.find((position) => position.id === id) || null;
  }, [selectedPositionId, deletedPositions]);

  const loadDeletedPositions = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/positions/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedPositions([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted positions. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextPositions = Array.isArray(data) ? data : [];

      setDeletedPositions(nextPositions);

      if (
        selectedPositionId &&
        !nextPositions.some(
          (position) => position.id === Number(selectedPositionId),
        )
      ) {
        setSelectedPositionId("");
      }
    } catch (err) {
      console.error("Error loading deleted positions:", err);
      setDeletedPositions([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted positions. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedPosition) {
        setFormError("Please select a deleted position to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/positions/${selectedPosition.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the position. Backend support may be missing.",
        );
        return;
      }

      setDeletedPositions((prev) =>
        prev.filter((position) => position.id !== selectedPosition.id),
      );

      setSuccessMessage(
        `Position "${selectedPosition.positionName}" restored successfully.`,
      );
      setSelectedPositionId("");
    } catch (err) {
      console.error("Restore position error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring position. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Position</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted position and restore it.
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
            <FiBriefcase />
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
                    Choose deleted position
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restorePositionSelect">
                    Deleted position
                  </label>

                  <select
                    id="restorePositionSelect"
                    className={styles.textInput}
                    value={selectedPositionId}
                    onChange={(e) => {
                      setSelectedPositionId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted position</option>

                    {deletedPositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.positionName} - id: {position.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/positions/deleted </code>
                  and
                  <code> PUT /api/positions/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected position details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedPosition ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedPosition.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Position name</span>
                      <span className={styles.detailValue}>
                        {selectedPosition.positionName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted position to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedPositions}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedPosition}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore position"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestorePosition;
