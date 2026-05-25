import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  name: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.name?.trim()) errors.name = "Signature status name is required.";
  return errors;
};

const CreateSignatureStatus = () => {
  const navigate = useNavigate();
  const authFetch = React.useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

      const payload = {
        name: form.name.trim(),
      };

      const res = await authFetch(`${BASE_URL}/api/signature-statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the signature status.",
        );
        return;
      }

      alert(
        `Signature status created successfully${data?.id ? ` (id: ${data.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create signature status error:", err);
      setFormError(
        err?.message || "Unexpected error while creating signature status.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Signature Status</h3>
            <p className={styles.pageSubtitle}>
              Create a new signature status master data record.
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
              <div className={styles.cardTitle}>Signature status details</div>
              <div className={styles.cardMeta}>Required field</div>
            </div>

            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                className={inputClass("name")}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Booked"
              />
              {fieldErrors.name && (
                <div className={styles.fieldError}>{fieldErrors.name}</div>
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
            <FiSave /> Create signature status
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

export default CreateSignatureStatus;
