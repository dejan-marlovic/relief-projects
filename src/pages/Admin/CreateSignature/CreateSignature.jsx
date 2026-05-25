import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  signatureStatusId: "",
  employeeId: "",
  paymentOrderId: "",
  signature: "",
  signatureDate: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.signatureStatusId)
    errors.signatureStatusId = "Signature status is required.";
  if (!values.employeeId) errors.employeeId = "Employee is required.";
  if (!values.paymentOrderId)
    errors.paymentOrderId = "Payment order is required.";
  if (!values.signature?.trim())
    errors.signature = "Signature text is required.";
  if (!values.signatureDate)
    errors.signatureDate = "Signature date is required.";
  return errors;
};

const CreateSignature = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const [signatureStatuses, setSignatureStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingLists(true);
        const [statusRes, employeeRes, poRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/signature-statuses/active`),
          authFetch(`${BASE_URL}/api/employees/active`),
          authFetch(`${BASE_URL}/api/payment-orders/active`),
        ]);

        const [statusData, employeeData, poData] = await Promise.all([
          safeReadJson(statusRes),
          safeReadJson(employeeRes),
          safeReadJson(poRes),
        ]);

        setSignatureStatuses(Array.isArray(statusData) ? statusData : []);
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
        setPaymentOrders(Array.isArray(poData) ? poData : []);
      } catch (err) {
        console.error("Error loading signature form data:", err);
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
        signatureStatusId: Number(form.signatureStatusId),
        employeeId: Number(form.employeeId),
        paymentOrderId: Number(form.paymentOrderId),
        signature: form.signature.trim(),
        signatureDate: form.signatureDate,
      };

      const res = await authFetch(`${BASE_URL}/api/signatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the signature.",
        );
        return;
      }

      alert(
        `Signature created successfully${data?.id ? ` (id: ${data.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create signature error:", err);
      setFormError(
        err?.message || "Unexpected error while creating signature.",
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
            <h3 className={styles.pageTitle}>Create Signature</h3>
            <p className={styles.pageSubtitle}>
              Create a signature linked to status, employee and payment order.
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
              <label>Signature status</label>
              <select
                className={inputClass("signatureStatusId")}
                name="signatureStatusId"
                value={form.signatureStatusId}
                onChange={handleChange}
              >
                <option value="">Select signature status</option>
                {signatureStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (id: {s.id})
                  </option>
                ))}
              </select>
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

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Signature details</div>
              <div className={styles.cardMeta}>Text and date</div>
            </div>

            <div className={styles.formGroup}>
              <label>Signature text</label>
              <input
                className={inputClass("signature")}
                name="signature"
                value={form.signature}
                onChange={handleChange}
                placeholder="e.g. DM"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Signature date</label>
              <input
                className={inputClass("signatureDate")}
                type="datetime-local"
                name="signatureDate"
                value={form.signatureDate}
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
            <FiSave /> Create signature
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

export default CreateSignature;
