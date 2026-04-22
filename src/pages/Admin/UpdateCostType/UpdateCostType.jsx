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
  costTypeName: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.selectedId) errors.selectedId = "Please select a cost type.";
  if (!values.costTypeName?.trim())
    errors.costTypeName = "Cost type name is required.";
  return errors;
};

const UpdateCostType = () => {
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

      const res = await authFetch(`${BASE_URL}/api/cost-types/active`, {
        headers: { "Content-Type": "application/json" },
      });

      const data = await safeReadJson(res);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load cost types error:", err);
      setItems([]);
      setFormError(
        err?.message || "Unexpected error while loading cost types.",
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
      costTypeName: selected?.costTypeName || "",
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
      costTypeName: selectedItem.costTypeName || "",
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
        costTypeName: form.costTypeName.trim(),
      };

      const res = await authFetch(
        `${BASE_URL}/api/cost-types/${Number(form.selectedId)}`,
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
            "There was a problem updating the cost type.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                costTypeName: data?.costTypeName || form.costTypeName.trim(),
              }
            : item,
        ),
      );

      setSuccessMessage(
        `Cost type "${data?.costTypeName || form.costTypeName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update cost type error:", err);
      setFormError(
        err?.message || "Unexpected error while updating cost type.",
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
            <h3 className={styles.pageTitle}>Update Cost Type</h3>
            <p className={styles.pageSubtitle}>
              Select an active cost type and update its name.
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
                  <div className={styles.cardTitle}>Choose cost type</div>
                  <div className={styles.cardMeta}>Active cost types only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Cost type</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select cost type</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.costTypeName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Cost type name</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Cost type name</label>
                  <input
                    className={inputClass("costTypeName")}
                    name="costTypeName"
                    value={form.costTypeName}
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
                <FiSave /> {saving ? "Saving..." : "Update cost type"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateCostType;
