import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiFolder } from "react-icons/fi";

import styles from "./DeleteProject.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteProject = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProject = useMemo(() => {
    const id = Number(selectedProjectId);
    if (!id) return null;
    return projects.find((project) => project.id === id) || null;
  }, [selectedProjectId, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/projects/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setProjects([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active projects.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextProjects = Array.isArray(data) ? data : [];

      setProjects(nextProjects);

      if (
        selectedProjectId &&
        !nextProjects.some(
          (project) => project.id === Number(selectedProjectId),
        )
      ) {
        setSelectedProjectId("");
      }
    } catch (err) {
      console.error("Error loading projects:", err);
      setProjects([]);
      setFormError(err?.message || "Unexpected error while loading projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedProject) {
        setFormError("Please select a project to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete project "${selectedProject.projectName}" (id: ${selectedProject.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/projects/${selectedProject.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Project was not found. It may already have been deleted.",
        );
        await loadProjects();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the project.",
        );
        return;
      }

      const deletedProjectName = selectedProject.projectName;

      setProjects((prev) =>
        prev.filter((project) => project.id !== selectedProject.id),
      );
      setSelectedProjectId("");
      setSuccessMessage(
        `Project "${deletedProjectName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete project error:", err);
      setFormError(err?.message || "Unexpected error while deleting project.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedProjectId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Project</h3>
            <p className={styles.pageSubtitle}>
              Select an active project and soft delete it.
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
                  <div className={styles.cardTitle}>Choose project</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/projects/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteProjectSelect">Project</label>
                  <select
                    id="deleteProjectSelect"
                    className={inputClass}
                    value={selectedProjectId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectCode} - {project.projectName} (id:{" "}
                        {project.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active projects are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected project details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedProject ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedProject.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project code</span>
                      <span className={styles.detailValue}>
                        {selectedProject.projectCode || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project name</span>
                      <span className={styles.detailValue}>
                        {selectedProject.projectName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Ref project no</span>
                      <span className={styles.detailValue}>
                        {selectedProject.refProjectNo || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Funding source</span>
                      <span className={styles.detailValue}>
                        {selectedProject.fundingSource || "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the project is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW() </code>. It also soft deletes
                      related
                      <code> ProjectSector </code>,
                      <code> ProjectOrganization </code>, and
                      <code> EmployeeProject </code>
                      rows linked to that project.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a project to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadProjects}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedProject}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteProject;
