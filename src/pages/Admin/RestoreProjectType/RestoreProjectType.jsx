import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiFolder,
} from "react-icons/fi";

import styles from "./RestoreProjectType.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreProjectType = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedProjectTypes, setDeletedProjectTypes] = useState([]);
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProjectType = useMemo(() => {
    const id = Number(selectedProjectTypeId);
    if (!id) return null;

    return (
      deletedProjectTypes.find((projectType) => projectType.id === id) || null
    );
  }, [selectedProjectTypeId, deletedProjectTypes]);

  const loadDeletedProjectTypes = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/project-types/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedProjectTypes([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted project types. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextProjectTypes = Array.isArray(data) ? data : [];

      setDeletedProjectTypes(nextProjectTypes);

      if (
        selectedProjectTypeId &&
        !nextProjectTypes.some(
          (projectType) => projectType.id === Number(selectedProjectTypeId),
        )
      ) {
        setSelectedProjectTypeId("");
      }
    } catch (err) {
      console.error("Error loading deleted project types:", err);
      setDeletedProjectTypes([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted project types. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedProjectTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedProjectType) {
        setFormError("Please select a deleted project type to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/project-types/${selectedProjectType.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the project type. Backend support may be missing.",
        );
        return;
      }

      setDeletedProjectTypes((prev) =>
        prev.filter((projectType) => projectType.id !== selectedProjectType.id),
      );

      setSuccessMessage(
        `Project type "${selectedProjectType.projectTypeName}" restored successfully.`,
      );
      setSelectedProjectTypeId("");
    } catch (err) {
      console.error("Restore project type error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring project type. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Project Type</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted project type and restore it.
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
            <FiFolder />
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
                    Choose deleted project type
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreProjectTypeSelect">
                    Deleted project type
                  </label>

                  <select
                    id="restoreProjectTypeSelect"
                    className={styles.textInput}
                    value={selectedProjectTypeId}
                    onChange={(e) => {
                      setSelectedProjectTypeId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted project type</option>

                    {deletedProjectTypes.map((projectType) => (
                      <option key={projectType.id} value={projectType.id}>
                        {projectType.projectTypeName} - id: {projectType.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/project-types/deleted </code>
                  and
                  <code> PUT /api/project-types/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected project type details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedProjectType ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedProjectType.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Project type name
                      </span>
                      <span className={styles.detailValue}>
                        {selectedProjectType.projectTypeName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted project type to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedProjectTypes}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedProjectType}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore project type"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreProjectType;
