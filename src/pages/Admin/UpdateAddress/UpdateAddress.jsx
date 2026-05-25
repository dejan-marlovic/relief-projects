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
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select an address.";
  if (!values.street?.trim()) errors.street = "Street is required.";
  if (!values.city?.trim()) errors.city = "City is required.";

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

const UpdateAddress = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedAddress = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return addresses.find((item) => item.id === id) || null;
  }, [form.selectedId, addresses]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/addresses/active`, {
        headers: { "Content-Type": "application/json" },
      });

      const data = await safeReadJson(res);
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load addresses error:", err);
      setAddresses([]);
      setFormError(err?.message || "Unexpected error while loading addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
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

    const selected = addresses.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      street: selected?.street || "",
      city: selected?.city || "",
      state: selected?.state || "",
      postalCode: selected?.postalCode || "",
      country: selected?.country || "",
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
    if (!selectedAddress) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedAddress.id),
      street: selectedAddress.street || "",
      city: selectedAddress.city || "",
      state: selectedAddress.state || "",
      postalCode: selectedAddress.postalCode || "",
      country: selectedAddress.country || "",
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
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/addresses/${Number(form.selectedId)}`,
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
            "There was a problem updating the address.",
        );
        return;
      }

      setAddresses((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                street: data?.street ?? payload.street,
                city: data?.city ?? payload.city,
                state: data?.state ?? payload.state,
                postalCode: data?.postalCode ?? payload.postalCode,
                country: data?.country ?? payload.country,
              }
            : item,
        ),
      );

      setSuccessMessage("Address updated successfully.");
    } catch (err) {
      console.error("Update address error:", err);
      setFormError(err?.message || "Unexpected error while updating address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Address</h3>
            <p className={styles.pageSubtitle}>
              Select an active address and update its details.
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
                  <div className={styles.cardTitle}>Choose address</div>
                  <div className={styles.cardMeta}>Active addresses only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Address</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
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
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Street, city and more</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Street</label>
                  <input
                    className={inputClass("street")}
                    name="street"
                    value={form.street}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    className={inputClass("city")}
                    name="city"
                    value={form.city}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State</label>
                  <input
                    className={inputClass("state")}
                    name="state"
                    value={form.state}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Postal code</label>
                  <input
                    className={inputClass("postalCode")}
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Country</label>
                  <input
                    className={inputClass("country")}
                    name="country"
                    value={form.country}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadAddresses}
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
                <FiSave /> {saving ? "Saving..." : "Update address"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateAddress;
