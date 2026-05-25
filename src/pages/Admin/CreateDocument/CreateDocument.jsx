import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  employeeId: "",
  projectId: "",
  file: null,
};

const validate = (values) => {
  const errors = {};
  if (!values.employeeId) errors.employeeId = "Employee is required.";
  if (!values.projectId) errors.projectId = "Project is required.";
  if (!values.file) errors.file = "Document file is required.";
  return errors;
};

const CreateDocument = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingLists(true);

        const [employeeRes, projectRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/employees/active`),
          authFetch(`${BASE_URL}/api/projects/active`),
        ]);

        const [employeeData, projectData] = await Promise.all([
          safeReadJson(employeeRes),
          safeReadJson(projectRes),
        ]);

        setEmployees(Array.isArray(employeeData) ? employeeData : []);
        setProjects(Array.isArray(projectData) ? projectData : []);
      } catch (err) {
        console.error("Error loading document form data:", err);
        setFormError("Failed to load related data.");
      } finally {
        setLoadingLists(false);
      }
    };

    loadData();
  }, [authFetch]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "file") {
      setForm((prev) => ({ ...prev, file: files?.[0] || null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const resetForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setFormError("");
  };

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("file", form.file);
      formData.append("projectId", String(Number(form.projectId)));
      formData.append("employeeId", String(Number(form.employeeId)));

      const res = await authFetch(`${BASE_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem uploading the document.",
        );
        return;
      }

      alert(
        `Document uploaded successfully${data?.id ? ` (id: ${data.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create document error:", err);
      setFormError(
        err?.message || "Unexpected error while uploading document.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingLists) {
    return (
      <div className={styles.createContainer}>
        <div className={styles.formContainer}>
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Document</h3>
            <p className={styles.pageSubtitle}>
              Upload a document and link it to an employee and a project.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Relations</div>
              <div className={styles.cardMeta}>Required links</div>
            </div>

            <div className={styles.formGroup}>
              <label>Employee</label>
              <select
                className={inputClass("employeeId")}
                name="employeeId"
                value={form.employeeId}
                onChange={handleChange}
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} (id: {e.id})
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
                onChange={handleChange}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} (id: {p.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Document upload</div>
              <div className={styles.cardMeta}>Required file</div>
            </div>

            <div className={styles.formGroup}>
              <label>File</label>
              <input
                className={inputClass("file")}
                type="file"
                name="file"
                onChange={handleChange}
              />
              {form.file && (
                <div className={styles.mutedHint}>
                  Selected: {form.file.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={handleCreate}
            className={styles.saveButton}
            disabled={loading}
          >
            <FiSave /> Upload document
          </button>

          <button
            type="button"
            onClick={resetForm}
            className={styles.deleteButton}
            disabled={loading}
          >
            <FiX /> Reset form
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDocument;
