import React, { useEffect, useState, useContext, useMemo } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { FiTrash2, FiDownload, FiUploadCloud } from "react-icons/fi";
import styles from "./Documents.module.scss";

import { BASE_URL, ASSETS_URL } from "../../config/api";
const DOCUMENTS_BASE_PATH = `${ASSETS_URL}/documents/`;

// 🔹 TODO: replace with real current employee ID from your auth/user context
const CURRENT_EMPLOYEE_ID = 1;

// ✅ Keep this in sync with backend:
// spring.servlet.multipart.max-file-size / spring.servlet.multipart.max-request-size
const MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const Documents = () => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadInfo, setUploadInfo] = useState(""); // small helper message (optional)

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

  // ✅ Parse API errors nicely (supports your ApiError { message, fieldErrors... })
  const readApiErrorMessage = async (res) => {
    const contentType = res.headers.get("content-type") || "";

    // If backend returns JSON (ApiError)
    if (contentType.includes("application/json")) {
      const json = await res.json().catch(() => null);

      // Your ApiError has "message"
      if (json?.message) return json.message;

      // fallback keys if you ever return other shapes
      if (json?.error) return json.error;
      if (json?.details) return json.details;

      return "Request failed.";
    }

    // Fallback to text
    const text = await res.text().catch(() => "");
    return text || "Request failed.";
  };

  const uploadDocument = async (file) => {
    if (!file || !selectedProjectId) return;

    setUploadError("");
    setUploadInfo("");

    // ✅ Client-side guard (best UX)
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        `File is too large (${formatMB(
          file.size
        )}). Max allowed is ${MAX_UPLOAD_MB}MB.`
      );
      return;
    }

    setUploading(true);
    setUploadInfo(`Uploading ${file.name} (${formatMB(file.size)})...`);

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
        // ✅ Special-case 413 from backend for a friendly message
        if (res.status === 413) {
          // read backend message (ApiError.message)
          const msg = await readApiErrorMessage(res);
          throw new Error(msg || `File is too large (max ${MAX_UPLOAD_MB}MB).`);
        }

        const msg = await readApiErrorMessage(res);
        throw new Error(msg || "Upload failed");
      }

      const created = await res.json();
      setDocuments((prev) => [created, ...prev]);
      setUploadInfo("Upload complete ✅");
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
      setUploadInfo("");
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
    // optional: allow selecting the same file twice in a row
    e.target.value = "";
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
        const msg = await readApiErrorMessage(res);
        throw new Error(msg || "Failed to delete document");
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
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Documents</h2>
            <p className={styles.pageSubtitle}>
              Upload and manage files for the selected project. Max{" "}
              {MAX_UPLOAD_MB}MB.
            </p>
          </div>

          <div className={styles.headerActions} />
        </div>

        {!selectedProjectId && (
          <p className={styles.infoText}>Please select a project first.</p>
        )}

        {selectedProjectId && (
          <>
            {/* Error banner */}
            {anyError && <div className={styles.errorBanner}>{anyError}</div>}

            {/* Optional small info line */}
            {uploadInfo && !uploadError && (
              <p className={styles.infoText}>{uploadInfo}</p>
            )}

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
                  : `Drag & drop a document here, or click to select (max ${MAX_UPLOAD_MB}MB)`}
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
