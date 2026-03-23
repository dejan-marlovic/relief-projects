// src/components/Admin/CreateProjectStatus/CreateProjectStatus.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateProjectStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Intial form state
const initialProjectStatusDetails = {
  statusName: "",
};

// UX validation aligned with your DTO intent + entity constraints:
// - statusName: required (NotNull + NotBlank), max 50
const validateProjectStatusDetails = (values) => {
  const errors = {};

  const statusName = values.statusName?.trim() || "";
  if (!statusName) errors.statusName = "Status name is required (e.g. Active).";
  else if (statusName.length > 50)
    errors.statusName = "Status name must be max 50 characters.";

  return errors;
};

const CreateProjectStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [projectStatusDetails, setProjectStatusDetails] = useState(
    initialProjectStatusDetails,
  );

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setProjectStatusDetails(initialProjectStatusDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setProjectStatusDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    statusName: values.statusName?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateProjectStatusDetails(projectStatusDetails);
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

      const payload = buildPayload(projectStatusDetails);

      const res = await authFetch(`${BASE_URL}/api/project-statuses`, {
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
            "There was a problem creating the project status.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.projectStatusId ?? created?.project_status_id;

      alert(
        `Project status created successfully${
          createdId ? ` (id: ${createdId})` : "!"
        }`,
      );

      resetForm();
    } catch (err) {
      console.error("Create project status error:", err);
      setFormError(
        err?.message || "Unexpected error while creating project status.",
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
            <h3 className={styles.pageTitle}>Create Project Status</h3>
            <p className={styles.pageSubtitle}>
              Add a status used for projects (e.g. <strong>Active</strong>,{" "}
              <strong>Planned</strong>, <strong>Closed</strong>).
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
                  <div className={styles.cardTitle}>Status details</div>
                  <div className={styles.cardMeta}>Required fields</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Status name</label>
                  <input
                    className={inputClass("statusName")}
                    name="statusName"
                    placeholder="e.g. Active"
                    value={projectStatusDetails.statusName}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.statusName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.statusName}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Tip: keep names short and consistent (max 50 characters).
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>How this is used</div>
                  <div className={styles.cardMeta}>Projects + reporting</div>
                </div>

                <div className={styles.mutedHint}>
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Project Status will be selectable when creating or editing{" "}
                      <strong>Projects</strong>.
                    </li>
                    <li>
                      Useful for filtering lists and grouping dashboards (e.g.
                      “Active projects”).
                    </li>
                    <li>
                      Consider a small set like: <strong>Planned</strong>,{" "}
                      <strong>Active</strong>, <strong>On Hold</strong>,{" "}
                      <strong>Closed</strong>.
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
                <FiSave /> Create project status
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

export default CreateProjectStatus;
