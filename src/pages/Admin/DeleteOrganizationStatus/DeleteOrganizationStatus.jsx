import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiLayers } from "react-icons/fi";

import styles from "./DeleteOrganizationStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteOrganizationStatus = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [organizationStatuses, setOrganizationStatuses] = useState([]);
  const [selectedOrganizationStatusId, setSelectedOrganizationStatusId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedOrganizationStatus = useMemo(() => {
    const id = Number(selectedOrganizationStatusId);
    if (!id) return null;
    return (
      organizationStatuses.find(
        (organizationStatus) => organizationStatus.id === id,
      ) || null
    );
  }, [selectedOrganizationStatusId, organizationStatuses]);

  const loadOrganizationStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(
        `${BASE_URL}/api/organization-statuses/active`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setOrganizationStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load active organization statuses.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextOrganizationStatuses = Array.isArray(data) ? data : [];

      setOrganizationStatuses(nextOrganizationStatuses);

      if (
        selectedOrganizationStatusId &&
        !nextOrganizationStatuses.some(
          (organizationStatus) =>
            organizationStatus.id === Number(selectedOrganizationStatusId),
        )
      ) {
        setSelectedOrganizationStatusId("");
      }
    } catch (err) {
      console.error("Error loading organization statuses:", err);
      setOrganizationStatuses([]);
      setFormError(
        err?.message || "Unexpected error while loading organization statuses.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizationStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedOrganizationStatusId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedOrganizationStatus) {
        setFormError("Please select an organization status to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete organization status "${selectedOrganizationStatus.organizationStatusName}" (id: ${selectedOrganizationStatus.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/organization-statuses/${selectedOrganizationStatus.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Organization status was not found. It may already have been deleted.",
        );
        await loadOrganizationStatuses();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to delete the organization status.",
        );
        return;
      }

      const deletedOrganizationStatusName =
        selectedOrganizationStatus.organizationStatusName;

      setOrganizationStatuses((prev) =>
        prev.filter(
          (organizationStatus) =>
            organizationStatus.id !== selectedOrganizationStatus.id,
        ),
      );
      setSelectedOrganizationStatusId("");
      setSuccessMessage(
        `Organization status "${deletedOrganizationStatusName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete organization status error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting organization status.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedOrganizationStatusId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Organization Status</h3>
            <p className={styles.pageSubtitle}>
              Select an active organization status and soft delete it.
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
            <FiLayers />
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
                  <div className={styles.cardTitle}>
                    Choose organization status
                  </div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/organization-statuses/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteOrganizationStatusSelect">
                    Organization status
                  </label>
                  <select
                    id="deleteOrganizationStatusSelect"
                    className={inputClass}
                    value={selectedOrganizationStatusId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select organization status</option>
                    {organizationStatuses.map((organizationStatus) => (
                      <option
                        key={organizationStatus.id}
                        value={organizationStatus.id}
                      >
                        {organizationStatus.organizationStatusName} (id:{" "}
                        {organizationStatus.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active organization statuses are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected organization status details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedOrganizationStatus ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedOrganizationStatus.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Organization status name
                      </span>
                      <span className={styles.detailValue}>
                        {selectedOrganizationStatus.organizationStatusName}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the organization status is soft deleted by
                      setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select an organization status to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadOrganizationStatuses}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedOrganizationStatus}
              >
                <FiTrash2 />{" "}
                {deleting ? "Deleting..." : "Delete organization status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteOrganizationStatus;
