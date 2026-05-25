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
  sectorCode: "",
  sectorDescription: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.selectedId) errors.selectedId = "Please select a sector.";
  if (!values.sectorCode?.trim())
    errors.sectorCode = "Sector code is required.";
  if (!values.sectorDescription?.trim()) {
    errors.sectorDescription = "Sector description is required.";
  }
  return errors;
};

const UpdateSector = () => {
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

      const res = await authFetch(`${BASE_URL}/api/sectors/active`, {
        headers: { "Content-Type": "application/json" },
      });

      const data = await safeReadJson(res);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load sectors error:", err);
      setItems([]);
      setFormError(err?.message || "Unexpected error while loading sectors.");
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
      sectorCode: selected?.sectorCode || "",
      sectorDescription: selected?.sectorDescription || "",
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
      sectorCode: selectedItem.sectorCode || "",
      sectorDescription: selectedItem.sectorDescription || "",
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
        sectorCode: form.sectorCode.trim(),
        sectorDescription: form.sectorDescription.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/sectors/${Number(form.selectedId)}`,
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
            "There was a problem updating the sector.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                sectorCode: data?.sectorCode || form.sectorCode.trim(),
                sectorDescription:
                  data?.sectorDescription || form.sectorDescription.trim(),
              }
            : item,
        ),
      );

      setSuccessMessage(
        `Sector "${data?.sectorCode || form.sectorCode}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update sector error:", err);
      setFormError(err?.message || "Unexpected error while updating sector.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Sector</h3>
            <p className={styles.pageSubtitle}>
              Select an active sector and update its code and description.
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
                  <div className={styles.cardTitle}>Choose sector</div>
                  <div className={styles.cardMeta}>Active sectors only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Sector</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select sector</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sectorCode} - {item.sectorDescription} (id:{" "}
                        {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Code and description</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Sector code</label>
                  <input
                    className={inputClass("sectorCode")}
                    name="sectorCode"
                    value={form.sectorCode}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Sector description</label>
                  <input
                    className={inputClass("sectorDescription")}
                    name="sectorDescription"
                    value={form.sectorDescription}
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
                <FiSave /> {saving ? "Saving..." : "Update sector"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateSector;
