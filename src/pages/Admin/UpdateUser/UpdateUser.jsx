import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "./UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

const initialUserDetails = {
  selectedUserId: "",
  username: "",
  email: "",
  passwordHash: "",
};

const validateUserDetails = (values) => {
  const errors = {};

  if (!values.selectedUserId) {
    errors.selectedUserId = "Please select a user.";
  }

  const username = values.username?.trim() || "";
  if (!username) errors.username = "Username is required.";
  else if (username.length < 3 || username.length > 50) {
    errors.username = "Username must be between 3 and 50 characters.";
  }

  const email = values.email?.trim() || "";
  if (!email) errors.email = "Email is required.";
  else {
    // eslint-disable-next-line no-useless-escape
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) errors.email = "Email must be a valid email address.";
  }

  const pw = values.passwordHash ?? "";
  if (!pw.trim()) errors.passwordHash = "Password is required.";
  else if (pw.trim().length < 3 || pw.trim().length > 255) {
    errors.passwordHash = "Password must be between 3 and 255 characters.";
  }

  return errors;
};

const UpdateUser = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [userDetails, setUserDetails] = useState(initialUserDetails);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const selectedUser = useMemo(() => {
    const id = Number(userDetails.selectedUserId);
    if (!id) return null;
    return users.find((user) => user.id === id) || null;
  }, [userDetails.selectedUserId, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/users/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setUsers([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active users.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextUsers = Array.isArray(data) ? data : [];
      setUsers(nextUsers);

      if (
        userDetails.selectedUserId &&
        !nextUsers.some(
          (user) => user.id === Number(userDetails.selectedUserId),
        )
      ) {
        setUserDetails(initialUserDetails);
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers([]);
      setFormError(err?.message || "Unexpected error while loading users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = async (e) => {
    const selectedUserId = e.target.value;

    setUserDetails((prev) => ({
      ...prev,
      selectedUserId,
    }));

    setFieldErrors((prev) => ({ ...prev, selectedUserId: "" }));
    setFormError("");
    setSuccessMessage("");

    if (!selectedUserId) {
      setUserDetails(initialUserDetails);
      return;
    }

    const selected = users.find((user) => user.id === Number(selectedUserId));

    setUserDetails({
      selectedUserId,
      username: selected?.username || "",
      email: selected?.email || "",
      passwordHash: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setUserDetails((prev) => ({
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
    if (!selectedUser) {
      setUserDetails(initialUserDetails);
      setFieldErrors({});
      setFormError("");
      setSuccessMessage("");
      return;
    }

    setUserDetails({
      selectedUserId: String(selectedUser.id),
      username: selectedUser.username || "",
      email: selectedUser.email || "",
      passwordHash: "",
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

      const errors = validateUserDetails(userDetails);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setSaving(true);

      const payload = {
        username: userDetails.username.trim(),
        email: userDetails.email.trim(),
        passwordHash: userDetails.passwordHash,
      };

      const res = await authFetch(
        `${BASE_URL}/api/users/${Number(userDetails.selectedUserId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem updating the user.",
        );
        return;
      }

      const updated = await safeReadJson(res);

      setSuccessMessage(
        `User "${updated?.username || userDetails.username}" updated successfully.`,
      );

      setUsers((prev) =>
        prev.map((user) =>
          user.id === Number(userDetails.selectedUserId)
            ? {
                ...user,
                username: updated?.username || userDetails.username.trim(),
                email: updated?.email || userDetails.email.trim(),
              }
            : user,
        ),
      );

      setUserDetails((prev) => ({
        ...prev,
        passwordHash: "",
      }));
    } catch (err) {
      console.error("Update user error:", err);
      setFormError(err?.message || "Unexpected error while updating user.");
    } finally {
      setSaving(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update User</h3>
            <p className={styles.pageSubtitle}>
              Select an active user and update its login details.
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
                  <div className={styles.cardTitle}>Choose user</div>
                  <div className={styles.cardMeta}>Active users only</div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="updateUserSelect">User</label>
                  <select
                    id="updateUserSelect"
                    className={inputClass("selectedUserId")}
                    value={userDetails.selectedUserId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email}) - employee id:{" "}
                        {user.employeeId ?? "N/A"}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.selectedUserId && (
                    <div className={styles.fieldError}>
                      {fieldErrors.selectedUserId}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>
                    Username, email and password
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input
                    className={inputClass("username")}
                    name="username"
                    value={userDetails.username}
                    onChange={handleInputChange}
                    placeholder="e.g. dejan.m"
                    disabled={!userDetails.selectedUserId || saving}
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
                    value={userDetails.email}
                    onChange={handleInputChange}
                    placeholder="e.g. dejan@example.com"
                    disabled={!userDetails.selectedUserId || saving}
                  />
                  {fieldErrors.email && (
                    <div className={styles.fieldError}>{fieldErrors.email}</div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>New password</label>
                  <input
                    className={inputClass("passwordHash")}
                    type="password"
                    name="passwordHash"
                    value={userDetails.passwordHash}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    disabled={!userDetails.selectedUserId || saving}
                  />
                  {fieldErrors.passwordHash && (
                    <div className={styles.fieldError}>
                      {fieldErrors.passwordHash}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Note: your current backend requires passwordHash in PUT, so
                  this screen asks for a new password every time you update a
                  user.
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadUsers}
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
                <FiSave /> {saving ? "Saving..." : "Update user"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateUser;
