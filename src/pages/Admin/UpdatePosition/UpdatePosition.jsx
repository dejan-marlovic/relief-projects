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
  positionName: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.selectedId) errors.selectedId = "Please select a position.";
  if (!values.positionName?.trim())
    errors.positionName = "Position name is required.";
  return errors;
};

const UpdatePosition = () => {
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

      const res = await authFetch(`${BASE_URL}/api/positions/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setItems([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active positions.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);

      if (
        form.selectedId &&
        !nextItems.some((item) => item.id === Number(form.selectedId))
      ) {
        setForm(initialForm);
      }
    } catch (err) {
      console.error("Load positions error:", err);
      setItems([]);
      setFormError(err?.message || "Unexpected error while loading positions.");
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
      positionName: selected?.positionName || "",
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
      positionName: selectedItem.positionName || "",
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
        positionName: form.positionName.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/positions/${Number(form.selectedId)}`,
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
            "There was a problem updating the position.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                positionName: data?.positionName || form.positionName.trim(),
              }
            : item,
        ),
      );

      setSuccessMessage(
        `Position "${data?.positionName || form.positionName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update position error:", err);
      setFormError(err?.message || "Unexpected error while updating position.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Position</h3>
            <p className={styles.pageSubtitle}>
              Select an active position and update its name.
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
                  <div className={styles.cardTitle}>Choose position</div>
                  <div className={styles.cardMeta}>Active positions only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Position</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select position</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.positionName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Position name</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Position name</label>
                  <input
                    className={inputClass("positionName")}
                    name="positionName"
                    value={form.positionName}
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
                <FiSave /> {saving ? "Saving..." : "Update position"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdatePosition;
