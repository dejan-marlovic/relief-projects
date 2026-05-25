import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiFlag,
} from "react-icons/fi";

import styles from "./RestoreProjectStatus.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreProjectStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedProjectStatuses, setDeletedProjectStatuses] = useState([]);
  const [selectedProjectStatusId, setSelectedProjectStatusId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProjectStatus = useMemo(() => {
    const id = Number(selectedProjectStatusId);
    if (!id) return null;

    return (
      deletedProjectStatuses.find((projectStatus) => projectStatus.id === id) ||
      null
    );
  }, [selectedProjectStatusId, deletedProjectStatuses]);

  const loadDeletedProjectStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/project-statuses/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedProjectStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted project statuses. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextProjectStatuses = Array.isArray(data) ? data : [];

      setDeletedProjectStatuses(nextProjectStatuses);

      if (
        selectedProjectStatusId &&
        !nextProjectStatuses.some(
          (projectStatus) =>
            projectStatus.id === Number(selectedProjectStatusId),
        )
      ) {
        setSelectedProjectStatusId("");
      }
    } catch (err) {
      console.error("Error loading deleted project statuses:", err);
      setDeletedProjectStatuses([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted project statuses. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedProjectStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedProjectStatus) {
        setFormError("Please select a deleted project status to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/project-statuses/${selectedProjectStatus.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the project status. Backend support may be missing.",
        );
        return;
      }

      setDeletedProjectStatuses((prev) =>
        prev.filter(
          (projectStatus) => projectStatus.id !== selectedProjectStatus.id,
        ),
      );

      setSuccessMessage(
        `Project status "${selectedProjectStatus.statusName}" restored successfully.`,
      );
      setSelectedProjectStatusId("");
    } catch (err) {
      console.error("Restore project status error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring project status. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Project Status</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted project status and restore it.
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
            <FiFlag />
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
                    Choose deleted project status
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreProjectStatusSelect">
                    Deleted project status
                  </label>

                  <select
                    id="restoreProjectStatusSelect"
                    className={styles.textInput}
                    value={selectedProjectStatusId}
                    onChange={(e) => {
                      setSelectedProjectStatusId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted project status</option>

                    {deletedProjectStatuses.map((projectStatus) => (
                      <option key={projectStatus.id} value={projectStatus.id}>
                        {projectStatus.statusName} - id: {projectStatus.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/project-statuses/deleted </code>
                  and
                  <code> PUT /api/project-statuses/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected project status details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedProjectStatus ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedProjectStatus.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Status name</span>
                      <span className={styles.detailValue}>
                        {selectedProjectStatus.statusName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted project status to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedProjectStatuses}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedProjectStatus}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore project status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreProjectStatus;
