// src/components/Admin/CreateOrganization/CreateOrganization.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateOrganization.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Initial form state
const initialOrganizationDetails = {
  organizationName: "",
  contactEmail: "",
  contactPhone: "",
  addressId: "",
  organizationStatusId: "",
};

// UX validation aligned with your DTO + entity constraints:
// DTO: all required (NotNull + NotBlank) except none, and both ids required.
// Entity: organization_name length 255, email length 255, phone length 255
const validateOrganizationDetails = (values) => {
  const errors = {};

  const name = values.organizationName?.trim() || "";
  if (!name) errors.organizationName = "Organization name is required.";
  else if (name.length > 255)
    errors.organizationName = "Organization name must be max 255 characters.";

  const email = values.contactEmail?.trim() || "";
  if (!email) errors.contactEmail = "Contact email is required.";
  else if (email.length > 255)
    errors.contactEmail = "Email must be max 255 characters.";
  else {
    // eslint-disable-next-line no-useless-escape
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) errors.contactEmail = "Email must be a valid email address.";
  }

  const phone = values.contactPhone?.trim() || "";
  if (!phone) errors.contactPhone = "Contact phone is required.";
  else if (phone.length > 255)
    errors.contactPhone = "Contact phone must be max 255 characters.";

  if (!values.addressId) errors.addressId = "Address is required.";
  if (!values.organizationStatusId)
    errors.organizationStatusId = "Organization status is required.";

  return errors;
};

