import React, { useEffect, useState, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";

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
            }}
          >
            {uploading
              ? "Uploading..."
              : "Drag & drop a document here, or click to select"}
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
                  }}
                >
                  <span>{doc.documentName}</span>
                  <a
                    href={`${DOCUMENTS_BASE_PATH}${doc.documentPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.9rem" }}
                  >
                    Download
                  </a>
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
