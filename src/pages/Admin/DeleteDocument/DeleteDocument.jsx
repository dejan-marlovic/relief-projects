import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";

import styles from "./DeleteDocument.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteDocument = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const projectNameById = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = project.projectName;
      return acc;
    }, {});
  }, [projects]);

  const employeeNameById = useMemo(() => {
    return employees.reduce((acc, employee) => {
      acc[employee.id] = `${employee.firstName} ${employee.lastName}`;
      return acc;
    }, {});
  }, [employees]);

  const selectedDocument = useMemo(() => {
    const id = Number(selectedDocumentId);
    if (!id) return null;
    return documents.find((document) => document.id === id) || null;
  }, [selectedDocumentId, documents]);

  const getProjectLabel = (projectId) => {
    if (!projectId) return "N/A";
    return projectNameById[projectId] || `Project id: ${projectId}`;
  };

  const getEmployeeLabel = (employeeId) => {
    if (!employeeId) return "N/A";
    return employeeNameById[employeeId] || `Employee id: ${employeeId}`;
  };

  const loadDocuments = async () => {
    const res = await authFetch(`${BASE_URL}/api/documents/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active documents.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadProjects = async () => {
    const res = await authFetch(`${BASE_URL}/api/projects/ids-names`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load project names.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadEmployees = async () => {
    const res = await authFetch(`${BASE_URL}/api/employees/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load employees.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [nextDocuments, nextProjects, nextEmployees] = await Promise.all([
        loadDocuments(),
        loadProjects(),
        loadEmployees(),
      ]);

      setDocuments(nextDocuments);
      setProjects(nextProjects);
      setEmployees(nextEmployees);

      if (
        selectedDocumentId &&
        !nextDocuments.some(
          (document) => document.id === Number(selectedDocumentId),
        )
      ) {
        setSelectedDocumentId("");
      }
    } catch (err) {
      console.error("Error loading document delete data:", err);
      setDocuments([]);
      setProjects([]);
      setEmployees([]);
      setFormError(err?.message || "Unexpected error while loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedDocumentId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedDocument) {
        setFormError("Please select a document to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete document "${selectedDocument.documentName}" (id: ${selectedDocument.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/documents/${selectedDocument.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Document was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the document.",
        );
        return;
      }

      const deletedDocumentName = selectedDocument.documentName;

      setDocuments((prev) =>
        prev.filter((document) => document.id !== selectedDocument.id),
      );
      setSelectedDocumentId("");
      setSuccessMessage(
        `Document "${deletedDocumentName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete document error:", err);
      setFormError(err?.message || "Unexpected error while deleting document.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedDocumentId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Document</h3>
            <p className={styles.pageSubtitle}>
              Select an active document and soft delete it.
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
                  <div className={styles.cardTitle}>Choose document</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/documents/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteDocumentSelect">Document</label>
                  <select
                    id="deleteDocumentSelect"
                    className={inputClass}
                    value={selectedDocumentId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select document</option>
                    {documents.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.documentName} |{" "}
                        {getProjectLabel(document.projectId)} | Id:{" "}
                        {document.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active documents are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected document details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Document path</span>
                      <span className={styles.detailValue}>
                        {selectedDocument.documentPath || "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the document is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a document to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedDocument}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete document"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteDocument;
