import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiBriefcase,
} from "react-icons/fi";

import styles from "./RestoreOrganizationStatus.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreOrganizationStatus = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedOrganizationStatuses, setDeletedOrganizationStatuses] =
    useState([]);
  const [selectedOrganizationStatusId, setSelectedOrganizationStatusId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedOrganizationStatus = useMemo(() => {
    const id = Number(selectedOrganizationStatusId);
    if (!id) return null;

    return (
      deletedOrganizationStatuses.find(
        (organizationStatus) => organizationStatus.id === id,
      ) || null
    );
  }, [selectedOrganizationStatusId, deletedOrganizationStatuses]);

  const loadDeletedOrganizationStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(
        `${BASE_URL}/api/organization-statuses/deleted`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedOrganizationStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted organization statuses. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextOrganizationStatuses = Array.isArray(data) ? data : [];

      setDeletedOrganizationStatuses(nextOrganizationStatuses);

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
      console.error("Error loading deleted organization statuses:", err);
      setDeletedOrganizationStatuses([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted organization statuses. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedOrganizationStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedOrganizationStatus) {
        setFormError("Please select a deleted organization status to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/organization-statuses/${selectedOrganizationStatus.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the organization status. Backend support may be missing.",
        );
        return;
      }

      setDeletedOrganizationStatuses((prev) =>
        prev.filter(
          (organizationStatus) =>
            organizationStatus.id !== selectedOrganizationStatus.id,
        ),
      );

      setSuccessMessage(
        `Organization status "${selectedOrganizationStatus.organizationStatusName}" restored successfully.`,
      );
      setSelectedOrganizationStatusId("");
    } catch (err) {
      console.error("Restore organization status error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring organization status. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Organization Status</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted organization status and restore it.
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
            <FiBriefcase />
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
                    Choose deleted organization status
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreOrganizationStatusSelect">
                    Deleted organization status
                  </label>

                  <select
                    id="restoreOrganizationStatusSelect"
                    className={styles.textInput}
                    value={selectedOrganizationStatusId}
                    onChange={(e) => {
                      setSelectedOrganizationStatusId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted organization status</option>

                    {deletedOrganizationStatuses.map((organizationStatus) => (
                      <option
                        key={organizationStatus.id}
                        value={organizationStatus.id}
                      >
                        {organizationStatus.organizationStatusName} - id:{" "}
                        {organizationStatus.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/organization-statuses/deleted </code>
                  and
                  <code> PUT /api/organization-statuses/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected organization status details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted organization status to preview details
                    before restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedOrganizationStatuses}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedOrganizationStatus}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore organization status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreOrganizationStatus;
