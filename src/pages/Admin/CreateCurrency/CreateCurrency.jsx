// src/components/Admin/CreateCurrency/CreateCurrency.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateCurrency.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

//Intial form state
const initialCurrencyDetails = {
  name: "",
  description: "",
};

// UX validation aligned with your DTO intent + DB constraints:
// - name: required (NotBlank + unique)
// - description: required (DB column is NOT NULL + unique in your schema)
const validateCurrencyDetails = (values) => {
  const errors = {};

  const name = values.name?.trim() || "";
  const description = values.description?.trim() || "";

  if (!name) errors.name = "Currency name is required (e.g. USD)";
  else if (name.length > 50) errors.name = "Name must be max 50 characters.";

  if (!description)
    errors.description = "Currency description is required (e.g. US Dollar).";
  else if (description.length > 255)
    errors.description = "Description must be max 255 charachters.";

  return errors;
};

const CreateCurrency = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [currencyDetails, setCurrencyDetails] = useState(
    initialCurrencyDetails,
  );

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setCurrencyDetails(initialCurrencyDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setCurrencyDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    name: values.name?.trim() ?? "",
    description: values.description?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateCurrencyDetails(currencyDetails);
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

      const payload = buildPayload(currencyDetails);

      const res = await authFetch(`${BASE_URL}/api/currencies`, {
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
            "There was a problem creating the currency.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.currencyId ?? created?.currency_id;

      alert(
        `Currency created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );

      resetForm();
    } catch (err) {
      console.error("Create currency error:", err);
      setFormError(err?.message || "Unexpected error while creating currency.");
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
            <h3 className={styles.pageTitle}>Create Currency</h3>
            <p className={styles.pageSubtitle}>
              Add a currency (name + description).
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
                  <div className={styles.cardTitle}>Currency details</div>
                  <div className={styles.cardMeta}>Required fields</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Currency name</label>
                  <input
                    className={inputClass("name")}
                    name="name"
                    placeholder="e.g. USD"
                    value={currencyDetails.name}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.name && (
                    <div className={styles.fieldError}>{fieldErrors.name}</div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <input
                    className={inputClass("description")}
                    name="description"
                    placeholder="e.g. US Dollar"
                    value={currencyDetails.description}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.description && (
                    <div className={styles.fieldError}>
                      {fieldErrors.description}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Note: name and description should be unique.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Rules & tips</div>
                  <div className={styles.cardMeta}>Validation</div>
                </div>

                <div className={styles.mutedHint}>
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Use a short code for name (e.g. <strong>USD</strong>,{" "}
                      <strong>EUR</strong>, <strong>SEK</strong>).
                    </li>
                    <li>
                      Description should be human readable (e.g. “US Dollar”).
                    </li>
                    <li>
                      Currency becomes available immediately in Exchange Rates
                      dropdowns.
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
                <FiSave /> Create currency
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

export default CreateCurrency;
