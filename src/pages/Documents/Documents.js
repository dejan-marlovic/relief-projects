import React, { useEffect, useState, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { FiTrash2, FiDownload, FiUploadCloud } from "react-icons/fi";

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
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${BASE_URL}/api/documents/project/${selectedProjectId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
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
  }, [selectedProjectId]);

  const uploadDocument = async (file) => {
    if (!file || !selectedProjectId) return;

    setUploadError("");
    setUploading(true);

    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProjectId);
      formData.append("employeeId", CURRENT_EMPLOYEE_ID);

      const res = await fetch(`${BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // do NOT set Content-Type here; browser sets multipart boundary
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Upload failed");
      }

      const created = await res.json();
      // append new doc to list
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
    if (file) {
      uploadDocument(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file);
    }
  };

  const handleClickPicker = () => {
    const input = document.getElementById("documentFileInput");
    if (input) {
      input.click();
    }
  };

  // Delete a document (soft delete in backend)
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    setDeleteError("");
    setDeletingId(docId);

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to delete document");
      }

      // remove from local state
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Documents</h2>

      {!selectedProjectId && (
        <p style={{ color: "#555" }}>Please select a project first.</p>
      )}

      {selectedProjectId && (
        <>
          {/* Upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClickPicker}
            style={{
              border: "2px dashed #ccc",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiUploadCloud size={24} />
            <span>
              {uploading
                ? "Uploading..."
                : "Drag & drop a document here, or click to select"}
            </span>
          </div>

          <input
            id="documentFileInput"
            type="file"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />

          {uploadError && (
            <div style={{ color: "red", marginBottom: "12px" }}>
              {uploadError}
            </div>
          )}

          {deleteError && (
            <div style={{ color: "red", marginBottom: "12px" }}>
              {deleteError}
            </div>
          )}

          {/* Documents list */}
          <h3>Files for this project</h3>

          {loading && <p>Loading documents...</p>}

          {listError && <p style={{ color: "red" }}>{listError}</p>}

          {!loading && documents.length === 0 && !listError && (
            <p style={{ color: "#555" }}>No documents uploaded yet.</p>
          )}

          {documents.length > 0 && (
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span>{doc.documentName}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <a
                      href={`${DOCUMENTS_BASE_PATH}${doc.documentPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download"
                      style={{
                        fontSize: "0.9rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        textDecoration: "none",
                      }}
                    >
                      <FiDownload />
                      <span>Download</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      title="Delete"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "1px solid #cc0000",
                        background:
                          deletingId === doc.id ? "#ffcccc" : "#ffe5e5",
                        color: "#990000",
                        cursor:
                          deletingId === doc.id ? "not-allowed" : "pointer",
                      }}
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
  );
};

export default Documents;
