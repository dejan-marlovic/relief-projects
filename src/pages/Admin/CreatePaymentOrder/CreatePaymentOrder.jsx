import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  transactionId: "",
  paymentOrderDate: "",
  numberOfTransactions: "",
  paymentOrderDescription: "",
  message: "",
  pinCode: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.paymentOrderDate)
    errors.paymentOrderDate = "Payment order date is required.";
  if (!values.paymentOrderDescription?.trim()) {
    errors.paymentOrderDescription = "Description is required.";
  }
  if (!values.message?.trim()) errors.message = "Message is required.";
  if (!values.pinCode?.trim()) errors.pinCode = "Pin code is required.";
  return errors;
};

const CreatePaymentOrder = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);
  const [transactions, setTransactions] = useState([]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoadingLists(true);
        const res = await authFetch(`${BASE_URL}/api/transactions/active`);
        const data = await safeReadJson(res);
        setTransactions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading transactions:", err);
        setFormError("Failed to load transactions.");
      } finally {
        setLoadingLists(false);
      }
    };

    loadTransactions();
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
        transactionId: form.transactionId ? Number(form.transactionId) : null,
        paymentOrderDate: form.paymentOrderDate,
        numberOfTransactions: form.numberOfTransactions
          ? Number(form.numberOfTransactions)
          : null,
        paymentOrderDescription: form.paymentOrderDescription.trim(),
        message: form.message.trim(),
        pinCode: form.pinCode.trim(),
      };

      const res = await authFetch(`${BASE_URL}/api/payment-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the payment order.",
        );
        return;
      }

      alert(
        `Payment order created successfully${data?.id ? ` (id: ${data.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create payment order error:", err);
      setFormError(
        err?.message || "Unexpected error while creating payment order.",
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
            <h3 className={styles.pageTitle}>Create Payment Order</h3>
            <p className={styles.pageSubtitle}>
              Create a payment order. Header transaction is optional.
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
              <div className={styles.cardTitle}>Header link</div>
              <div className={styles.cardMeta}>Optional</div>
            </div>

            <div className={styles.formGroup}>
              <label>Transaction</label>
              <select
                className={inputClass("transactionId")}
                name="transactionId"
                value={form.transactionId}
                onChange={handleChange}
              >
                <option value="">No header transaction</option>
                {transactions.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    Transaction #{tx.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Payment order details</div>
              <div className={styles.cardMeta}>Required fields</div>
            </div>

            <div className={styles.formGroup}>
              <label>Payment order date</label>
              <input
                className={inputClass("paymentOrderDate")}
                type="datetime-local"
                name="paymentOrderDate"
                value={form.paymentOrderDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Number of transactions</label>
              <input
                className={inputClass("numberOfTransactions")}
                type="number"
                name="numberOfTransactions"
                value={form.numberOfTransactions}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                className={inputClass("paymentOrderDescription")}
                name="paymentOrderDescription"
                value={form.paymentOrderDescription}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Message</label>
              <input
                className={inputClass("message")}
                name="message"
                value={form.message}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Pin code</label>
              <input
                className={inputClass("pinCode")}
                name="pinCode"
                value={form.pinCode}
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
            <FiSave /> Create payment order
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

export default CreatePaymentOrder;
