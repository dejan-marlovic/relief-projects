// src/components/Admin/CreateOrganizationStatus/CreateOrganizationStatus.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateOrganizationStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Intial form state
const initialOrganizationStatusDetails = {
  organizationStatusName: "",
};

// UX validation aligned with your DTO + entity constraints:
// DTO:
// - organizationStatusName: @NotNull @NotBlank
// Entity:
// - organization_status_name length: 255
const validateOrganizationStatusDetails = (values) => {
  const errors = {};

  const name = values.organizationStatusName?.trim() || "";

  if (!name)
    errors.organizationStatusName =
      "Organization status name is required (e.g. Financier).";
  else if (name.length > 255)
    errors.organizationStatusName = "Name must be max 255 characters.";

  return errors;
};

const CreateOrganizationStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [organizationStatusDetails, setOrganizationStatusDetails] = useState(
    initialOrganizationStatusDetails,
  );

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setOrganizationStatusDetails(initialOrganizationStatusDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setOrganizationStatusDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    organizationStatusName: values.organizationStatusName?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateOrganizationStatusDetails(
        organizationStatusDetails,
      );
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

      const payload = buildPayload(organizationStatusDetails);

      const res = await authFetch(`${BASE_URL}/api/organization-statuses`, {
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
            "There was a problem creating the organization status.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ??
        created?.organizationStatusId ??
        created?.organization_status_id;

      alert(
        `Organization status created successfully${
          createdId ? ` (id: ${createdId})` : "!"
        }`,
      );

      resetForm();
    } catch (err) {
      console.error("Create organization status error:", err);
      setFormError(
        err?.message || "Unexpected error while creating organization status.",
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
            <h3 className={styles.pageTitle}>Create Organization Status</h3>
            <p className={styles.pageSubtitle}>
              Add “role / relationship” types for organizations (e.g. Financier,
              Partner, Donor).
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
                  <div className={styles.cardMeta}>Required field</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Status name</label>
                  <input
                    className={inputClass("organizationStatusName")}
                    name="organizationStatusName"
                    placeholder="e.g. Financier"
                    value={organizationStatusDetails.organizationStatusName}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.organizationStatusName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.organizationStatusName}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Examples: <strong>Financier</strong>, <strong>Partner</strong>
                  , <strong>Lead</strong>, <strong>Funder</strong>,{" "}
                  <strong>Donor</strong>, <strong>Implementing Partner</strong>,{" "}
                  <strong>Default</strong>.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>How this is used</div>
                  <div className={styles.cardMeta}>Organizations</div>
                </div>

                <div className={styles.mutedHint}>
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Organization status in your projects (e.g. Donor vs
                      Implementing Partner).
                    </li>
                    <li>
                      When creating or editing an <strong>Organization</strong>,
                      you select one of these statuses to classify it.
                    </li>
                    <li>
                      This enables filtering + reporting, e.g. “show all{" "}
                      <strong>Donors</strong>” or group partners by role.
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
                <FiSave /> Create organization status
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

export default CreateOrganizationStatus;
