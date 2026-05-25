import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiCreditCard,
} from "react-icons/fi";

import styles from "./DeleteBankDetail.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteBankDetail = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [bankDetails, setBankDetails] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedBankDetailId, setSelectedBankDetailId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const organizationNameById = useMemo(() => {
    return organizations.reduce((acc, organization) => {
      acc[organization.id] = organization.organizationName;
      return acc;
    }, {});
  }, [organizations]);

  const selectedBankDetail = useMemo(() => {
    const id = Number(selectedBankDetailId);
    if (!id) return null;
    return bankDetails.find((bankDetail) => bankDetail.bankId === id) || null;
  }, [selectedBankDetailId, bankDetails]);

  const getOrganizationLabel = (organizationId) => {
    if (!organizationId) return "N/A";
    return (
      organizationNameById[organizationId] ||
      `Organization id: ${organizationId}`
    );
  };

  const loadBankDetails = async () => {
    const res = await authFetch(`${BASE_URL}/api/bank-details/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active bank details.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
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

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [nextBankDetails, nextOrganizations] = await Promise.all([
        loadBankDetails(),
        loadOrganizations(),
      ]);

      setBankDetails(nextBankDetails);
      setOrganizations(nextOrganizations);

      if (
        selectedBankDetailId &&
        !nextBankDetails.some(
          (bankDetail) => bankDetail.bankId === Number(selectedBankDetailId),
        )
      ) {
        setSelectedBankDetailId("");
      }
    } catch (err) {
      console.error("Error loading bank detail delete data:", err);
      setBankDetails([]);
      setOrganizations([]);
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
    setSelectedBankDetailId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedBankDetail) {
        setFormError("Please select bank details to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete bank details for "${selectedBankDetail.bankName}" (id: ${selectedBankDetail.bankId})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/bank-details/${selectedBankDetail.bankId}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Bank details were not found. They may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete bank details.",
        );
        return;
      }

      const deletedLabel = `${selectedBankDetail.bankName} (${selectedBankDetail.accountNumber})`;

      setBankDetails((prev) =>
        prev.filter(
          (bankDetail) => bankDetail.bankId !== selectedBankDetail.bankId,
        ),
      );
      setSelectedBankDetailId("");
      setSuccessMessage(
        `Bank details "${deletedLabel}" were deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete bank detail error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting bank details.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedBankDetailId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Bank Detail</h3>
            <p className={styles.pageSubtitle}>
              Select active bank details and soft delete them.
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
                  <div className={styles.cardTitle}>Choose bank detail</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/bank-details/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteBankDetailSelect">Bank detail</label>
                  <select
                    id="deleteBankDetailSelect"
                    className={inputClass}
                    value={selectedBankDetailId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select bank detail</option>
                    {bankDetails.map((bankDetail) => (
                      <option key={bankDetail.bankId} value={bankDetail.bankId}>
                        {bankDetail.bankName} | {bankDetail.accountNumber} |{" "}
                        {getOrganizationLabel(bankDetail.organizationId)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active bank details are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Selected bank detail</div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedBankDetail ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
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
                        {selectedBankDetail.accountNumber || "N/A"}
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the bank detail is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select bank details to preview them before deleting.
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
                disabled={deleting || !selectedBankDetail}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete bank detail"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteBankDetail;
