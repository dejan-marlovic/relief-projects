import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiCreditCard,
} from "react-icons/fi";

import styles from "./RestoreBankDetail.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreBankDetail = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedBankDetails, setDeletedBankDetails] = useState([]);
  const [organizationsById, setOrganizationsById] = useState({});

  const [selectedBankId, setSelectedBankId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedBankDetail = useMemo(() => {
    const bankId = Number(selectedBankId);
    if (!bankId) return null;

    return (
      deletedBankDetails.find((bankDetail) => bankDetail.bankId === bankId) ||
      null
    );
  }, [selectedBankId, deletedBankDetails]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const getOrganizationLabel = (organizationId) => {
    if (!organizationId) return "N/A";

    const organization = organizationsById[organizationId];

    if (!organization) {
      return `Organization id: ${organizationId}`;
    }

    if (organization.organizationName) {
      return `${organization.organizationName} - id: ${organizationId}`;
    }

    if (organization.name) {
      return `${organization.name} - id: ${organizationId}`;
    }

    return `Organization id: ${organizationId}`;
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return "N/A";

    const value = String(accountNumber);
    if (value.length <= 4) return value;

    return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
  };

  const getBankDetailLabel = (bankDetail) => {
    if (!bankDetail) return "N/A";

    const bankName =
      bankDetail.bankName || `Bank detail id: ${bankDetail.bankId}`;
    const organization = getOrganizationLabel(bankDetail.organizationId);
    const account = maskAccountNumber(bankDetail.accountNumber);

    return `${bankName} | ${organization} | account: ${account}`;
  };

  const loadDeletedBankDetails = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [bankDetailsRes, organizationsRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/bank-details/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organizations/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!bankDetailsRes.ok && bankDetailsRes.status !== 204) {
        const data = await safeReadJson(bankDetailsRes);
        setDeletedBankDetails([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted bank details. Backend support may be missing.",
        );
        return;
      }

      const bankDetailsData = await safeReadJson(bankDetailsRes);
      const nextBankDetails = Array.isArray(bankDetailsData)
        ? bankDetailsData
        : [];

      let nextOrganizationsById = {};

      if (organizationsRes.ok || organizationsRes.status === 204) {
        const organizationsData = await safeReadJson(organizationsRes);
        const nextOrganizations = Array.isArray(organizationsData)
          ? organizationsData
          : [];

        nextOrganizationsById = buildLookupById(nextOrganizations);
      }

      setDeletedBankDetails(nextBankDetails);
      setOrganizationsById(nextOrganizationsById);

      if (
        selectedBankId &&
        !nextBankDetails.some(
          (bankDetail) => bankDetail.bankId === Number(selectedBankId),
        )
      ) {
        setSelectedBankId("");
      }
    } catch (err) {
      console.error("Error loading deleted bank details:", err);
      setDeletedBankDetails([]);
      setOrganizationsById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted bank details. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedBankDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedBankDetail) {
        setFormError("Please select a deleted bank detail to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/bank-details/${selectedBankDetail.bankId}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the bank detail. Backend support may be missing.",
        );
        return;
      }

      setDeletedBankDetails((prev) =>
        prev.filter(
          (bankDetail) => bankDetail.bankId !== selectedBankDetail.bankId,
        ),
      );

      setSuccessMessage(
        `Bank detail "${selectedBankDetail.bankName}" restored successfully.`,
      );
      setSelectedBankId("");
    } catch (err) {
      console.error("Restore bank detail error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring bank detail. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Bank Detail</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted bank detail and restore it.
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
            <FiCreditCard />
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
                    Choose deleted bank detail
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreBankDetailSelect">
                    Deleted bank detail
                  </label>

                  <select
                    id="restoreBankDetailSelect"
                    className={styles.textInput}
                    value={selectedBankId}
                    onChange={(e) => {
                      setSelectedBankId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted bank detail</option>

                    {deletedBankDetails.map((bankDetail) => (
                      <option key={bankDetail.bankId} value={bankDetail.bankId}>
                        {getBankDetailLabel(bankDetail)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/bank-details/deleted </code>,
                  <code> GET /api/organizations/active </code>
                  and
                  <code> PUT /api/bank-details/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected bank detail details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedBankDetail ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Bank id</span>
                      <span className={styles.detailValue}>
                        {selectedBankDetail.bankId}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Organization</span>
                      <span className={styles.detailValue}>
                        {getOrganizationLabel(
                          selectedBankDetail.organizationId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Bank name</span>
                      <span className={styles.detailValue}>
                        {selectedBankDetail.bankName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Account number</span>
                      <span className={styles.detailValue}>
                        {maskAccountNumber(selectedBankDetail.accountNumber)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Branch name</span>
                      <span className={styles.detailValue}>
                        {selectedBankDetail.branchName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>SWIFT code</span>
                      <span className={styles.detailValue}>
                        {selectedBankDetail.swiftCode || "N/A"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted bank detail to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedBankDetails}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedBankDetail}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore bank detail"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreBankDetail;
