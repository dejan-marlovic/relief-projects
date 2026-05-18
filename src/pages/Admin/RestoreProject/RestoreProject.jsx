import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiFolder,
} from "react-icons/fi";

import styles from "./RestoreProject.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreProject = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedProjects, setDeletedProjects] = useState([]);
  const [projectStatusesById, setProjectStatusesById] = useState({});
  const [projectTypesById, setProjectTypesById] = useState({});
  const [addressesById, setAddressesById] = useState({});
  const [activeProjectsById, setActiveProjectsById] = useState({});

  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedProject = useMemo(() => {
    const id = Number(selectedProjectId);
    if (!id) return null;

    return deletedProjects.find((project) => project.id === id) || null;
  }, [selectedProjectId, deletedProjects]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    return String(value).replace("T", " ");
  };

  const getProjectStatusLabel = (projectStatusId) => {
    if (!projectStatusId) return "N/A";

    const status = projectStatusesById[projectStatusId];

    if (!status) {
      return `Project status id: ${projectStatusId}`;
    }

    return status.statusName || `Project status id: ${projectStatusId}`;
  };

  const getProjectTypeLabel = (projectTypeId) => {
    if (!projectTypeId) return "N/A";

    const projectType = projectTypesById[projectTypeId];

    if (!projectType) {
      return `Project type id: ${projectTypeId}`;
    }

    return projectType.projectTypeName || `Project type id: ${projectTypeId}`;
  };

  const getAddressLabel = (addressId) => {
    if (!addressId) return "N/A";

    const address = addressesById[addressId];

    if (!address) {
      return `Address id: ${addressId}`;
    }

    const parts = [
      address.street,
      address.postalCode,
      address.city,
      address.state,
      address.country,
    ].filter(Boolean);

    if (parts.length === 0) {
      return `Address id: ${addressId}`;
    }

    return `${parts.join(", ")} - id: ${addressId}`;
  };

  const getPartOfLabel = (partOfId) => {
    if (!partOfId) return "N/A";

    const parentProject = activeProjectsById[partOfId];

    if (!parentProject) {
      return `Project id: ${partOfId}`;
    }

    const code = parentProject.projectCode
      ? `${parentProject.projectCode} - `
      : "";

    return `${code}${parentProject.projectName || `Project id: ${partOfId}`}`;
  };

  const getProjectLabel = (project) => {
    if (!project) return "N/A";

    const code = project.projectCode ? `${project.projectCode} - ` : "";
    const name = project.projectName || `Project id: ${project.id}`;
    const status = getProjectStatusLabel(project.projectStatusId);
    const type = getProjectTypeLabel(project.projectTypeId);

    return `${code}${name} | ${status} | ${type}`;
  };

  const loadDeletedProjects = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [
        projectsRes,
        projectStatusesRes,
        projectTypesRes,
        addressesRes,
        activeProjectsRes,
      ] = await Promise.all([
        authFetch(`${BASE_URL}/api/projects/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/project-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/project-types/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/addresses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!projectsRes.ok && projectsRes.status !== 204) {
        const data = await safeReadJson(projectsRes);
        setDeletedProjects([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted projects. Backend support may be missing.",
        );
        return;
      }

      const projectsData = await safeReadJson(projectsRes);
      const nextProjects = Array.isArray(projectsData) ? projectsData : [];

      let nextProjectStatusesById = {};
      let nextProjectTypesById = {};
      let nextAddressesById = {};
      let nextActiveProjectsById = {};

      if (projectStatusesRes.ok || projectStatusesRes.status === 204) {
        const data = await safeReadJson(projectStatusesRes);
        const list = Array.isArray(data) ? data : [];
        nextProjectStatusesById = buildLookupById(list);
      }

      if (projectTypesRes.ok || projectTypesRes.status === 204) {
        const data = await safeReadJson(projectTypesRes);
        const list = Array.isArray(data) ? data : [];
        nextProjectTypesById = buildLookupById(list);
      }

      if (addressesRes.ok || addressesRes.status === 204) {
        const data = await safeReadJson(addressesRes);
        const list = Array.isArray(data) ? data : [];
        nextAddressesById = buildLookupById(list);
      }

      if (activeProjectsRes.ok || activeProjectsRes.status === 204) {
        const data = await safeReadJson(activeProjectsRes);
        const list = Array.isArray(data) ? data : [];
        nextActiveProjectsById = buildLookupById(list);
      }

      setDeletedProjects(nextProjects);
      setProjectStatusesById(nextProjectStatusesById);
      setProjectTypesById(nextProjectTypesById);
      setAddressesById(nextAddressesById);
      setActiveProjectsById(nextActiveProjectsById);

      if (
        selectedProjectId &&
        !nextProjects.some(
          (project) => project.id === Number(selectedProjectId),
        )
      ) {
        setSelectedProjectId("");
      }
    } catch (err) {
      console.error("Error loading deleted projects:", err);
      setDeletedProjects([]);
      setProjectStatusesById({});
      setProjectTypesById({});
      setAddressesById({});
      setActiveProjectsById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted projects. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedProject) {
        setFormError("Please select a deleted project to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/projects/${selectedProject.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the project. Backend support may be missing.",
        );
        return;
      }

      setDeletedProjects((prev) =>
        prev.filter((project) => project.id !== selectedProject.id),
      );

      setSuccessMessage(
        `Project "${selectedProject.projectName}" restored successfully.`,
      );
      setSelectedProjectId("");
    } catch (err) {
      console.error("Restore project error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring project. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Project</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted project and restore it.
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
                  <div className={styles.cardTitle}>Choose deleted project</div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreProjectSelect">Deleted project</label>

                  <select
                    id="restoreProjectSelect"
                    className={styles.textInput}
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted project</option>

                    {deletedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/projects/deleted </code>,
                  <code> GET /api/project-statuses/active </code>,
                  <code> GET /api/project-types/active </code>,
                  <code> GET /api/addresses/active </code>,
                  <code> GET /api/projects/active </code>
                  and
                  <code> PUT /api/projects/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected project details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                      <span className={styles.detailLabel}>Reference no.</span>
                      <span className={styles.detailValue}>
                        {selectedProject.refProjectNo || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Status</span>
                      <span className={styles.detailValue}>
                        {getProjectStatusLabel(selectedProject.projectStatusId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Type</span>
                      <span className={styles.detailValue}>
                        {getProjectTypeLabel(selectedProject.projectTypeId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Approved</span>
                      <span className={styles.detailValue}>
                        {selectedProject.approved || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project date</span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedProject.projectDate)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project start</span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedProject.projectStart)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project end</span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedProject.projectEnd)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Address</span>
                      <span className={styles.detailValue}>
                        {getAddressLabel(selectedProject.addressId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Part of</span>
                      <span className={styles.detailValue}>
                        {getPartOfLabel(selectedProject.partOfId)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted project to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedProjects}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedProject}
              >
                <FiRotateCcw /> {restoring ? "Restoring..." : "Restore project"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreProject;
