import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";

import styles from "./RestoreDocument.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreDocument = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedDocuments, setDeletedDocuments] = useState([]);
  const [employeesById, setEmployeesById] = useState({});
  const [projectsById, setProjectsById] = useState({});

  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedDocument = useMemo(() => {
    const id = Number(selectedDocumentId);
    if (!id) return null;

    return deletedDocuments.find((document) => document.id === id) || null;
  }, [selectedDocumentId, deletedDocuments]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const getEmployeeLabel = (employeeId) => {
    if (!employeeId) return "N/A";

    const employee = employeesById[employeeId];

    if (!employee) {
      return `Employee id: ${employeeId}`;
    }

    const firstName = employee.firstName || "";
    const lastName = employee.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return `${fullName} - id: ${employeeId}`;
    }

    if (employee.name) {
      return `${employee.name} - id: ${employeeId}`;
    }

    if (employee.email) {
      return `${employee.email} - id: ${employeeId}`;
    }

    return `Employee id: ${employeeId}`;
  };

  const getProjectLabel = (projectId) => {
    if (!projectId) return "N/A";

    const project = projectsById[projectId];

    if (!project) {
      return `Project id: ${projectId}`;
    }

    const code = project.projectCode ? `${project.projectCode} - ` : "";

    return `${code}${project.projectName || `Project id: ${projectId}`}`;
  };

  const getDocumentLabel = (document) => {
    if (!document) return "N/A";

    const name = document.documentName || `Document id: ${document.id}`;
    const project = getProjectLabel(document.projectId);
    const employee = getEmployeeLabel(document.employeeId);

    return `${name} | ${project} | ${employee}`;
  };

  const loadDeletedDocuments = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [documentsRes, employeesRes, projectsRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/documents/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/employees/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!documentsRes.ok && documentsRes.status !== 204) {
        const data = await safeReadJson(documentsRes);
        setDeletedDocuments([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted documents. Backend support may be missing.",
        );
        return;
      }

      const documentsData = await safeReadJson(documentsRes);
      const nextDocuments = Array.isArray(documentsData) ? documentsData : [];

      let nextEmployeesById = {};
      let nextProjectsById = {};

      if (employeesRes.ok || employeesRes.status === 204) {
        const employeesData = await safeReadJson(employeesRes);
        const nextEmployees = Array.isArray(employeesData) ? employeesData : [];
        nextEmployeesById = buildLookupById(nextEmployees);
      }

      if (projectsRes.ok || projectsRes.status === 204) {
        const projectsData = await safeReadJson(projectsRes);
        const nextProjects = Array.isArray(projectsData) ? projectsData : [];
        nextProjectsById = buildLookupById(nextProjects);
      }

      setDeletedDocuments(nextDocuments);
      setEmployeesById(nextEmployeesById);
      setProjectsById(nextProjectsById);

      if (
        selectedDocumentId &&
        !nextDocuments.some(
          (document) => document.id === Number(selectedDocumentId),
        )
      ) {
        setSelectedDocumentId("");
      }
    } catch (err) {
      console.error("Error loading deleted documents:", err);
      setDeletedDocuments([]);
      setEmployeesById({});
      setProjectsById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted documents. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedDocument) {
        setFormError("Please select a deleted document to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/documents/${selectedDocument.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the document. Backend support may be missing.",
        );
        return;
      }

      setDeletedDocuments((prev) =>
        prev.filter((document) => document.id !== selectedDocument.id),
      );

      setSuccessMessage(
        `Document "${selectedDocument.documentName}" restored successfully.`,
      );
      setSelectedDocumentId("");
    } catch (err) {
      console.error("Restore document error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring document. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Document</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted document and restore it.
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
            <FiFileText />
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
                    Choose deleted document
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreDocumentSelect">
                    Deleted document
                  </label>

                  <select
                    id="restoreDocumentSelect"
                    className={styles.textInput}
                    value={selectedDocumentId}
                    onChange={(e) => {
                      setSelectedDocumentId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted document</option>

                    {deletedDocuments.map((document) => (
                      <option key={document.id} value={document.id}>
                        {getDocumentLabel(document)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/documents/deleted </code>,
                  <code> GET /api/employees/active </code>,
                  <code> GET /api/projects/active </code>
                  and
                  <code> PUT /api/documents/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected document details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedDocument ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedDocument.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Document name</span>
                      <span className={styles.detailValue}>
                        {selectedDocument.documentName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Document path</span>
                      <span className={styles.detailValue}>
                        {selectedDocument.documentPath || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project</span>
                      <span className={styles.detailValue}>
                        {getProjectLabel(selectedDocument.projectId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Employee</span>
                      <span className={styles.detailValue}>
                        {getEmployeeLabel(selectedDocument.employeeId)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted document to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedDocuments}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedDocument}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore document"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreDocument;
