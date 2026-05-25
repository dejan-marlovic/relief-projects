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
  bankName: "",
  accountNumber: "",
  branchName: "",
  swiftCode: "",
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select bank details.";
  if (!values.organizationId)
    errors.organizationId = "Organization is required.";
  if (!values.bankName?.trim()) errors.bankName = "Bank name is required.";
  if (!values.accountNumber?.trim()) {
    errors.accountNumber = "Account number is required.";
  }

  return errors;
};

const UpdateBankDetail = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [bankDetails, setBankDetails] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedBankDetail = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return bankDetails.find((item) => item.bankId === id) || null;
  }, [form.selectedId, bankDetails]);

  const organizationLabelById = useMemo(() => {
    return organizations.reduce((acc, item) => {
      acc[item.id] = item.organizationName || `Organization #${item.id}`;
      return acc;
    }, {});
  }, [organizations]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [bankRes, orgRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/bank-details/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organizations/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const bankData = await safeReadJson(bankRes);
      const orgData = await safeReadJson(orgRes);

      setBankDetails(Array.isArray(bankData) ? bankData : []);
      setOrganizations(Array.isArray(orgData) ? orgData : []);
    } catch (err) {
      console.error("Load bank details error:", err);
      setBankDetails([]);
      setOrganizations([]);
      setFormError(
        err?.message || "Unexpected error while loading bank details.",
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

    const selected = bankDetails.find(
      (item) => item.bankId === Number(selectedId),
    );

    setForm({
      selectedId,
      organizationId: selected?.organizationId
        ? String(selected.organizationId)
        : "",
      bankName: selected?.bankName || "",
      accountNumber: selected?.accountNumber || "",
      branchName: selected?.branchName || "",
      swiftCode: selected?.swiftCode || "",
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
    if (!selectedBankDetail) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedBankDetail.bankId),
      organizationId: selectedBankDetail.organizationId
        ? String(selectedBankDetail.organizationId)
        : "",
      bankName: selectedBankDetail.bankName || "",
      accountNumber: selectedBankDetail.accountNumber || "",
      branchName: selectedBankDetail.branchName || "",
      swiftCode: selectedBankDetail.swiftCode || "",
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
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        branchName: form.branchName.trim(),
        swiftCode: form.swiftCode.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/bank-details/${Number(form.selectedId)}`,
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
            "There was a problem updating bank details.",
        );
        return;
      }

      setBankDetails((prev) =>
        prev.map((item) =>
          item.bankId === Number(form.selectedId)
            ? { ...item, ...payload, bankId: item.bankId }
            : item,
        ),
      );

      setSuccessMessage(
        `Bank detail "${data?.bankName || payload.bankName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update bank detail error:", err);
      setFormError(
        err?.message || "Unexpected error while updating bank detail.",
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
            <h3 className={styles.pageTitle}>Update Bank Detail</h3>
            <p className={styles.pageSubtitle}>
              Select active bank details and update them.
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
                  <div className={styles.cardTitle}>Choose bank detail</div>
                  <div className={styles.cardMeta}>Active only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Bank detail</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select bank detail</option>
                    {bankDetails.map((item) => (
                      <option key={item.bankId} value={item.bankId}>
                        {item.bankName} - {item.accountNumber} -{" "}
                        {organizationLabelById[item.organizationId] ||
                          `Organization #${item.organizationId}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>
                    Bank and organization info
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
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {organizationLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Bank name</label>
                  <input
                    className={inputClass("bankName")}
                    name="bankName"
                    value={form.bankName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Account number</label>
                  <input
                    className={inputClass("accountNumber")}
                    name="accountNumber"
                    value={form.accountNumber}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Branch name</label>
                  <input
                    className={inputClass("branchName")}
                    name="branchName"
                    value={form.branchName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>SWIFT code</label>
                  <input
                    className={inputClass("swiftCode")}
                    name="swiftCode"
                    value={form.swiftCode}
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
                <FiSave /> {saving ? "Saving..." : "Update bank detail"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateBankDetail;
