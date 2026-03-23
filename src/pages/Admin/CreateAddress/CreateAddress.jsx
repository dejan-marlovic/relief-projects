// src/components/Admin/CreateAddress/CreateAddress.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateAddress.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Intial form state
const initialAddressDetails = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

// UX validation aligned with your DTO + entity constraints:
// DTO:
// - street: @NotNull @NotBlank
// - city: @NotNull @NotBlank
// Entity lengths:
// - street: 255
// - city: 100
// - state: 50
// - postalCode: 20
// - country: 50
const validateAddressDetails = (values) => {
  const errors = {};

  const street = values.street?.trim() || "";
  const city = values.city?.trim() || "";
  const state = values.state?.trim() || "";
  const postalCode = values.postalCode?.trim() || "";
  const country = values.country?.trim() || "";

  if (!street) errors.street = "Street is required (e.g. Main Street 12).";
  else if (street.length > 255)
    errors.street = "Street must be max 255 characters.";

  if (!city) errors.city = "City is required (e.g. Stockholm).";
  else if (city.length > 100) errors.city = "City must be max 100 characters.";

  if (state && state.length > 50)
    errors.state = "State must be max 50 characters.";
  if (postalCode && postalCode.length > 20)
    errors.postalCode = "Postal code must be max 20 characters.";
  if (country && country.length > 50)
    errors.country = "Country must be max 50 characters.";

  return errors;
};

const CreateAddress = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [addressDetails, setAddressDetails] = useState(initialAddressDetails);

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setAddressDetails(initialAddressDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setAddressDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    street: values.street?.trim() ?? "",
    city: values.city?.trim() ?? "",
    state: values.state?.trim() || null,
    postalCode: values.postalCode?.trim() || null,
    country: values.country?.trim() || null,
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateAddressDetails(addressDetails);
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

      const payload = buildPayload(addressDetails);

      const res = await authFetch(`${BASE_URL}/api/addresses`, {
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
            "There was a problem creating the address.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.addressId ?? created?.address_id;

      alert(
        `Address created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );

      resetForm();
    } catch (err) {
      console.error("Create address error:", err);
      setFormError(err?.message || "Unexpected error while creating address.");
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Address</h3>
            <p className={styles.pageSubtitle}>
              Add an address used by <strong>Organizations</strong> and{" "}
              <strong>Projects</strong>.
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

        {loading ? (
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
                  <div className={styles.cardTitle}>Address details</div>
                  <div className={styles.cardMeta}>Street + city required</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Street</label>
                  <input
                    className={inputClass("street")}
                    name="street"
                    placeholder="e.g. Main Street 12"
                    value={addressDetails.street}
                    onChange={handleInputChange}
                    autoComplete="street-address"
                  />
                  {fieldErrors.street && (
                    <div className={styles.fieldError}>
                      {fieldErrors.street}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    className={inputClass("city")}
                    name="city"
                    placeholder="e.g. Stockholm"
                    value={addressDetails.city}
                    onChange={handleInputChange}
                    autoComplete="address-level2"
                  />
                  {fieldErrors.city && (
                    <div className={styles.fieldError}>{fieldErrors.city}</div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>State / Region (optional)</label>
                  <input
                    className={inputClass("state")}
                    name="state"
                    placeholder="e.g. Stockholm County"
                    value={addressDetails.state}
                    onChange={handleInputChange}
                    autoComplete="address-level1"
                  />
                  {fieldErrors.state && (
                    <div className={styles.fieldError}>{fieldErrors.state}</div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Postal code (optional)</label>
                  <input
                    className={inputClass("postalCode")}
                    name="postalCode"
                    placeholder="e.g. 123 45"
                    value={addressDetails.postalCode}
                    onChange={handleInputChange}
                    autoComplete="postal-code"
                  />
                  {fieldErrors.postalCode && (
                    <div className={styles.fieldError}>
                      {fieldErrors.postalCode}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Country (optional)</label>
                  <input
                    className={inputClass("country")}
                    name="country"
                    placeholder="e.g. Sweden"
                    value={addressDetails.country}
                    onChange={handleInputChange}
                    autoComplete="country-name"
                  />
                  {fieldErrors.country && (
                    <div className={styles.fieldError}>
                      {fieldErrors.country}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Tip: keep formatting consistent so addresses are easy to
                  search and group.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>How this is used</div>
                  <div className={styles.cardMeta}>
                    Organizations + projects
                  </div>
                </div>

                <div className={styles.mutedHint}>
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Addresses can be linked to <strong>Organizations</strong>{" "}
                      and <strong>Projects</strong>.
                    </li>
                    <li>
                      Street + city are required; other fields are optional.
                    </li>
                  </ul>
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
                <FiSave /> Create address
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

export default CreateAddress;
