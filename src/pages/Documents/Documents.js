import React, { useEffect, useState, useContext, useMemo } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { FiTrash2, FiDownload, FiUploadCloud } from "react-icons/fi";
import styles from "./Documents.module.scss";

const BASE_URL = "http://localhost:8080";
const DOCUMENTS_BASE_PATH = `${BASE_URL}/documents/`;

// 🔹 TODO: replace with real current employee ID from your auth/user context
const CURRENT_EMPLOYEE_ID = 1;

const Documents = () => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const token = useMemo(() => localStorage.getItem("authToken"), []);

  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    [token]
  );

  // Fetch documents for selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setDocuments([]);
      return;
    }

    const fetchDocs = async () => {
      setLoading(true);
      setListError("");
      try {
        const res = await fetch(
          `${BASE_URL}/api/documents/project/${selectedProjectId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Failed to load documents");
        }

        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setListError(err.message || "Failed to load documents");
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [selectedProjectId, authHeaders]);

  const uploadDocument = async (file) => {
    if (!file || !selectedProjectId) return;

    setUploadError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProjectId);
      formData.append("employeeId", CURRENT_EMPLOYEE_ID);

      const res = await fetch(`${BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          ...authHeaders,
          // do NOT set Content-Type here; browser sets multipart boundary
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Upload failed");
      }

      const created = await res.json();
      setDocuments((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadDocument(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadDocument(file);
  };

  const handleClickPicker = () => {
    const input = document.getElementById("documentFileInput");
    if (input) input.click();
  };

  // Delete a document (soft delete in backend)
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;

    setDeleteError("");
    setDeletingId(docId);

    try {
      const res = await fetch(`${BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to delete document");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const anyError = uploadError || deleteError || listError;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Header like Project/Transactions */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Documents</h2>
            <p className={styles.pageSubtitle}>
              Upload and manage files for the selected project.
            </p>
          </div>

          <div className={styles.headerActions}>
            {/* (Optional future action buttons can go here) */}
          </div>
        </div>

        {!selectedProjectId && (
          <p className={styles.infoText}>Please select a project first.</p>
        )}

        {selectedProjectId && (
          <>
            {/* Error banner like Project */}
            {anyError && <div className={styles.errorBanner}>{anyError}</div>}

            {/* Upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={handleClickPicker}
              className={styles.uploadArea}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClickPicker();
              }}
              aria-label="Upload document"
            >
              <FiUploadCloud size={24} className={styles.uploadIcon} />
              <span>
                {uploading
                  ? "Uploading..."
                  : "Drag & drop a document here, or click to select"}
              </span>
            </div>

            <input
              id="documentFileInput"
              type="file"
              className={styles.hiddenFileInput}
              onChange={handleFileInput}
            />

            {/* Section heading */}
            <h3 className={styles.sectionTitle}>Files for this project</h3>

            {loading && (
              <p className={styles.loadingText}>Loading documents...</p>
            )}

            {!loading && documents.length === 0 && !listError && (
              <p className={styles.emptyText}>No documents uploaded yet.</p>
            )}

            {documents.length > 0 && (
              <ul className={styles.documentsList}>
                {documents.map((doc) => (
                  <li key={doc.id} className={styles.documentItem}>
                    <span className={styles.docName}>{doc.documentName}</span>

                    <div className={styles.docActions}>
                      <a
                        href={`${DOCUMENTS_BASE_PATH}${doc.documentPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        className={styles.downloadLink}
                      >
                        <FiDownload />
                        <span>Download</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingId === doc.id}
                        title="Delete"
                        className={styles.dangerIconBtn}
                        aria-label="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Documents;
