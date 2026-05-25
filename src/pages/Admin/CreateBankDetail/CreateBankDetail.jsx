import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  organizationId: "",
  bankName: "",
  accountNumber: "",
  branchName: "",
  swiftCode: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.organizationId)
    errors.organizationId = "Organization is required.";
  if (!values.bankName?.trim()) errors.bankName = "Bank name is required.";
  if (!values.accountNumber?.trim())
    errors.accountNumber = "Account number is required.";
  return errors;
};

const CreateBankDetail = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);
  const [organizations, setOrganizations] = useState([]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoadingLists(true);
        const res = await authFetch(`${BASE_URL}/api/organizations/active`);
        const data = await safeReadJson(res);
        setOrganizations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading organizations:", err);
        setFormError("Failed to load organizations.");
      } finally {
        setLoadingLists(false);
      }
    };

    loadOrganizations();
  }, [authFetch]);

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
        organizationId: Number(form.organizationId),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        branchName: form.branchName.trim(),
        swiftCode: form.swiftCode.trim(),
      };

      const res = await authFetch(`${BASE_URL}/api/bank-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the bank detail.",
        );
        return;
      }

      alert(
        `Bank detail created successfully${data?.bankId ? ` (id: ${data.bankId})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create bank detail error:", err);
      setFormError(
        err?.message || "Unexpected error while creating bank detail.",
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
            <h3 className={styles.pageTitle}>Create Bank Detail</h3>
            <p className={styles.pageSubtitle}>
              Create bank details for an organization.
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
              <div className={styles.cardTitle}>Organization</div>
              <div className={styles.cardMeta}>Required relation</div>
            </div>

            <div className={styles.formGroup}>
              <label>Organization</label>
              <select
                className={inputClass("organizationId")}
                name="organizationId"
                value={form.organizationId}
                onChange={handleChange}
              >
                <option value="">Select organization</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.organizationName} (id: {o.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Bank details</div>
              <div className={styles.cardMeta}>Main fields</div>
            </div>

            <div className={styles.formGroup}>
              <label>Bank name</label>
              <input
                className={inputClass("bankName")}
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Account number</label>
              <input
                className={inputClass("accountNumber")}
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Branch name</label>
              <input
                className={inputClass("branchName")}
                name="branchName"
                value={form.branchName}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>SWIFT code</label>
              <input
                className={inputClass("swiftCode")}
                name="swiftCode"
                value={form.swiftCode}
                onChange={handleChange}
              />
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
            <FiSave /> Create bank detail
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

export default CreateBankDetail;