const CreateOrganization = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false); // addresses + statuses
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Reference data
  const [addresses, setAddresses] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Form state
  const [organizationDetails, setOrganizationDetails] = useState(
    initialOrganizationDetails,
  );

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setOrganizationDetails(initialOrganizationDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganizationDetails((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    organizationName: values.organizationName?.trim() ?? "",
    contactEmail: values.contactEmail?.trim() ?? "",
    contactPhone: values.contactPhone?.trim() ?? "",
    addressId: values.addressId ? Number(values.addressId) : null,
    organizationStatusId: values.organizationStatusId
      ? Number(values.organizationStatusId)
      : null,
  });

  const addressLabel = (a) => {
    if (!a) return "";
    const street = a.street ? String(a.street).trim() : "";
    const city = a.city ? String(a.city).trim() : "";
    const country = a.country ? String(a.country).trim() : "";
    const postal = a.postalCode ? String(a.postalCode).trim() : "";
    // Keep it compact for dropdowns
    return `${street}${street && city ? ", " : ""}${city}${
      postal ? ` (${postal})` : ""
    }${country ? ` — ${country}` : ""}`;
  };

  const statusLabel = (s) => s?.organizationStatusName ?? "";

  // Load reference data: Addresses + Organization Statuses
  const loadReferenceData = async () => {
    try {
      setLoadingRefs(true);
      setFormError("");

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const [addrRes, statusRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/addresses/active`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organization-statuses/active`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      // Addresses: controller returns 204 when empty
      let addrList = [];
      if (addrRes.status !== 204) {
        const addrData = await safeReadJson(addrRes);
        addrList = Array.isArray(addrData) ? addrData : [];
      }

      // Org statuses: controller returns 204 when empty
      let statusList = [];
      if (statusRes.status !== 204) {
        const statusData = await safeReadJson(statusRes);
        statusList = Array.isArray(statusData) ? statusData : [];
      }

      // Sort for nicer UX
      addrList.sort((a, b) => addressLabel(a).localeCompare(addressLabel(b)));
      statusList.sort((a, b) =>
        String(statusLabel(a)).localeCompare(String(statusLabel(b))),
      );

      setAddresses(addrList);
      setStatuses(statusList);

      // Auto-select "Default" status if present and not already selected
      const defaultStatus = statusList.find(
        (s) => String(statusLabel(s)).trim().toLowerCase() === "default",
      );

      if (defaultStatus?.id) {
        setOrganizationDetails((prev) => ({
          ...prev,
          organizationStatusId:
            prev.organizationStatusId || String(defaultStatus.id),
        }));
      }
    } catch (err) {
      console.error("Error loading reference data:", err);
      setAddresses([]);
      setStatuses([]);
      setFormError("Failed to load addresses / organization statuses.");
    } finally {
      setLoadingRefs(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateOrganizationDetails(organizationDetails);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const payload = buildPayload(organizationDetails);

      const res = await authFetch(`${BASE_URL}/api/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeReadJson(res);

        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the organization.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.organizationId ?? created?.organization_id;

      alert(
        `Organization created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );
      resetForm();
      // keep default selection after reset if possible
      const defaultStatus = statuses.find(
        (s) => String(statusLabel(s)).trim().toLowerCase() === "default",
      );
      if (defaultStatus?.id) {
        setOrganizationDetails((prev) => ({
          ...prev,
          organizationStatusId: String(defaultStatus.id),
        }));
      }
    } catch (err) {
      console.error("Create organization error:", err);
      setFormError(
        err?.message || "Unexpected error while creating organization.",
      );
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  const disableCreate =
    loading || loadingRefs || addresses.length === 0 || statuses.length === 0;

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Organization</h3>
            <p className={styles.pageSubtitle}>
              Add an organization and classify it (e.g. Donor, Partner,
              Financier) + link an address.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {hasAnyFieldErrors && (
          <div className={styles.errorList}>
            <ul>
              {Object.entries(fieldErrors).map(([field, message]) => (
                <li key={field}>
                  <strong>{field}</strong>: {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loadingRefs ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {/* Card 1 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Organization details</div>
                  <div className={styles.cardMeta}>Required fields</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization name</label>
                  <input
                    className={inputClass("organizationName")}
                    name="organizationName"
                    placeholder="e.g. UNICEF, Red Cross, Ministry of Health..."
                    value={organizationDetails.organizationName}
                    onChange={handleInputChange}
                    autoComplete="off"
                    disabled={loading}
                  />
                  {fieldErrors.organizationName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.organizationName}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Contact email</label>
                  <input
                    className={inputClass("contactEmail")}
                    type="email"
                    name="contactEmail"
                    placeholder="e.g. contact@org.org"
                    value={organizationDetails.contactEmail}
                    onChange={handleInputChange}
                    autoComplete="off"
                    disabled={loading}
                  />
                  {fieldErrors.contactEmail && (
                    <div className={styles.fieldError}>
                      {fieldErrors.contactEmail}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Contact phone</label>
                  <input
                    className={inputClass("contactPhone")}
                    name="contactPhone"
                    placeholder="e.g. +46 70 123 45 67"
                    value={organizationDetails.contactPhone}
                    onChange={handleInputChange}
                    autoComplete="off"
                    disabled={loading}
                  />
                  {fieldErrors.contactPhone && (
                    <div className={styles.fieldError}>
                      {fieldErrors.contactPhone}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Tip: Keep contact details generic (main inbox / switchboard)
                  unless you model contacts separately.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Classification</div>
                  <div className={styles.cardMeta}>Address + Status</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization status</label>
                  <select
                    className={inputClass("organizationStatusId")}
                    name="organizationStatusId"
                    value={organizationDetails.organizationStatusId}
                    onChange={handleInputChange}
                    disabled={loading || statuses.length === 0}
                  >
                    <option value="">Select status...</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.organizationStatusId && (
                    <div className={styles.fieldError}>
                      {fieldErrors.organizationStatusId}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Address</label>
                  <select
                    className={inputClass("addressId")}
                    name="addressId"
                    value={organizationDetails.addressId}
                    onChange={handleInputChange}
                    disabled={loading || addresses.length === 0}
                  >
                    <option value="">Select address...</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {addressLabel(a)} (id: {a.id})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.addressId && (
                    <div className={styles.fieldError}>
                      {fieldErrors.addressId}
                    </div>
                  )}
                </div>

                {statuses.length === 0 && (
                  <div className={styles.mutedHint}>
                    No organization statuses found. Create them first (Admin →
                    Organization Status).
                  </div>
                )}

                {addresses.length === 0 && (
                  <div className={styles.mutedHint}>
                    No addresses found. Create them first (Admin → Address).
                  </div>
                )}

                <div className={styles.mutedHint}>
                  These values are used across your system for grouping,
                  filtering and reporting (e.g. list all Donors).
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={handleCreate}
                className={styles.saveButton}
                disabled={disableCreate}
                title={
                  statuses.length === 0
                    ? "Create organization statuses first."
                    : addresses.length === 0
                      ? "Create addresses first."
                      : ""
                }
              >
                <FiSave /> {loading ? "Creating..." : "Create organization"}
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
          </>
        )}
      </div>
    </div>
  );
};

export default CreateOrganization;
