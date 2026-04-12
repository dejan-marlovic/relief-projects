import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiHome } from "react-icons/fi";

import styles from "./DeleteOrganization.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteOrganization = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [organizations, setOrganizations] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const addressLabelById = useMemo(() => {
    return addresses.reduce((acc, address) => {
      const parts = [
        address.street,
        address.city,
        address.state,
        address.postalCode,
        address.country,
      ].filter(Boolean);

      acc[address.id] = parts.length
        ? parts.join(", ")
        : `Address id: ${address.id}`;
      return acc;
    }, {});
  }, [addresses]);

  const selectedOrganization = useMemo(() => {
    const id = Number(selectedOrganizationId);
    if (!id) return null;
    return organizations.find((organization) => organization.id === id) || null;
  }, [selectedOrganizationId, organizations]);

  const getAddressLabel = (addressId) => {
    if (!addressId) return "N/A";
    return addressLabelById[addressId] || `Address id: ${addressId}`;
  };

  const loadOrganizations = async () => {
    const res = await authFetch(`${BASE_URL}/api/organizations/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active organizations.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadAddresses = async () => {
    const res = await authFetch(`${BASE_URL}/api/addresses/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active addresses.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [nextOrganizations, nextAddresses] = await Promise.all([
        loadOrganizations(),
        loadAddresses(),
      ]);

      setOrganizations(nextOrganizations);
      setAddresses(nextAddresses);

      if (
        selectedOrganizationId &&
        !nextOrganizations.some(
          (organization) => organization.id === Number(selectedOrganizationId),
        )
      ) {
        setSelectedOrganizationId("");
      }
    } catch (err) {
      console.error("Error loading organization delete data:", err);
      setOrganizations([]);
      setAddresses([]);
      setFormError(err?.message || "Unexpected error while loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedOrganizationId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedOrganization) {
        setFormError("Please select an organization to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete organization "${selectedOrganization.organizationName}" (id: ${selectedOrganization.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/organizations/${selectedOrganization.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Organization was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the organization.",
        );
        return;
      }

      const deletedOrganizationName = selectedOrganization.organizationName;

      setOrganizations((prev) =>
        prev.filter(
          (organization) => organization.id !== selectedOrganization.id,
        ),
      );
      setSelectedOrganizationId("");
      setSuccessMessage(
        `Organization "${deletedOrganizationName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete organization error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting organization.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedOrganizationId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Organization</h3>
            <p className={styles.pageSubtitle}>
              Select an active organization and soft delete it.
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
            <FiHome />
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
                  <div className={styles.cardTitle}>Choose organization</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/organizations/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteOrganizationSelect">Organization</label>
                  <select
                    id="deleteOrganizationSelect"
                    className={inputClass}
                    value={selectedOrganizationId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.organizationName} |{" "}
                        {organization.contactEmail} | Id: {organization.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active organizations are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected organization details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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
                        {selectedOrganization.organizationName}
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the organization is soft deleted through
                      <code> @SQLDelete </code>
                      which updates
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select an organization to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedOrganization}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete organization"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteOrganization;
