import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiBriefcase,
} from "react-icons/fi";

import styles from "./RestoreOrganization.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreOrganization = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedOrganizations, setDeletedOrganizations] = useState([]);
  const [addressesById, setAddressesById] = useState({});
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedOrganization = useMemo(() => {
    const id = Number(selectedOrganizationId);
    if (!id) return null;

    return (
      deletedOrganizations.find((organization) => organization.id === id) ||
      null
    );
  }, [selectedOrganizationId, deletedOrganizations]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const getAddressLabel = (addressId) => {
    if (!addressId) return "N/A";

    const address = addressesById[addressId];

    if (!address) {
      return `Address id: ${addressId}`;
    }

    const parts = [
      address.street,
      address.postalCode,
      address.city,
      address.state,
      address.country,
    ].filter(Boolean);

    if (parts.length === 0) {
      return `Address id: ${addressId}`;
    }

    return `${parts.join(", ")} - id: ${addressId}`;
  };

  const getOrganizationLabel = (organization) => {
    if (!organization) return "N/A";

    const name =
      organization.organizationName || `Organization id: ${organization.id}`;
    const email = organization.contactEmail
      ? ` | ${organization.contactEmail}`
      : "";
    const address = organization.addressId
      ? ` | ${getAddressLabel(organization.addressId)}`
      : "";

    return `${name}${email}${address}`;
  };

  const loadDeletedOrganizations = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [organizationsRes, addressesRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/organizations/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/addresses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!organizationsRes.ok && organizationsRes.status !== 204) {
        const data = await safeReadJson(organizationsRes);
        setDeletedOrganizations([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted organizations. Backend support may be missing.",
        );
        return;
      }

      const organizationsData = await safeReadJson(organizationsRes);
      const nextOrganizations = Array.isArray(organizationsData)
        ? organizationsData
        : [];

      let nextAddressesById = {};

      if (addressesRes.ok || addressesRes.status === 204) {
        const addressesData = await safeReadJson(addressesRes);
        const nextAddresses = Array.isArray(addressesData) ? addressesData : [];
        nextAddressesById = buildLookupById(nextAddresses);
      }

      setDeletedOrganizations(nextOrganizations);
      setAddressesById(nextAddressesById);

      if (
        selectedOrganizationId &&
        !nextOrganizations.some(
          (organization) => organization.id === Number(selectedOrganizationId),
        )
      ) {
        setSelectedOrganizationId("");
      }
    } catch (err) {
      console.error("Error loading deleted organizations:", err);
      setDeletedOrganizations([]);
      setAddressesById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted organizations. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedOrganization) {
        setFormError("Please select a deleted organization to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/organizations/${selectedOrganization.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the organization. Backend support may be missing.",
        );
        return;
      }

      setDeletedOrganizations((prev) =>
        prev.filter(
          (organization) => organization.id !== selectedOrganization.id,
        ),
      );

      setSuccessMessage(
        `Organization "${selectedOrganization.organizationName}" restored successfully.`,
      );
      setSelectedOrganizationId("");
    } catch (err) {
      console.error("Restore organization error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring organization. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Organization</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted organization and restore it.
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
                    Choose deleted organization
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreOrganizationSelect">
                    Deleted organization
                  </label>

                  <select
                    id="restoreOrganizationSelect"
                    className={styles.textInput}
                    value={selectedOrganizationId}
                    onChange={(e) => {
                      setSelectedOrganizationId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted organization</option>

                    {deletedOrganizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {getOrganizationLabel(organization)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/organizations/deleted </code>,
                  <code> GET /api/addresses/active </code>
                  and
                  <code> PUT /api/organizations/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected organization details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedOrganization ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedOrganization.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Organization name
                      </span>
                      <span className={styles.detailValue}>
                        {selectedOrganization.organizationName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Contact email</span>
                      <span className={styles.detailValue}>
                        {selectedOrganization.contactEmail || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Contact phone</span>
                      <span className={styles.detailValue}>
                        {selectedOrganization.contactPhone || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Address</span>
                      <span className={styles.detailValue}>
                        {getAddressLabel(selectedOrganization.addressId)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted organization to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedOrganizations}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedOrganization}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore organization"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreOrganization;
