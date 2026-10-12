import useRecordAutosave from "../../utils/useRecordAutosave";
import useAutomaticRefresh from "../../hooks/useAutomaticRefresh";
import AutosaveStatus from "../../components/ProjectClassification/AutosaveStatus";
import { useUnsavedChange, useUnsavedChanges } from "../../context/UnsavedChangesContext";
import useTransientMessage from "../../hooks/useTransientMessage";
import { appFetch as fetch } from "../../utils/appFetch";
import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import { FiTrash2, FiDownload, FiUploadCloud } from "react-icons/fi";
import styles from "./Documents.module.scss";

import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { downloadDocument } from "../../utils/documentDownload";
import { getSelectedProjectName } from "../../utils/projectDisplay";
import ErrorBanner from "../../components/ErrorBanner/ErrorBanner";
import { readApiError } from "../../utils/apiErrors";
import useDocumentCategories from "../../hooks/useDocumentCategories";
import { uploaderLabel, uploadTimeLabel, readDocumentError } from "../../utils/documentMetadata";
import DocumentStatus, { statusLabel } from "../../components/DocumentStatus/DocumentStatus";
import ProjectDocumentChecklist from "../../components/ProjectDocumentChecklist/ProjectDocumentChecklist";
import DocumentVersions from "../../components/DocumentVersions/DocumentVersions";

// ✅ Keep this in sync with backend:
// spring.servlet.multipart.max-file-size / spring.servlet.multipart.max-request-size
const MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  mp4: ["video/mp4"],
  mp3: ["audio/mpeg", "audio/mp3"],
};
const ALLOWED_FORMATS_LABEL =
  "PDF, DOCX, XLSX, PPTX, TXT, CSV, JPG, PNG, WebP, MP4 and MP3";
const FILE_INPUT_ACCEPT = Object.entries(ALLOWED_FILE_TYPES)
  .flatMap(([extension, mimeTypes]) => [`.${extension}`, ...mimeTypes])
  .filter((value, index, values) => values.indexOf(value) === index)
  .join(",");

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export const validateDocumentFile = (file) => {
  if (!file) return "Choose a file to upload.";
  if (!file.size) return "The selected file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${formatMB(file.size)}). Max allowed is ${MAX_UPLOAD_MB}MB.`;
  }

  const name = String(file.name || "").trim();
  if (!name || name.includes("/") || name.includes("\\")) {
    return "The filename is not valid.";
  }

  const nameParts = name.split(".");
  if (nameParts.length !== 2 || !nameParts[0] || !nameParts[1]) {
    return "Use a filename with one supported extension. Multiple extensions are not allowed.";
  }

  const extension = nameParts[1].toLowerCase();
  const acceptedMimeTypes = ALLOWED_FILE_TYPES[extension];
  if (!acceptedMimeTypes) {
    return `Unsupported file type. Allowed types: ${ALLOWED_FORMATS_LABEL}.`;
  }

  const declaredMimeType = String(file.type || "").toLowerCase();
  if (declaredMimeType && !acceptedMimeTypes.includes(declaredMimeType)) {
    return `The file extension and reported type do not match. Allowed types: ${ALLOWED_FORMATS_LABEL}.`;
  }

  return "";
};

