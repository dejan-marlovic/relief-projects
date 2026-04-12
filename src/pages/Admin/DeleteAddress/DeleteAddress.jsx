import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiMapPin } from "react-icons/fi";

import styles from "./DeleteAddress.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteAddress = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedAddress = useMemo(() => {
    const id = Number(selectedAddressId);
    if (!id) return null;
    return addresses.find((address) => address.id === id) || null;
  }, [selectedAddressId, addresses]);

  const formatAddressLine = (address) => {
    if (!address) return "";

    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    return parts.join(", ");
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/addresses/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setAddresses([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active addresses.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextAddresses = Array.isArray(data) ? data : [];

      setAddresses(nextAddresses);

      if (
        selectedAddressId &&
        !nextAddresses.some(
          (address) => address.id === Number(selectedAddressId),
        )
      ) {
        setSelectedAddressId("");
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
      setAddresses([]);
      setFormError(err?.message || "Unexpected error while loading addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedAddressId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedAddress) {
        setFormError("Please select an address to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete address "${formatAddressLine(selectedAddress)}" (id: ${selectedAddress.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/addresses/${selectedAddress.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Address was not found. It may already have been deleted.",
        );
        await loadAddresses();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the address.",
        );
        return;
      }

      const deletedAddressLabel = formatAddressLine(selectedAddress);

      setAddresses((prev) =>
        prev.filter((address) => address.id !== selectedAddress.id),
      );
      setSelectedAddressId("");
      setSuccessMessage(
        `Address "${deletedAddressLabel}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete address error:", err);
      setFormError(err?.message || "Unexpected error while deleting address.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedAddressId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Address</h3>
            <p className={styles.pageSubtitle}>
              Select an active address and soft delete it.
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
            <FiMapPin />
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
                  <div className={styles.cardTitle}>Choose address</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/addresses/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteAddressSelect">Address</label>
                  <select
                    id="deleteAddressSelect"
                    className={inputClass}
                    value={selectedAddressId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {formatAddressLine(address)} | Id: {address.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active addresses are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected address details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedAddress ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedAddress.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Street</span>
                      <span className={styles.detailValue}>
                        {selectedAddress.street || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>City</span>
                      <span className={styles.detailValue}>
                        {selectedAddress.city || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>State</span>
                      <span className={styles.detailValue}>
                        {selectedAddress.state || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Postal code</span>
                      <span className={styles.detailValue}>
                        {selectedAddress.postalCode || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Country</span>
                      <span className={styles.detailValue}>
                        {selectedAddress.country || "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, deleting an address first reassigns linked
                      organizations and projects to the default address
                      <code> id = 16 </code>
                      and then soft deletes the selected address by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select an address to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadAddresses}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedAddress}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete address"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAddress;
