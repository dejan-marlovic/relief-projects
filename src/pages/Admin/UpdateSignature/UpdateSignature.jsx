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
  signatureStatusId: "",
  employeeId: "",
  paymentOrderId: "",
  signature: "",
  signatureDate: "",
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select a signature.";
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

const toInputDateTime = (value) => {
  if (!value) return "";
  try {
    return String(value).slice(0, 16);
  } catch {
    return "";
  }
};

const UpdateSignature = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const statusNameById = useMemo(() => {
    return statuses.reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [statuses]);

  const employeeNameById = useMemo(() => {
    return employees.reduce((acc, item) => {
      acc[item.id] = `${item.firstName || ""} ${item.lastName || ""}`.trim();
      return acc;
    }, {});
  }, [employees]);

  const paymentOrderLabelById = useMemo(() => {
    return paymentOrders.reduce((acc, item) => {
      acc[item.id] =
        `PO #${item.id} - ${item.paymentOrderDescription || "No description"}`;
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

      const [signatureRes, statusRes, employeeRes, poRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/signatures/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/signature-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/employees/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/payment-orders/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const signatureData = await safeReadJson(signatureRes);
      const statusData = await safeReadJson(statusRes);
      const employeeData = await safeReadJson(employeeRes);
      const poData = await safeReadJson(poRes);

      setItems(Array.isArray(signatureData) ? signatureData : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      setPaymentOrders(Array.isArray(poData) ? poData : []);
    } catch (err) {
      console.error("Load signatures error:", err);
      setItems([]);
      setStatuses([]);
      setEmployees([]);
      setPaymentOrders([]);
      setFormError(
        err?.message || "Unexpected error while loading signatures.",
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
      signatureStatusId: selected?.signatureStatusId
        ? String(selected.signatureStatusId)
        : "",
      employeeId: selected?.employeeId ? String(selected.employeeId) : "",
      paymentOrderId: selected?.paymentOrderId
        ? String(selected.paymentOrderId)
        : "",
      signature: selected?.signature || "",
      signatureDate: toInputDateTime(selected?.signatureDate),
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
      signatureStatusId: selectedItem.signatureStatusId
        ? String(selectedItem.signatureStatusId)
        : "",
      employeeId: selectedItem.employeeId
        ? String(selectedItem.employeeId)
        : "",
      paymentOrderId: selectedItem.paymentOrderId
        ? String(selectedItem.paymentOrderId)
        : "",
      signature: selectedItem.signature || "",
      signatureDate: toInputDateTime(selectedItem.signatureDate),
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
        signatureStatusId: Number(form.signatureStatusId),
        employeeId: Number(form.employeeId),
        paymentOrderId: Number(form.paymentOrderId),
        signature: form.signature.trim(),
        signatureDate: form.signatureDate,
      };

      const res = await authFetch(
        `${BASE_URL}/api/signatures/${Number(form.selectedId)}`,
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
            "There was a problem updating the signature.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                signatureStatusId:
                  data?.signatureStatusId ?? Number(form.signatureStatusId),
                employeeId: data?.employeeId ?? Number(form.employeeId),
                paymentOrderId:
                  data?.paymentOrderId ?? Number(form.paymentOrderId),
                signature: data?.signature ?? form.signature.trim(),
                signatureDate: data?.signatureDate ?? form.signatureDate,
              }
            : item,
        ),
      );

      setSuccessMessage("Signature updated successfully.");
    } catch (err) {
      console.error("Update signature error:", err);
      setFormError(
        err?.message || "Unexpected error while updating signature.",
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
            <h3 className={styles.pageTitle}>Update Signature</h3>
            <p className={styles.pageSubtitle}>
              Select an active signature and update its details.
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
                  <div className={styles.cardTitle}>Choose signature</div>
                  <div className={styles.cardMeta}>
                    Readable status, employee and PO labels
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Signature</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select signature</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {statusNameById[item.signatureStatusId] ||
                          `Status #${item.signatureStatusId}`}{" "}
                        -{" "}
                        {employeeNameById[item.employeeId] ||
                          `Employee #${item.employeeId}`}{" "}
                        -{" "}
                        {paymentOrderLabelById[item.paymentOrderId] ||
                          `PO #${item.paymentOrderId}`}{" "}
                        - {item.signature} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>
                    Status, employee, PO, text and date
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Signature status</label>
                  <select
                    className={inputClass("signatureStatusId")}
                    name="signatureStatusId"
                    value={form.signatureStatusId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select signature status</option>
                    {statuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (id: {item.id})
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
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select employee</option>
                    {employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.firstName || ""} {item.lastName || ""} (id:{" "}
                        {item.id})
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
                    {paymentOrders.map((item) => (
                      <option key={item.id} value={item.id}>
                        PO #{item.id} -{" "}
                        {item.paymentOrderDescription || "No description"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Signature text</label>
                  <input
                    className={inputClass("signature")}
                    name="signature"
                    value={form.signature}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Signature date</label>
                  <input
                    className={inputClass("signatureDate")}
                    type="datetime-local"
                    name="signatureDate"
                    value={form.signatureDate}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
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
                <FiSave /> {saving ? "Saving..." : "Update signature"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateSignature;
