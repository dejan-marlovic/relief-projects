import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiUser,
} from "react-icons/fi";

import styles from "./RestoreUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreUser = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedUsers, setDeletedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedUser = useMemo(() => {
    const id = Number(selectedUserId);
    if (!id) return null;
    return deletedUsers.find((user) => user.id === id) || null;
  }, [selectedUserId, deletedUsers]);

  const loadDeletedUsers = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/users/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedUsers([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted users. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextUsers = Array.isArray(data) ? data : [];
      setDeletedUsers(nextUsers);

      if (
        selectedUserId &&
        !nextUsers.some((user) => user.id === Number(selectedUserId))
      ) {
        setSelectedUserId("");
      }
    } catch (err) {
      console.error("Error loading deleted users:", err);
      setDeletedUsers([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted users. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedUser) {
        setFormError("Please select a deleted user to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/users/${selectedUser.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the user. Backend support may be missing.",
        );
        return;
      }

      setDeletedUsers((prev) =>
        prev.filter((user) => user.id !== selectedUser.id),
      );

      setSuccessMessage(
        `User "${selectedUser.username}" restored successfully.`,
      );
      setSelectedUserId("");
    } catch (err) {
      console.error("Restore user error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring user. Backend support may be missing.",
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className={styles.restoreContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Restore User</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted user and restore it.
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
                  <div className={styles.cardTitle}>Choose deleted user</div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreUserSelect">Deleted user</label>
                  <select
                    id="restoreUserSelect"
                    className={styles.textInput}
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted user</option>
                    {deletedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email}) - employee id:{" "}
                        {user.employeeId ?? "N/A"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/users/deleted </code>
                  and
                  <code> PUT /api/users/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Selected user details</div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted user to preview details before restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedUsers}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedUser}
              >
                <FiRotateCcw /> {restoring ? "Restoring..." : "Restore user"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreUser;
