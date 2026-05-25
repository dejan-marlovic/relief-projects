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
  firstName: "",
  lastName: "",
  positionId: "",
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select an employee.";
  if (!values.firstName?.trim()) errors.firstName = "First name is required.";
  if (!values.lastName?.trim()) errors.lastName = "Last name is required.";
  if (!values.positionId) errors.positionId = "Position is required.";

  return errors;
};

const UpdateEmployee = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedEmployee = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return employees.find((item) => item.id === id) || null;
  }, [form.selectedId, employees]);

  const positionNameById = useMemo(() => {
    return positions.reduce((acc, item) => {
      acc[item.id] = item.positionName || `Position #${item.id}`;
      return acc;
    }, {});
  }, [positions]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [employeeRes, positionRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/employees/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/positions/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const employeeData = await safeReadJson(employeeRes);
      const positionData = await safeReadJson(positionRes);

      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      setPositions(Array.isArray(positionData) ? positionData : []);
    } catch (err) {
      console.error("Load employees error:", err);
      setEmployees([]);
      setPositions([]);
      setFormError(
        err?.message || "Unexpected error while loading employee data.",
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

    const selected = employees.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      firstName: selected?.firstName || "",
      lastName: selected?.lastName || "",
      positionId: selected?.positionId ? String(selected.positionId) : "",
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
    if (!selectedEmployee) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedEmployee.id),
      firstName: selectedEmployee.firstName || "",
      lastName: selectedEmployee.lastName || "",
      positionId: selectedEmployee.positionId
        ? String(selectedEmployee.positionId)
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
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        positionId: Number(form.positionId),
      };

      const res = await authFetch(
        `${BASE_URL}/api/employees/${Number(form.selectedId)}`,
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
            "There was a problem updating the employee.",
        );
        return;
      }

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? { ...item, ...payload, id: item.id }
            : item,
        ),
      );

      setSuccessMessage(
        `Employee "${data?.firstName || payload.firstName} ${data?.lastName || payload.lastName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update employee error:", err);
      setFormError(err?.message || "Unexpected error while updating employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Employee</h3>
            <p className={styles.pageSubtitle}>
              Select an active employee and update its details.
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
                  <div className={styles.cardTitle}>Choose employee</div>
                  <div className={styles.cardMeta}>Active employees only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Employee</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select employee</option>
                    {employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.firstName} {item.lastName} -{" "}
                        {positionNameById[item.positionId] ||
                          `Position #${item.positionId}`}{" "}
                        (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Name and position</div>
                </div>

                <div className={styles.formGroup}>
                  <label>First name</label>
                  <input
                    className={inputClass("firstName")}
                    name="firstName"
                    value={form.firstName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Last name</label>
                  <input
                    className={inputClass("lastName")}
                    name="lastName"
                    value={form.lastName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Position</label>
                  <select
                    className={inputClass("positionId")}
                    name="positionId"
                    value={form.positionId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select position</option>
                    {positions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.positionName} (id: {item.id})
                      </option>
                    ))}
                  </select>
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
                <FiSave /> {saving ? "Saving..." : "Update employee"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateEmployee;
