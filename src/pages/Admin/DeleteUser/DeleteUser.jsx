import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiUser } from "react-icons/fi";

import styles from "./DeleteUser.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteUser = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedUser = useMemo(() => {
    const id = Number(selectedUserId);
    if (!id) return null;
    return users.find((user) => user.id === id) || null;
  }, [selectedUserId, users]);

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

      // if selected user no longer exists in refreshed list -> clear it
      if (
        selectedUserId &&
        !nextUsers.some((user) => user.id === Number(selectedUserId))
      ) {
        setSelectedUserId("");
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

  const handleSelectChange = (e) => {
    setSelectedUserId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedUser) {
        setFormError("Please select a user to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete user "${selectedUser.username}" (id: ${selectedUser.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(`${BASE_URL}/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (res.status === 404) {
        setFormError("User was not found. It may already have been deleted.");
        await loadUsers();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the user.",
        );
        return;
      }

      const deletedUsername = selectedUser.username;

      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
      setSelectedUserId("");
      setSuccessMessage(`User "${deletedUsername}" was deleted successfully.`);
    } catch (err) {
      console.error("Delete user error:", err);
      setFormError(err?.message || "Unexpected error while deleting user.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedUserId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete User</h3>
            <p className={styles.pageSubtitle}>
              Select an active user and soft delete it.
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
            <FiUser />
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
                  <div className={styles.cardTitle}>Choose user</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/users/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteUserSelect">User</label>
                  <select
                    id="deleteUserSelect"
                    className={inputClass}
                    value={selectedUserId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email}) - employee id:{" "}
                        {user.employeeId ?? "N/A"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active users are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Selected user details</div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedUser ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedUser.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Username</span>
                      <span className={styles.detailValue}>
                        {selectedUser.username}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Email</span>
                      <span className={styles.detailValue}>
                        {selectedUser.email}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Employee id</span>
                      <span className={styles.detailValue}>
                        {selectedUser.employeeId ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint, which in your
                      current JPA setup performs a soft delete by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a user to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadUsers}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedUser}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete user"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteUser;
