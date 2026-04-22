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
  transactionStatusName: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.selectedId)
    errors.selectedId = "Please select a transaction status.";
  if (!values.transactionStatusName?.trim()) {
    errors.transactionStatusName = "Transaction status name is required.";
  }
  return errors;
};

const UpdateTransactionStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedItem = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return items.find((item) => item.id === id) || null;
  }, [form.selectedId, items]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadItems = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(
        `${BASE_URL}/api/transaction-statuses/active`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await safeReadJson(res);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load transaction statuses error:", err);
      setItems([]);
      setFormError(
        err?.message || "Unexpected error while loading transaction statuses.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
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

    const selected = items.find((item) => item.id === Number(selectedId));
    setForm({
      selectedId,
      transactionStatusName: selected?.transactionStatusName || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedItem) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedItem.id),
      transactionStatusName: selectedItem.transactionStatusName || "",
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
        transactionStatusName: form.transactionStatusName.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/transaction-statuses/${Number(form.selectedId)}`,
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
            "There was a problem updating the transaction status.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                transactionStatusName:
                  data?.transactionStatusName ||
                  form.transactionStatusName.trim(),
              }
            : item,
        ),
      );

      setSuccessMessage(
        `Transaction status "${data?.transactionStatusName || form.transactionStatusName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update transaction status error:", err);
      setFormError(
        err?.message || "Unexpected error while updating transaction status.",
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
            <h3 className={styles.pageTitle}>Update Transaction Status</h3>
            <p className={styles.pageSubtitle}>
              Select an active transaction status and update its name.
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
                  <div className={styles.cardTitle}>
                    Choose transaction status
                  </div>
                  <div className={styles.cardMeta}>Active statuses only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Transaction status</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select transaction status</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.transactionStatusName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Transaction status name</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Transaction status name</label>
                  <input
                    className={inputClass("transactionStatusName")}
                    name="transactionStatusName"
                    value={form.transactionStatusName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadItems}
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
                <FiSave /> {saving ? "Saving..." : "Update transaction status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateTransactionStatus;
