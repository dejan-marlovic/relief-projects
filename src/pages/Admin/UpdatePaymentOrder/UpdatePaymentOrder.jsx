import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "../UpdateUser/UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

const initialForm = {
  selectedId: "",
  transactionId: "",
  paymentOrderDate: "",
  numberOfTransactions: "",
  paymentOrderDescription: "",
  message: "",
  pinCode: "",
};

const toInputDateTime = (value) => {
  if (!value) return "";
  try {
    return String(value).slice(0, 16);
  } catch {
    return "";
  }
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select a payment order.";
  if (!values.paymentOrderDate)
    errors.paymentOrderDate = "Payment order date is required.";
  if (!values.paymentOrderDescription?.trim()) {
    errors.paymentOrderDescription = "Payment order description is required.";
  }
  if (!values.message?.trim()) errors.message = "Message is required.";
  if (!values.pinCode?.trim()) errors.pinCode = "Pin code is required.";

  return errors;
};

const UpdatePaymentOrder = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [paymentOrders, setPaymentOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedPaymentOrder = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return paymentOrders.find((item) => item.id === id) || null;
  }, [form.selectedId, paymentOrders]);

  const projectLabelById = useMemo(() => {
    return projects.reduce((acc, item) => {
      acc[item.id] = item.projectName || `Project #${item.id}`;
      return acc;
    }, {});
  }, [projects]);

  const transactionLabelById = useMemo(() => {
    return transactions.reduce((acc, item) => {
      acc[item.id] =
        `${projectLabelById[item.projectId] || `Project #${item.projectId}`} / transaction #${item.id}`;
      return acc;
    }, {});
  }, [transactions, projectLabelById]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [poRes, txRes, projectRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/payment-orders/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/transactions/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const poData = await safeReadJson(poRes);
      const txData = await safeReadJson(txRes);
      const projectData = await safeReadJson(projectRes);

      setPaymentOrders(Array.isArray(poData) ? poData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (err) {
      console.error("Load payment orders error:", err);
      setPaymentOrders([]);
      setTransactions([]);
      setProjects([]);
      setFormError(
        err?.message || "Unexpected error while loading payment order data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    if (!selectedId) {
      setForm(initialForm);
      return;
    }

    const selected = paymentOrders.find(
      (item) => item.id === Number(selectedId),
    );

    setForm({
      selectedId,
      transactionId: selected?.transactionId
        ? String(selected.transactionId)
        : "",
      paymentOrderDate: toInputDateTime(selected?.paymentOrderDate),
      numberOfTransactions:
        selected?.numberOfTransactions !== undefined &&
        selected?.numberOfTransactions !== null
          ? String(selected.numberOfTransactions)
          : "",
      paymentOrderDescription: selected?.paymentOrderDescription || "",
      message: selected?.message || "",
      pinCode: selected?.pinCode || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedPaymentOrder) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedPaymentOrder.id),
      transactionId: selectedPaymentOrder.transactionId
        ? String(selectedPaymentOrder.transactionId)
        : "",
      paymentOrderDate: toInputDateTime(selectedPaymentOrder.paymentOrderDate),
      numberOfTransactions:
        selectedPaymentOrder.numberOfTransactions !== undefined &&
        selectedPaymentOrder.numberOfTransactions !== null
          ? String(selectedPaymentOrder.numberOfTransactions)
          : "",
      paymentOrderDescription:
        selectedPaymentOrder.paymentOrderDescription || "",
      message: selectedPaymentOrder.message || "",
      pinCode: selectedPaymentOrder.pinCode || "",
    });

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    try {
      setFormError("");
      setSuccessMessage("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setSaving(true);

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

      const res = await authFetch(
        `${BASE_URL}/api/payment-orders/${Number(form.selectedId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await safeReadJson(res);

      if (!res.ok) {
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem updating the payment order.",
        );
        return;
      }

      setPaymentOrders((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? { ...item, ...payload, id: item.id }
            : item,
        ),
      );

      setSuccessMessage("Payment order updated successfully.");
    } catch (err) {
      console.error("Update payment order error:", err);
      setFormError(
        err?.message || "Unexpected error while updating payment order.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Payment Order</h3>
            <p className={styles.pageSubtitle}>
              Select an active payment order and update its header details.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            <FiEdit3 />
            <span>{successMessage}</span>
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
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Choose payment order</div>
                  <div className={styles.cardMeta}>Active only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Payment order</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select payment order</option>
                    {paymentOrders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.paymentOrderDescription} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Header fields only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Transaction</label>
                  <select
                    className={inputClass("transactionId")}
                    name="transactionId"
                    value={form.transactionId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">No header transaction</option>
                    {transactions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {transactionLabelById[item.id]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Payment order date</label>
                  <input
                    className={inputClass("paymentOrderDate")}
                    type="datetime-local"
                    name="paymentOrderDate"
                    value={form.paymentOrderDate}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Number of transactions</label>
                  <input
                    className={inputClass("numberOfTransactions")}
                    type="number"
                    name="numberOfTransactions"
                    value={form.numberOfTransactions}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Payment order description</label>
                  <input
                    className={inputClass("paymentOrderDescription")}
                    name="paymentOrderDescription"
                    value={form.paymentOrderDescription}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Message</label>
                  <input
                    className={inputClass("message")}
                    name="message"
                    value={form.message}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Pin code</label>
                  <input
                    className={inputClass("pinCode")}
                    name="pinCode"
                    value={form.pinCode}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                {selectedPaymentOrder?.amount !== undefined && (
                  <div className={styles.mutedHint}>
                    Current computed amount: {selectedPaymentOrder.amount}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || saving}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={resetForm}
                className={styles.secondaryButton}
                disabled={saving}
              >
                <FiRefreshCw /> Reset form
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className={styles.saveButton}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Update payment order"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdatePaymentOrder;
