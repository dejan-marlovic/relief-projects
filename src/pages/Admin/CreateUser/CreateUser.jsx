// src/components/Admin/CreateUser/CreateUser.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";

const initialUserDetails = {
  employeeId: "",
  username: "",
  passwordHash: "",
  email: "",
};

const validateUserDetails = (values) => {
  const errors = {};

  if (!values.employeeId) errors.employeeId = "Employee is required.";

  const username = values.username?.trim() || "";
  if (!username) errors.username = "Username is required.";
  else if (username.length < 3 || username.length > 50) {
    errors.username = "Username must be between 3 and 50 characters.";
  }

  const pw = values.passwordHash ?? "";
  if (!pw.trim()) errors.passwordHash = "Password is required.";
  else if (pw.trim().length < 3 || pw.trim().length > 255) {
    errors.passwordHash = "Password must be between 3 and 255 characters.";
  }

  const email = values.email?.trim() || "";
  if (!email) errors.email = "Email is required.";
  else {
    // eslint-disable-next-line no-useless-escape
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) errors.email = "Email must be a valid email address.";
  }

  return errors;
};

const CreateUser = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [userDetails, setUserDetails] = useState(initialUserDetails);
  const [employees, setEmployees] = useState([]);

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("authToken");
    const hasToken = token && token !== "null" && token !== "undefined";

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(hasToken ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("authToken");
      navigate("/login", { replace: true });
      throw new Error("Unauthorized - redirecting to login");
    }

    return res;
  };

  const safeParseJson = (text) => {
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const safeReadJson = async (res) => {
    if (!res) return null;
    if (res.status === 204) return null;
    const text = await res.text().catch(() => "");
    return safeParseJson(text);
  };

  const extractFieldErrors = (data) => {
    if (!data) return null;

    if (
      data.fieldErrors &&
      !Array.isArray(data.fieldErrors) &&
      typeof data.fieldErrors === "object"
    ) {
      return data.fieldErrors;
    }

    if (Array.isArray(data.errors)) {
      const fe = {};
      data.errors.forEach((e) => {
        const field = e.field || e.name || e.property || e.path;
        const msg = e.defaultMessage || e.message || e.msg;
        if (field && msg) fe[field] = msg;
      });
      return Object.keys(fe).length ? fe : null;
    }

    if (Array.isArray(data.violations)) {
      const fe = {};
      data.violations.forEach((v) => {
        const field = v.field || v.propertyPath || v.path;
        const msg = v.message;
        if (field && msg) fe[field] = msg;
      });
      return Object.keys(fe).length ? fe : null;
    }

    return null;
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setFormError("");

        const token = localStorage.getItem("authToken");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const res = await authFetch(`${BASE_URL}/api/employees/active`, {
          headers: { "Content-Type": "application/json" },
        });

        const data = await safeReadJson(res);
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading employees:", err);
        setEmployees([]);
        setFormError("Failed to load employees.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const resetForm = () => {
    setUserDetails(initialUserDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateUserDetails(userDetails);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const employeeId = Number(userDetails.employeeId);
      const payload = {
        username: userDetails.username.trim(),
        passwordHash: userDetails.passwordHash,
        email: userDetails.email.trim(),
      };

      const res = await authFetch(`${BASE_URL}/api/users/${employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeReadJson(res);
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        // ErrorDTO -> { message }
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the user.",
        );
        return;
      }

      const created = await safeReadJson(res);
      alert(
        `User created successfully${created?.id ? ` (id: ${created.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create user error:", err);
      setFormError(err?.message || "Unexpected error while creating user.");
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
            <h3 className={styles.pageTitle}>Create User</h3>
            <p className={styles.pageSubtitle}>
              Create a login user and link it to an employee.
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
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Link employee</div>
                  <div className={styles.cardMeta}>
                    User must belong to an employee
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Employee</label>
                  <select
                    className={inputClass("employeeId")}
                    name="employeeId"
                    value={userDetails.employeeId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName || ""} {e.lastName || ""} (id: {e.id})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.employeeId && (
                    <div className={styles.fieldError}>
                      {fieldErrors.employeeId}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Credentials</div>
                  <div className={styles.cardMeta}>
                    Username, email & password
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input
                    className={inputClass("username")}
                    name="username"
                    placeholder="e.g. dejan.m"
                    value={userDetails.username}
                    onChange={handleInputChange}
                    autoComplete="username"
                  />
                  {fieldErrors.username && (
                    <div className={styles.fieldError}>
                      {fieldErrors.username}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    className={inputClass("email")}
                    type="email"
                    name="email"
                    placeholder="e.g. dejan@example.com"
                    value={userDetails.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                  />
                  {fieldErrors.email && (
                    <div className={styles.fieldError}>{fieldErrors.email}</div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Password</label>
                  <input
                    className={inputClass("passwordHash")}
                    type="password"
                    name="passwordHash"
                    placeholder="Choose a password"
                    value={userDetails.passwordHash}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                  />
                  {fieldErrors.passwordHash && (
                    <div className={styles.fieldError}>
                      {fieldErrors.passwordHash}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Note: password will be encoded server-side using your
                  PasswordEncoder.
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
                <FiSave /> Create user
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

export default CreateUser;
