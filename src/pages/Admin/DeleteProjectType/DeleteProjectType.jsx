import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiFolder } from "react-icons/fi";

import styles from "./DeleteProjectType.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteProjectType = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProjectType = useMemo(() => {
    const id = Number(selectedProjectTypeId);
    if (!id) return null;
    return projectTypes.find((projectType) => projectType.id === id) || null;
  }, [selectedProjectTypeId, projectTypes]);

  const loadProjectTypes = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/project-types/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setProjectTypes([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load active project types.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextProjectTypes = Array.isArray(data) ? data : [];

      setProjectTypes(nextProjectTypes);

      if (
        selectedProjectTypeId &&
        !nextProjectTypes.some(
          (projectType) => projectType.id === Number(selectedProjectTypeId),
        )
      ) {
        setSelectedProjectTypeId("");
      }
    } catch (err) {
      console.error("Error loading project types:", err);
      setProjectTypes([]);
      setFormError(
        err?.message || "Unexpected error while loading project types.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedProjectTypeId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedProjectType) {
        setFormError("Please select a project type to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete project type "${selectedProjectType.projectTypeName}" (id: ${selectedProjectType.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/project-types/${selectedProjectType.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Project type was not found. It may already have been deleted.",
        );
        await loadProjectTypes();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the project type.",
        );
        return;
      }

      const deletedProjectTypeName = selectedProjectType.projectTypeName;

      setProjectTypes((prev) =>
        prev.filter((projectType) => projectType.id !== selectedProjectType.id),
      );
      setSelectedProjectTypeId("");
      setSuccessMessage(
        `Project type "${deletedProjectTypeName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete project type error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting project type.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedProjectTypeId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Project Type</h3>
            <p className={styles.pageSubtitle}>
              Select an active project type and soft delete it.
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
                  <div className={styles.cardTitle}>Choose project type</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/project-types/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteProjectTypeSelect">Project type</label>
                  <select
                    id="deleteProjectTypeSelect"
                    className={inputClass}
                    value={selectedProjectTypeId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select project type</option>
                    {projectTypes.map((projectType) => (
                      <option key={projectType.id} value={projectType.id}>
                        {projectType.projectTypeName} (id: {projectType.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active project types are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected project type details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the project type is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a project type to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadProjectTypes}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedProjectType}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete project type"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteProjectType;