const Documents = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { categories, categoryError, retryCategories } = useDocumentCategories(authFetch);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentOnly, setCurrentOnly] = useState(true);
  const [historyDocument, setHistoryDocument] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("DRAFT");
  const [uploadCategory, setUploadCategory] = useState("UNCATEGORIZED");
  const [uploadDate, setUploadDate] = useState("");
  const [listRevision, setListRevision] = useState(0);
  const [editing, setEditing] = useState(null);
  const currentProject = useRef(null);
  const downloadRequests = useRef(new Map());
  const [downloading, setDownloading] = useState([]);
  const [downloadError, setDownloadError] = useState("");
  const { selectedProjectId, projects } = useContext(ProjectContext);
  currentProject.current = selectedProjectId;
  const { user, hasRole, hasAnyRole } = useAuth();
  const canUploadDocuments = hasAnyRole("ADMIN", "PROJECT_MANAGER");
  const canDeleteDocuments = hasRole("ADMIN");

  const [uploadInfo, setUploadInfo] = useTransientMessage("", value => value.startsWith("Upload complete."));
  useEffect(() => {
    setEditing(null);
    setHistoryDocument(null);
    setUploadStatus("DRAFT");
    setUploadInfo("");
    setUploadError("");
    setUploadCategory("UNCATEGORIZED");
    setUploadDate("");
    setDownloadError("");
    setDownloading([]);
    const requests = downloadRequests.current;
    return () => {
      requests.forEach((controller) => controller.abort());
      requests.clear();
    };
  }, [selectedProjectId, setUploadInfo]);

  const handleDownload = async (id) => {
    if (downloadRequests.current.has(id)) return;
    const controller = new AbortController();
    downloadRequests.current.set(id, controller);
    setDownloading((current) => [...current, id]);
    setDownloadError("");
    try {
      await downloadDocument(id, authFetch, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setDownloadError(error.message || "Download failed. Please try again.");
    } finally {
      if (downloadRequests.current.get(id) === controller) {
        downloadRequests.current.delete(id);
        setDownloading((current) => current.filter((value) => value !== id));
      }
    }
  };

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
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

  const employeeNamesById = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          String(employee.id ?? employee.employeeId),
          [employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
            employee.name ||
            `Employee #${employee.id ?? employee.employeeId}`,
        ])
      ),
    [employees]
  );

  const getEmployeeLabel = (document) => {
    const employeeId =
      document.employeeId ?? document.employee?.id ?? document.employee?.employeeId;
    if (!employeeId) return "Unknown employee";
    return employeeNamesById.get(String(employeeId)) || `Employee #${employeeId}`;
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/employees/active`, {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        });
        if (!res.ok) throw new Error("Failed to load employee names");
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load document uploader names:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, [authHeaders]);

  useEffect(() => { setDocuments([]); setListLoaded(false); }, [selectedProjectId, categoryFilter, currentOnly]);

  // Fetch documents for selected project
  useEffect(() => {
    const controller = new AbortController();
    if (!selectedProjectId) {
      setDocuments([]); setLoading(false);
      return;
    }

    const fetchDocs = async () => {
      setLoading(true);
      setListError("");
      try {
        const res = await authFetch(
          `${BASE_URL}/api/documents/project/${selectedProjectId}${categoryFilter ? `?category=${encodeURIComponent(categoryFilter)}` : ""}${currentOnly ? `${categoryFilter ? "&" : "?"}currentOnly=true` : ""}`,
          {
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          }
        );

        if (!res.ok) {
          throw new Error(await readApiError(res, "Failed to load documents"));
        }

        const data = await res.json();
        if (!controller.signal.aborted) { setDocuments(Array.isArray(data) ? data : []); setListLoaded(true); }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setListError(err.message || "Failed to load documents");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDocs();
    return () => controller.abort();
  }, [selectedProjectId, authHeaders, authFetch, categoryFilter, currentOnly, listRevision]);

  // ✅ Parse API errors nicely (supports your ApiError { message, fieldErrors... })
  const readApiErrorMessage = (res) => readDocumentError(res, "Request failed.");

  const uploadDocument = async (file) => {
    if (!canUploadDocuments || !file || !selectedProjectId || uploading || !categories.length) return;
    const uploadProject = selectedProjectId;

    setUploadError("");
    setUploadInfo("");

    if (!user?.employeeId) {
      setUploadError("Your account is not linked to an employee record.");
      return;
    }

    const validationMessage = validateDocumentFile(file);
    if (validationMessage) {
      setUploadError(validationMessage);
      return;
    }

    setUploading(true);
    setUploadInfo(`Uploading ${file.name} (${formatMB(file.size)})...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProjectId);
      formData.append("employeeId", user.employeeId);
      formData.append("category", uploadCategory);
      formData.append("status", uploadStatus);
      if (uploadDate) formData.append("documentDate", uploadDate);

      const res = await authFetch(`${BASE_URL}/api/documents/upload`, {
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

      await res.json();
      if (currentProject.current === uploadProject) {
        setListRevision((value) => value + 1);
        setUploadInfo("Upload complete. The list shows documents matching the selected category filter.");
      }
    } catch (err) {
      if (currentProject.current !== uploadProject) return;
      console.error(err);
      setUploadError(err.message || "Upload failed");
      setUploadInfo("");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!canUploadDocuments) return;
    const file = e.dataTransfer.files?.[0];
    if (file) uploadDocument(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileInput = (e) => {
    if (!canUploadDocuments) return;
    const file = e.target.files?.[0];
    if (file) uploadDocument(file);
    // optional: allow selecting the same file twice in a row
    e.target.value = "";
  };

  const handleClickPicker = () => {
    if (!canUploadDocuments || uploading || !categories.length) return;
    const input = document.getElementById("documentFileInput");
    if (input) input.click();
  };

  // Delete a document (soft delete in backend)
  const handleDeleteDocument = async (docId) => {
    if (!canDeleteDocuments) return;
    if (!window.confirm("Delete this document? If it is the current version, older versions will not become current."))
      return;

    setDeleteError("");
    setDeletingId(docId);

    try {
      const res = await authFetch(`${BASE_URL}/api/documents/${docId}`, {
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
      setListRevision((value) => value + 1);
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const anyError = downloadError || uploadError || deleteError || listError;

  const { hasUnsavedChanges, confirmDiscardUnsavedChanges } = useUnsavedChanges();
  const metadataSave = useRecordAutosave({
    recordKey: `document-${selectedProjectId}-${editing?.original.id}`,
    enabled: canUploadDocuments && !!editing && categories.length > 0,
    read: async () => {
      const response = await authFetch(`${BASE_URL}/api/documents/project/${selectedProjectId}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readDocumentError(response, "Could not read current document details."));
      const rows = await response.json();
      const fresh = rows.find(row => row.id === editing.original.id);
      if (!fresh || fresh.isCurrent !== true || fresh.isDeleted === true) throw new Error("This document is no longer an active current version. Close the editor and review version history. Your edits have not been applied.");
      return { ...fresh, category: fresh.category || "UNCATEGORIZED", documentDate: fresh.documentDate || "", status: fresh.status || "" };
    },
    write: async (fresh, changes) => {
      const response = await authFetch(`${BASE_URL}/api/documents/${fresh.id}`, {
        method: "PUT", silentSuccess: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fresh.id, documentName: fresh.documentName, projectId: fresh.projectId, employeeId: fresh.employeeId,
          ...changes, ...(Object.hasOwn(changes, "documentDate") ? { documentDate: changes.documentDate || null } : {}) }),
      });
      if (!response.ok) throw new Error(await readDocumentError(response, "Could not update document details."));
    },
    validate: value => !categories.some(category => category.id === value.category) ? "Choose an available category." : value.documentDate && !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value.documentDate) ? "Enter a complete document date." : "",
    onSaved: (saved, changes, pending) => {
      setEditing({ original: saved, status: saved.status || "", category: saved.category, documentDate: saved.documentDate || "", ...pending });
      setListRevision(value => value + 1);
    },
  });
  const saving = metadataSave.busy;
  useUnsavedChange("document-details", metadataSave.dirty || uploading);
  useAutomaticRefresh(() => setListRevision(value => value + 1), loading || uploading || !!deletingId || metadataSave.dirty || saving || hasUnsavedChanges);
  const editMetadata = (field, value, immediate = true) => {
    metadataSave.edit({ [field]: value }, { ...editing.original, category: editing.original.category || "UNCATEGORIZED", documentDate: editing.original.documentDate || "", status: editing.original.status || "" }, immediate);
    setEditing(current => ({ ...current, [field]: value }));
  };
  const closeEditor = () => {
    if (metadataSave.dirty && !window.confirm("Discard unsaved document details? Previously saved changes will remain.")) return;
    setEditing(null);
  };

  const categoryOptions = categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Documents</h2>
            <p className={styles.pageSubtitle}>
              {selectedProjectId
                ? `${getSelectedProjectName(projects, selectedProjectId)} • ${documents.length} document${documents.length === 1 ? "" : "s"}`
                : "Select a project to see documents"}
            </p>
          </div>

          <div className={styles.headerActions} />
        </div>

        {!selectedProjectId && (
          <p className={styles.infoText}>Please select a project first.</p>
        )}

        {selectedProjectId && (
          <>
            {categoryError && <div role="alert" className={styles.errorBanner}>{categoryError} <button type="button" onClick={retryCategories}>Retry categories</button></div>}
            <ProjectDocumentChecklist key={selectedProjectId} projectId={selectedProjectId} authFetch={authFetch} categories={categories} refreshKey={listRevision} />
            {/* Error banner */}
            {anyError && (
              <ErrorBanner
                message={anyError}
                onDismiss={() => {
                  setDownloadError("");
                  setUploadError("");
                  setDeleteError("");
                  setListError("");
                }}
              />
            )}

            {/* Optional small info line */}
            {uploadInfo && !uploadError && (
              <p className={styles.infoText}>{uploadInfo}</p>
            )}

            {canUploadDocuments && (
              <>
                <div className={styles.metadataControls}>
                  <DocumentStatus label="Upload status" value={uploadStatus} disabled={uploading} onChange={(e) => setUploadStatus(e.target.value)} />
                  <label>Upload category<select value={uploadCategory} disabled={uploading || !categories.length} onChange={(e) => setUploadCategory(e.target.value)}>{categoryOptions}</select></label>
                  <label>Document date (optional)<input type="date" min="1000-01-01" max="9999-12-31" value={uploadDate} disabled={uploading} onChange={(e) => setUploadDate(e.target.value)} /></label>
                </div>
                <p className={styles.infoText}>Choose details before selecting a file. The document date is the date on the document, not its upload date.</p>
                <p className={styles.infoText}>Final is a descriptive label, not approval or proof of signing.</p>
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
                  aria-disabled={uploading || !categories.length}
                >
                  <FiUploadCloud size={24} className={styles.uploadIcon} />
                  <span>
                    {uploading
                      ? "Uploading..."
                      : "Choose a file, or drag and drop it here"}
                  </span>
                  <span className={styles.uploadFormats}>
                    {ALLOWED_FORMATS_LABEL} • max {MAX_UPLOAD_MB}MB
                  </span>
                </div>

                <input
                  id="documentFileInput"
                  type="file"
                  accept={FILE_INPUT_ACCEPT}
                  className={styles.hiddenFileInput}
                  onChange={handleFileInput}
                />
              </>
            )}

            {/* Section heading */}
            <h3 className={styles.sectionTitle}>Files for this project</h3>
            <div className={styles.metadataControls}>
              <label>Versions shown<select value={currentOnly ? "current" : "all"} disabled={!!editing} onChange={(e) => { setCurrentOnly(e.target.value === "current"); setEditing(null); }}><option value="current">Current versions</option><option value="all">All active versions</option></select></label>
              <label>Filter by category<select value={categoryFilter} disabled={!!editing || !categories.length} onChange={(e) => { setCategoryFilter(e.target.value); setEditing(null); }}><option value="">All categories</option>{categoryOptions}</select></label>
              {listError && <button type="button" onClick={() => setListRevision(value => value + 1)} disabled={loading}>Retry loading documents</button>}
            </div>
            {editing && <form className={styles.metadataEditor} onSubmit={event => event.preventDefault()} onBlur={metadataSave.flush}>
              <h4>Edit details · {editing.original.documentName}</h4>
              <AutosaveStatus save={metadataSave} />
              <p>Details save automatically. Final is a descriptive label, not approval.</p>
              <div className={styles.metadataControls}>
                <DocumentStatus value={editing.status} allowUnknown={!editing.original.status} disabled={saving} onChange={(e) => editMetadata("status", e.target.value)} />
                <label>Category<select value={editing.category} disabled={saving || !categories.length} onChange={(e) => editMetadata("category", e.target.value)}>{categoryOptions}</select></label>
                <label>Document date<input type="date" min="1000-01-01" max="9999-12-31" value={editing.documentDate} disabled={saving} onChange={(e) => editMetadata("documentDate", e.target.value, false)} /></label>
              </div>
              <p className={styles.infoText}>Leave the date empty to clear it. Choose Uncategorized to remove a classification.</p>
              <button className={styles.downloadLink} type="button" disabled={saving} onClick={closeEditor}>Done editing</button>
            </form>}
            {historyDocument && <DocumentVersions key={`${selectedProjectId}-${historyDocument.id}`} document={historyDocument} authFetch={authFetch} categories={categories} canEdit={canUploadDocuments} canDelete={canDeleteDocuments} onDownload={handleDownload} downloading={downloading} revision={listRevision} onChanged={() => { setListRevision((value) => value + 1); }} onClose={() => setHistoryDocument(null)} validateFile={validateDocumentFile} />}

            {loading && !listLoaded && (
              <p className={styles.loadingText}>Loading documents...</p>
            )}

            {listLoaded && documents.length === 0 && !listError && (
              <p className={styles.emptyText}>{categoryFilter ? "No documents match this category." : currentOnly ? "No active current documents. Use All active versions to find retained earlier versions." : "No active documents."}</p>
            )}

            {documents.length > 0 && (
              <ul className={styles.documentsList}>
                {documents.map((doc) => (
                  <li key={doc.id} className={styles.documentItem}>
                    <div className={styles.docInfo}>
                      <span className={styles.docName}>{doc.documentName}</span>
                      <span className={styles.uploadedBy}>{statusLabel(doc.status)} · Version {doc.versionNumber || 1} · {doc.isCurrent === true ? "Current" : doc.isCurrent === false ? "Historical · read-only" : "Version state unknown"}</span>
                      <span className={styles.uploadedBy}>
                        {categories.find((item) => item.id === doc.category)?.label || doc.category || "Uncategorized"} · Document date: {doc.documentDate || "Unknown"}
                      </span>
                      <span className={styles.uploadedBy}>Uploaded by {uploaderLabel(doc)} · Uploaded: {uploadTimeLabel(doc.uploadedAt)}</span>
                      <span className={styles.uploadedBy}>Employee attribution: {getEmployeeLabel(doc)}</span>
                    </div>

                    <div className={styles.docActions}>
                      <button type="button" className={styles.downloadLink} disabled={saving} onClick={() => { if (!confirmDiscardUnsavedChanges()) return; setEditing(null); setHistoryDocument(doc); }}>Version history</button>
                      {canUploadDocuments && doc.isCurrent === true && <button type="button" className={styles.downloadLink} disabled={saving || !categories.length || !!editing} onClick={() => { setEditing({ original: doc, category: doc.category || "UNCATEGORIZED", documentDate: doc.documentDate || "", status: doc.status || "" }); }}>Edit details</button>}
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id)}
                        disabled={downloading.includes(doc.id)}
                        aria-busy={downloading.includes(doc.id)}
                        title="Download"
                        className={styles.downloadLink}
                      >
                        <FiDownload />
                        <span>{downloading.includes(doc.id) ? "Downloading…" : "Download"}</span>
                      </button>

                      {canDeleteDocuments && <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingId === doc.id || !!editing}
                        title="Delete"
                        className={styles.dangerIconBtn}
                        aria-label="Delete"
                      >
                        <FiTrash2 />
                        <span className={styles.mobileActionLabel}>Delete</span>
                      </button>}
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
