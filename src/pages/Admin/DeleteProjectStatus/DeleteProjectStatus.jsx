import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiFlag } from "react-icons/fi";

import styles from "./DeleteProjectStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteProjectStatus = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState([]);
  const [selectedProjectStatusId, setSelectedProjectStatusId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProjectStatus = useMemo(() => {
    const id = Number(selectedProjectStatusId);
    if (!id) return null;
    return (
      projectStatuses.find((projectStatus) => projectStatus.id === id) || null
    );
  }, [selectedProjectStatusId, projectStatuses]);

  const loadProjectStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/project-statuses/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setProjectStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load active project statuses.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextProjectStatuses = Array.isArray(data) ? data : [];

      setProjectStatuses(nextProjectStatuses);

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
      console.error("Error loading project statuses:", err);
      setProjectStatuses([]);
      setFormError(
        err?.message || "Unexpected error while loading project statuses.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedProjectStatusId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedProjectStatus) {
        setFormError("Please select a project status to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete project status "${selectedProjectStatus.statusName}" (id: ${selectedProjectStatus.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/project-statuses/${selectedProjectStatus.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Project status was not found. It may already have been deleted.",
        );
        await loadProjectStatuses();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to delete the project status.",
        );
        return;
      }

      const deletedProjectStatusName = selectedProjectStatus.statusName;

      setProjectStatuses((prev) =>
        prev.filter(
          (projectStatus) => projectStatus.id !== selectedProjectStatus.id,
        ),
      );
      setSelectedProjectStatusId("");
      setSuccessMessage(
        `Project status "${deletedProjectStatusName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete project status error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting project status.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedProjectStatusId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Project Status</h3>
            <p className={styles.pageSubtitle}>
              Select an active project status and soft delete it.
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
                  <div className={styles.cardTitle}>Choose project status</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/project-statuses/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteProjectStatusSelect">
                    Project status
                  </label>
                  <select
                    id="deleteProjectStatusSelect"
                    className={inputClass}
                    value={selectedProjectStatusId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select project status</option>
                    {projectStatuses.map((projectStatus) => (
                      <option key={projectStatus.id} value={projectStatus.id}>
                        {projectStatus.statusName} (id: {projectStatus.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active project statuses are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected project status details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the project status is soft deleted by
                      setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a project status to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadProjectStatuses}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedProjectStatus}
              >
                <FiTrash2 />{" "}
                {deleting ? "Deleting..." : "Delete project status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteProjectStatus;
