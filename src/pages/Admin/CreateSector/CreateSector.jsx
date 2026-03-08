// src/components/Admin/CreateSector/CreateSector.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateSector.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Intial form state
const initialSectorDetails = {
  sectorCode: "",
  sectorDescription: "",
};

// UX validation aligned with your DTO intent + DB constraints:
// - sectorCode: required (NotBlank + unique) max 50
// - sectorDescription: required (NotBlank + unique) (no length in DTO, but keep reasonable)
const validateSectorDetails = (values) => {
  const errors = {};

  const code = values.sectorCode?.trim() || "";
  const desc = values.sectorDescription?.trim() || "";

  if (!code) errors.sectorCode = "Sector code is required (e.g. EDU).";
  else if (code.length > 50)
    errors.sectorCode = "Code must be max 50 characters.";

  if (!desc)
    errors.sectorDescription =
      "Sector description is required (e.g. Education).";
  else if (desc.length > 255)
    errors.sectorDescription = "Description must be max 255 characters.";

  return errors;
};

const CreateSector = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [sectorDetails, setSectorDetails] = useState(initialSectorDetails);

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setSectorDetails(initialSectorDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setSectorDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    sectorCode: values.sectorCode?.trim() ?? "",
    sectorDescription: values.sectorDescription?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateSectorDetails(sectorDetails);
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

      const payload = buildPayload(sectorDetails);

      const res = await authFetch(`${BASE_URL}/api/sectors`, {
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
            "There was a problem creating the sector.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId = created?.id ?? created?.sectorId ?? created?.sector_id;

      alert(
        `Sector created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );

      resetForm();
    } catch (err) {
      console.error("Create sector error:", err);
      setFormError(err?.message || "Unexpected error while creating sector.");
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
            <h3 className={styles.pageTitle}>Create Sector</h3>
            <p className={styles.pageSubtitle}>
              Add a sector code + description used to categorize projects.
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
                  <div className={styles.cardTitle}>Sector details</div>
                  <div className={styles.cardMeta}>Required fields</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Sector code</label>
                  <input
                    className={inputClass("sectorCode")}
                    name="sectorCode"
                    placeholder="e.g. EDU"
                    value={sectorDetails.sectorCode}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.sectorCode && (
                    <div className={styles.fieldError}>
                      {fieldErrors.sectorCode}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Sector description</label>
                  <input
                    className={inputClass("sectorDescription")}
                    name="sectorDescription"
                    placeholder="e.g. Education"
                    value={sectorDetails.sectorDescription}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.sectorDescription && (
                    <div className={styles.fieldError}>
                      {fieldErrors.sectorDescription}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Note: both code and description should be unique.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>What is this used for?</div>
                  <div className={styles.cardMeta}>Help & examples</div>
                </div>

                <div className={styles.mutedHint}>
                  Sectors are master data used to classify project activities
                  and improve reporting:
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Standard categorization for filtering and dashboards (e.g.
                      show all <strong>EDU</strong> projects).
                    </li>
                    <li>
                      Aligns with common humanitarian sector codes (CCM, WASH,
                      HEA, etc.).
                    </li>
                  </ul>
                </div>

                <div
                  className={styles.mutedHint}
                  style={{ marginTop: "0.6rem" }}
                >
                  Examples from your current table:
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      <strong>CCM</strong> — Camp Coordination and Management
                    </li>
                    <li>
                      <strong>EDU</strong> — Education
                    </li>
                    <li>
                      <strong>WSH</strong> — WASH
                    </li>
                    <li>
                      <strong>PRO-GBV</strong> — Protection - Gender Based
                      Violence
                    </li>
                    <li>
                      <strong>MULTI</strong> — Basic Needs - Cross Sector -
                      Multipurpose Programme Design
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
                <FiSave /> Create sector
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

export default CreateSector;
