import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "../UpdateUser/UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

const initialForm = {
  selectedId: "",
  employeeId: "",
  projectId: "",
  documentName: "",
  documentPath: "",
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select a document.";
  if (!values.employeeId) errors.employeeId = "Employee is required.";
  if (!values.projectId) errors.projectId = "Project is required.";
  if (!values.documentName?.trim())
    errors.documentName = "Document name is required.";
  if (!values.documentPath?.trim())
    errors.documentPath = "Document path is required.";

  return errors;
};

const UpdateDocument = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedDocument = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return documents.find((item) => item.id === id) || null;
  }, [form.selectedId, documents]);

  const employeeLabelById = useMemo(() => {
    return employees.reduce((acc, item) => {
      acc[item.id] =
        `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
        `Employee #${item.id}`;
      return acc;
    }, {});
  }, [employees]);

  const projectLabelById = useMemo(() => {
    return projects.reduce((acc, item) => {
      acc[item.id] = item.projectName || item.name || `Project #${item.id}`;
      return acc;
    }, {});
  }, [projects]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [documentRes, employeeRes, projectRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/documents/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/employees/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const documentData = await safeReadJson(documentRes);
      const employeeData = await safeReadJson(employeeRes);
      const projectData = await safeReadJson(projectRes);

      setDocuments(Array.isArray(documentData) ? documentData : []);
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (err) {
      console.error("Load documents error:", err);
      setDocuments([]);
      setEmployees([]);
      setProjects([]);
      setFormError(
        err?.message || "Unexpected error while loading document data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    if (!selectedId) {
      setForm(initialForm);
      return;
    }

    const selected = documents.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      employeeId: selected?.employeeId ? String(selected.employeeId) : "",
      projectId: selected?.projectId ? String(selected.projectId) : "",
      documentName: selected?.documentName || "",
      documentPath: selected?.documentPath || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedDocument) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedDocument.id),
      employeeId: selectedDocument.employeeId
        ? String(selectedDocument.employeeId)
        : "",
      projectId: selectedDocument.projectId
        ? String(selectedDocument.projectId)
        : "",
      documentName: selectedDocument.documentName || "",
      documentPath: selectedDocument.documentPath || "",
    });

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    try {
      setFormError("");
      setSuccessMessage("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setSaving(true);

      const payload = {
        employeeId: Number(form.employeeId),
        projectId: Number(form.projectId),
        documentName: form.documentName.trim(),
        documentPath: form.documentPath.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/documents/${Number(form.selectedId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await safeReadJson(res);

      if (!res.ok) {
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem updating the document.",
        );
        return;
      }

      setDocuments((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? { ...item, ...payload, id: item.id }
            : item,
        ),
      );

      setSuccessMessage(
        `Document "${data?.documentName || payload.documentName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update document error:", err);
      setFormError(err?.message || "Unexpected error while updating document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Document</h3>
            <p className={styles.pageSubtitle}>
              Select an active document and update its metadata.
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
            <FiEdit3 />
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
                  <div className={styles.cardMeta}>Active documents only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Document</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select document</option>
                    {documents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.documentName} -{" "}
                        {projectLabelById[item.projectId] ||
                          `Project #${item.projectId}`}{" "}
                        (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Document metadata only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Employee</label>
                  <select
                    className={inputClass("employeeId")}
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select employee</option>
                    {employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {employeeLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Project</label>
                  <select
                    className={inputClass("projectId")}
                    name="projectId"
                    value={form.projectId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select project</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {projectLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Document name</label>
                  <input
                    className={inputClass("documentName")}
                    name="documentName"
                    value={form.documentName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Document path</label>
                  <input
                    className={inputClass("documentPath")}
                    name="documentPath"
                    value={form.documentPath}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || saving}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={resetForm}
                className={styles.secondaryButton}
                disabled={saving}
              >
                <FiRefreshCw /> Reset form
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className={styles.saveButton}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Update document"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateDocument;
