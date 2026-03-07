// src/components/Admin/CreateCostType/CreateCostType.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateCostType.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Initial form state
const initialCostTypeDetails = {
  costTypeName: "",
};

// UX validation aligned with your DTO intent + DB constraints:
// - costTypeName: required (NotNull + NotBlank)
// - length: 255 (based on your entity column length)
const validateCostTypeDetails = (values) => {
  const errors = {};

  const name = values.costTypeName?.trim() || "";

  if (!name)
    errors.costTypeName =
      "Cost type name is required (e.g. Direct Cost, Indirect Cost).";
  else if (name.length > 255)
    errors.costTypeName = "Cost type name must be max 255 characters.";

  return errors;
};

const CreateCostType = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [costTypeDetails, setCostTypeDetails] = useState(
    initialCostTypeDetails,
  );

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setCostTypeDetails(initialCostTypeDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setCostTypeDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    costTypeName: values.costTypeName?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateCostTypeDetails(costTypeDetails);
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

      const payload = buildPayload(costTypeDetails);

      const res = await authFetch(`${BASE_URL}/api/cost-types`, {
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
            "There was a problem creating the cost type.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.costTypeId ?? created?.cost_type_id;

      alert(
        `Cost type created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );

      resetForm();
    } catch (err) {
      console.error("Create cost type error:", err);
      setFormError(
        err?.message || "Unexpected error while creating cost type.",
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
            <h3 className={styles.pageTitle}>Create Cost Type</h3>
            <p className={styles.pageSubtitle}>
              Create a high-level category (one level above Costs), e.g.{" "}
              <strong>Direct Cost</strong> or <strong>Indirect Cost</strong>.
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
                  <div className={styles.cardTitle}>Cost type details</div>
                  <div className={styles.cardMeta}>Required field</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Cost type name</label>
                  <input
                    className={inputClass("costTypeName")}
                    name="costTypeName"
                    placeholder="e.g. Direct Cost"
                    value={costTypeDetails.costTypeName}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.costTypeName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.costTypeName}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  This is a <strong>high-level grouping</strong>. Individual
                  cost items (like fuel, rent, salaries) belong under a Cost
                  Type.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>How this is used</div>
                  <div className={styles.cardMeta}>One level above Costs</div>
                </div>

                <div className={styles.mutedHint}>
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      You typically only need a few Cost Types, for example:
                      <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                        <li>
                          <strong>Direct Cost</strong> (costs that directly
                          support the project deliverables)
                        </li>
                        <li>
                          <strong>Indirect Cost</strong>{" "}
                          (overhead/admin/support)
                        </li>
                      </ul>
                    </li>
                    <li>
                      Later, when creating a <strong>Cost</strong>, you pick one
                      of these as the parent category.
                    </li>
                    <li>Name is required and max 255 characters.</li>
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
                <FiSave /> Create cost type
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

export default CreateCostType;
