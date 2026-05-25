import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  organizationId: "",
  paymentOrderId: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.organizationId)
    errors.organizationId = "Organization is required.";
  if (!values.paymentOrderId)
    errors.paymentOrderId = "Payment order is required.";
  return errors;
};

const CreateRecipient = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const [organizations, setOrganizations] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingLists(true);

        const [orgRes, poRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/organizations/active`),
          authFetch(`${BASE_URL}/api/payment-orders/active`),
        ]);

        const [orgData, poData] = await Promise.all([
          safeReadJson(orgRes),
          safeReadJson(poRes),
        ]);

        setOrganizations(Array.isArray(orgData) ? orgData : []);
        setPaymentOrders(Array.isArray(poData) ? poData : []);
      } catch (err) {
        console.error("Error loading recipient form data:", err);
        setFormError("Failed to load related data.");
      } finally {
        setLoadingLists(false);
      }
    };

    loadData();
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
        paymentOrderId: Number(form.paymentOrderId),
      };

      const res = await authFetch(`${BASE_URL}/api/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the recipient.",
        );
        return;
      }

      alert(
        `Recipient created successfully${data?.id ? ` (id: ${data.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create recipient error:", err);
      setFormError(
        err?.message || "Unexpected error while creating recipient.",
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
            <h3 className={styles.pageTitle}>Create Recipient</h3>
            <p className={styles.pageSubtitle}>
              Link an organization to a payment order recipient row.
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
              <div className={styles.cardTitle}>Recipient details</div>
              <div className={styles.cardMeta}>Required relations</div>
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

            <div className={styles.formGroup}>
              <label>Payment order</label>
              <select
                className={inputClass("paymentOrderId")}
                name="paymentOrderId"
                value={form.paymentOrderId}
                onChange={handleChange}
              >
                <option value="">Select payment order</option>
                {paymentOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.paymentOrderDescription} (id: {po.id})
                  </option>
                ))}
              </select>
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
            <FiSave /> Create recipient
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

export default CreateRecipient;
