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
  organizationName: "",
  contactEmail: "",
  contactPhone: "",
  addressId: "",
  organizationStatusId: "",
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select an organization.";

  const orgName = values.organizationName?.trim() || "";
  if (!orgName) errors.organizationName = "Organization name is required.";

  const email = values.contactEmail?.trim() || "";
  if (!email) errors.contactEmail = "Contact email is required.";
  else {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) errors.contactEmail = "Contact email must be valid.";
  }

  const phone = values.contactPhone?.trim() || "";
  if (!phone) errors.contactPhone = "Contact phone is required.";

  if (!values.addressId) errors.addressId = "Address is required.";
  if (!values.organizationStatusId) {
    errors.organizationStatusId = "Organization status is required.";
  }

  return errors;
};

const buildAddressLabel = (address) => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
};

const UpdateOrganization = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [organizations, setOrganizations] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [organizationStatuses, setOrganizationStatuses] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedOrganization = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return organizations.find((item) => item.id === id) || null;
  }, [form.selectedId, organizations]);

  const addressLabelById = useMemo(() => {
    return addresses.reduce((acc, address) => {
      acc[address.id] = buildAddressLabel(address);
      return acc;
    }, {});
  }, [addresses]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [orgRes, addressRes, statusRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/organizations/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/addresses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organization-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const orgData = await safeReadJson(orgRes);
      const addressData = await safeReadJson(addressRes);
      const statusData = await safeReadJson(statusRes);

      setOrganizations(Array.isArray(orgData) ? orgData : []);
      setAddresses(Array.isArray(addressData) ? addressData : []);
      setOrganizationStatuses(Array.isArray(statusData) ? statusData : []);
    } catch (err) {
      console.error("Load organizations error:", err);
      setOrganizations([]);
      setAddresses([]);
      setOrganizationStatuses([]);
      setFormError(
        err?.message || "Unexpected error while loading organization data.",
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

    const selected = organizations.find(
      (item) => item.id === Number(selectedId),
    );

    setForm({
      selectedId,
      organizationName: selected?.organizationName || "",
      contactEmail: selected?.contactEmail || "",
      contactPhone: selected?.contactPhone || "",
      addressId: selected?.addressId ? String(selected.addressId) : "",
      organizationStatusId: selected?.organizationStatusId
        ? String(selected.organizationStatusId)
        : "",
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
    if (!selectedOrganization) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedOrganization.id),
      organizationName: selectedOrganization.organizationName || "",
      contactEmail: selectedOrganization.contactEmail || "",
      contactPhone: selectedOrganization.contactPhone || "",
      addressId: selectedOrganization.addressId
        ? String(selectedOrganization.addressId)
        : "",
      organizationStatusId: selectedOrganization.organizationStatusId
        ? String(selectedOrganization.organizationStatusId)
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
        organizationName: form.organizationName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        addressId: Number(form.addressId),
        organizationStatusId: Number(form.organizationStatusId),
      };

      const res = await authFetch(
        `${BASE_URL}/api/organizations/${Number(form.selectedId)}`,
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
            "There was a problem updating the organization.",
        );
        return;
      }

      setOrganizations((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                organizationName:
                  data?.organizationName ?? payload.organizationName,
                contactEmail: data?.contactEmail ?? payload.contactEmail,
                contactPhone: data?.contactPhone ?? payload.contactPhone,
                addressId: data?.addressId ?? payload.addressId,
                organizationStatusId:
                  data?.organizationStatusId ?? payload.organizationStatusId,
              }
            : item,
        ),
      );

      setSuccessMessage(
        `Organization "${data?.organizationName || payload.organizationName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update organization error:", err);
      setFormError(
        err?.message || "Unexpected error while updating organization.",
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
            <h3 className={styles.pageTitle}>Update Organization</h3>
            <p className={styles.pageSubtitle}>
              Select an active organization and update its details.
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
                  <div className={styles.cardTitle}>Choose organization</div>
                  <div className={styles.cardMeta}>
                    Active organizations only
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.organizationName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOrganization && (
                  <div className={styles.mutedHint}>
                    Current address:{" "}
                    {addressLabelById[selectedOrganization.addressId] ||
                      `Address #${selectedOrganization.addressId || "N/A"}`}
                  </div>
                )}
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>
                    Name, contact and relations
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization name</label>
                  <input
                    className={inputClass("organizationName")}
                    name="organizationName"
                    value={form.organizationName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Contact email</label>
                  <input
                    className={inputClass("contactEmail")}
                    type="email"
                    name="contactEmail"
                    value={form.contactEmail}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Contact phone</label>
                  <input
                    className={inputClass("contactPhone")}
                    name="contactPhone"
                    value={form.contactPhone}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Address</label>
                  <select
                    className={inputClass("addressId")}
                    name="addressId"
                    value={form.addressId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select address</option>
                    {addresses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {buildAddressLabel(item) || `Address #${item.id}`} (id:{" "}
                        {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization status</label>
                  <select
                    className={inputClass("organizationStatusId")}
                    name="organizationStatusId"
                    value={form.organizationStatusId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select organization status</option>
                    {organizationStatuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.organizationStatusName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Note: your backend DTO requires organizationStatusId, even
                  though the organization service mainly updates address
                  directly.
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
                <FiSave /> {saving ? "Saving..." : "Update organization"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateOrganization;
