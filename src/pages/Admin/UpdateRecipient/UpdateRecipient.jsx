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
  organizationId: "",
  paymentOrderId: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.selectedId) errors.selectedId = "Please select a recipient.";
  if (!values.organizationId)
    errors.organizationId = "Organization is required.";
  if (!values.paymentOrderId)
    errors.paymentOrderId = "Payment order is required.";
  return errors;
};

const UpdateRecipient = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [items, setItems] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const orgNameById = useMemo(() => {
    return organizations.reduce((acc, org) => {
      acc[org.id] = org.organizationName;
      return acc;
    }, {});
  }, [organizations]);

  const paymentOrderLabelById = useMemo(() => {
    return paymentOrders.reduce((acc, po) => {
      acc[po.id] =
        `PO #${po.id} - ${po.paymentOrderDescription || "No description"}`;
      return acc;
    }, {});
  }, [paymentOrders]);

  const selectedItem = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return items.find((item) => item.id === id) || null;
  }, [form.selectedId, items]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [recipientRes, orgRes, poRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/recipients/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organizations/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/payment-orders/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const recipientData = await safeReadJson(recipientRes);
      const orgData = await safeReadJson(orgRes);
      const poData = await safeReadJson(poRes);

      setItems(Array.isArray(recipientData) ? recipientData : []);
      setOrganizations(Array.isArray(orgData) ? orgData : []);
      setPaymentOrders(Array.isArray(poData) ? poData : []);
    } catch (err) {
      console.error("Load recipients error:", err);
      setItems([]);
      setOrganizations([]);
      setPaymentOrders([]);
      setFormError(
        err?.message || "Unexpected error while loading recipients.",
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

    const selected = items.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      organizationId: selected?.organizationId
        ? String(selected.organizationId)
        : "",
      paymentOrderId: selected?.paymentOrderId
        ? String(selected.paymentOrderId)
        : "",
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
      organizationId: selectedItem.organizationId
        ? String(selectedItem.organizationId)
        : "",
      paymentOrderId: selectedItem.paymentOrderId
        ? String(selectedItem.paymentOrderId)
        : "",
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
        organizationId: Number(form.organizationId),
        paymentOrderId: Number(form.paymentOrderId),
      };

      const res = await authFetch(
        `${BASE_URL}/api/recipients/${Number(form.selectedId)}`,
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
            "There was a problem updating the recipient.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                organizationId:
                  data?.organizationId ?? Number(form.organizationId),
                paymentOrderId:
                  data?.paymentOrderId ?? Number(form.paymentOrderId),
                amount: data?.amount ?? item.amount,
              }
            : item,
        ),
      );

      setSuccessMessage("Recipient updated successfully.");
    } catch (err) {
      console.error("Update recipient error:", err);
      setFormError(
        err?.message || "Unexpected error while updating recipient.",
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
            <h3 className={styles.pageTitle}>Update Recipient</h3>
            <p className={styles.pageSubtitle}>
              Select an active recipient and update its organization and payment
              order.
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
                  <div className={styles.cardTitle}>Choose recipient</div>
                  <div className={styles.cardMeta}>
                    Readable organization and PO labels
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Recipient</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select recipient</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {orgNameById[item.organizationId] ||
                          `Organization #${item.organizationId}`}{" "}
                        -{" "}
                        {paymentOrderLabelById[item.paymentOrderId] ||
                          `PO #${item.paymentOrderId}`}{" "}
                        - amount: {item.amount ?? 0} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>
                    Organization and payment order
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization</label>
                  <select
                    className={inputClass("organizationId")}
                    name="organizationId"
                    value={form.organizationId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.organizationName} (id: {org.id})
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
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select payment order</option>
                    {paymentOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        PO #{po.id} -{" "}
                        {po.paymentOrderDescription || "No description"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Amount is computed by the backend from payment order lines for
                  the selected payment order and organization.
                </div>
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
                <FiSave /> {saving ? "Saving..." : "Update recipient"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateRecipient;
