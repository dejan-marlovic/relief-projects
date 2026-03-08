// src/components/Admin/CreateProjectType/CreateProjectType.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateProjectType.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Intial form state
const initialProjectTypeDetails = {
  projectTypeName: "",
};

// UX validation aligned with your DTO intent + DB constraints:
// - projectTypeName: required (NotBlank + unique)
const validateProjectTypeDetails = (values) => {
  const errors = {};

  const name = values.projectTypeName?.trim() || "";

  if (!name) errors.projectTypeName = "Project type name is required.";
  else if (name.length > 255)
    errors.projectTypeName = "Name must be max 255 characters.";

  return errors;
};

const CreateProjectType = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [projectTypeDetails, setProjectTypeDetails] = useState(
    initialProjectTypeDetails,
  );

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setProjectTypeDetails(initialProjectTypeDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setProjectTypeDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    projectTypeName: values.projectTypeName?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateProjectTypeDetails(projectTypeDetails);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const payload = buildPayload(projectTypeDetails);

      const res = await authFetch(`${BASE_URL}/api/project-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeReadJson(res);

        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the project type.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.projectTypeId ?? created?.project_type_id;

      alert(
        `Project type created successfully${
          createdId ? ` (id: ${createdId})` : "!"
        }`,
      );

      resetForm();
    } catch (err) {
      console.error("Create project type error:", err);
      setFormError(
        err?.message || "Unexpected error while creating project type.",
      );
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Project Type</h3>
            <p className={styles.pageSubtitle}>
              Add a project type used to classify and group projects.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {hasAnyFieldErrors && (
          <div className={styles.errorList}>
            <ul>
              {Object.entries(fieldErrors).map(([field, message]) => (
                <li key={field}>
                  <strong>{field}</strong>: {message}
                </li>
              ))}
            </ul>
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
              {/* Card 1 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Project type details</div>
                  <div className={styles.cardMeta}>Required field</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project type name</label>
                  <input
                    className={inputClass("projectTypeName")}
                    name="projectTypeName"
                    placeholder="e.g. Humanitarian"
                    value={projectTypeDetails.projectTypeName}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.projectTypeName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.projectTypeName}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Note: project type name should be unique.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>What is this used for?</div>
                  <div className={styles.cardMeta}>Help & examples</div>
                </div>

                <div className={styles.mutedHint}>
                  Project Types are master data used to classify projects for:
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Filtering and reporting (e.g. show all{" "}
                      <strong>Humanitarian</strong> projects).
                    </li>
                    <li>
                      Consistent grouping across your portfolio (Development vs
                      Democracy, etc.).
                    </li>
                    <li>
                      Standardized categories for internal and external
                      reporting.
                    </li>
                  </ul>
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
                <FiSave /> Create project type
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
          </>
        )}
      </div>
    </div>
  );
};

export default CreateProjectType;
