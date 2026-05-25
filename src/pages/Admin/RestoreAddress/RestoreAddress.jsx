import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiMapPin,
} from "react-icons/fi";

import styles from "./RestoreAddress.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreAddress = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedAddresses, setDeletedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedAddress = useMemo(() => {
    const id = Number(selectedAddressId);
    if (!id) return null;

    return deletedAddresses.find((address) => address.id === id) || null;
  }, [selectedAddressId, deletedAddresses]);

  const getAddressLabel = (address) => {
    if (!address) return "N/A";

    const parts = [
      address.street,
      address.postalCode,
      address.city,
      address.state,
      address.country,
    ].filter(Boolean);

    if (parts.length === 0) {
      return `Address id: ${address.id}`;
    }

    return `${parts.join(", ")} - id: ${address.id}`;
  };

  const loadDeletedAddresses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/addresses/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedAddresses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted addresses. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextAddresses = Array.isArray(data) ? data : [];

      setDeletedAddresses(nextAddresses);

      if (
        selectedAddressId &&
        !nextAddresses.some(
          (address) => address.id === Number(selectedAddressId),
        )
      ) {
        setSelectedAddressId("");
      }
    } catch (err) {
      console.error("Error loading deleted addresses:", err);
      setDeletedAddresses([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted addresses. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedAddress) {
        setFormError("Please select a deleted address to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/addresses/${selectedAddress.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the address. Backend support may be missing.",
        );
        return;
      }

      setDeletedAddresses((prev) =>
        prev.filter((address) => address.id !== selectedAddress.id),
      );

      setSuccessMessage(
        `Address "${getAddressLabel(selectedAddress)}" restored successfully.`,
      );
      setSelectedAddressId("");
    } catch (err) {
      console.error("Restore address error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring address. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Address</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted address and restore it.
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
                  <div className={styles.cardTitle}>Choose deleted address</div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreAddressSelect">Deleted address</label>

                  <select
                    id="restoreAddressSelect"
                    className={styles.textInput}
                    value={selectedAddressId}
                    onChange={(e) => {
                      setSelectedAddressId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted address</option>

                    {deletedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {getAddressLabel(address)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/addresses/deleted </code>
                  and
                  <code> PUT /api/addresses/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected address details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted address to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedAddresses}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedAddress}
              >
                <FiRotateCcw /> {restoring ? "Restoring..." : "Restore address"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreAddress;
