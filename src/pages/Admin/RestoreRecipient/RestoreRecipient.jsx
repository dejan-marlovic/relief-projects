import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiUserCheck,
} from "react-icons/fi";

import styles from "./RestoreRecipient.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreRecipient = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedRecipients, setDeletedRecipients] = useState([]);
  const [organizationsById, setOrganizationsById] = useState({});
  const [paymentOrdersById, setPaymentOrdersById] = useState({});

  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedRecipient = useMemo(() => {
    const id = Number(selectedRecipientId);
    if (!id) return null;

    return deletedRecipients.find((recipient) => recipient.id === id) || null;
  }, [selectedRecipientId, deletedRecipients]);

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

    if (organization.organizationNumber) {
      return `${organization.organizationNumber} - id: ${organizationId}`;
    }

    return `Organization id: ${organizationId}`;
  };

  const getPaymentOrderLabel = (paymentOrderId) => {
    if (!paymentOrderId) return "N/A";

    const paymentOrder = paymentOrdersById[paymentOrderId];

    if (!paymentOrder) {
      return `Payment order id: ${paymentOrderId}`;
    }

    if (paymentOrder.paymentOrderNumber) {
      return `${paymentOrder.paymentOrderNumber} - id: ${paymentOrderId}`;
    }

    if (paymentOrder.poNumber) {
      return `${paymentOrder.poNumber} - id: ${paymentOrderId}`;
    }

    if (paymentOrder.referenceNumber) {
      return `${paymentOrder.referenceNumber} - id: ${paymentOrderId}`;
    }

    return `Payment order id: ${paymentOrderId}`;
  };

  const getAmountLabel = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return "N/A";
    }

    return amount;
  };

  const getRecipientLabel = (recipient) => {
    return `${getOrganizationLabel(
      recipient.organizationId,
    )} | ${getPaymentOrderLabel(recipient.paymentOrderId)} | amount: ${getAmountLabel(
      recipient.amount,
    )}`;
  };

  const loadDeletedRecipients = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [recipientsRes, organizationsRes, paymentOrdersRes] =
        await Promise.all([
          authFetch(`${BASE_URL}/api/recipients/deleted`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/organizations/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/payment-orders/active`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

      if (!recipientsRes.ok && recipientsRes.status !== 204) {
        const data = await safeReadJson(recipientsRes);
        setDeletedRecipients([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted recipients. Backend support may be missing.",
        );
        return;
      }

      const recipientsData = await safeReadJson(recipientsRes);
      const nextRecipients = Array.isArray(recipientsData)
        ? recipientsData
        : [];

      let nextOrganizationsById = {};
      let nextPaymentOrdersById = {};

      if (organizationsRes.ok || organizationsRes.status === 204) {
        const organizationsData = await safeReadJson(organizationsRes);
        const nextOrganizations = Array.isArray(organizationsData)
          ? organizationsData
          : [];

        nextOrganizationsById = buildLookupById(nextOrganizations);
      }

      if (paymentOrdersRes.ok || paymentOrdersRes.status === 204) {
        const paymentOrdersData = await safeReadJson(paymentOrdersRes);
        const nextPaymentOrders = Array.isArray(paymentOrdersData)
          ? paymentOrdersData
          : [];

        nextPaymentOrdersById = buildLookupById(nextPaymentOrders);
      }

      setDeletedRecipients(nextRecipients);
      setOrganizationsById(nextOrganizationsById);
      setPaymentOrdersById(nextPaymentOrdersById);

      if (
        selectedRecipientId &&
        !nextRecipients.some(
          (recipient) => recipient.id === Number(selectedRecipientId),
        )
      ) {
        setSelectedRecipientId("");
      }
    } catch (err) {
      console.error("Error loading deleted recipients:", err);
      setDeletedRecipients([]);
      setOrganizationsById({});
      setPaymentOrdersById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted recipients. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedRecipient) {
        setFormError("Please select a deleted recipient to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/recipients/${selectedRecipient.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the recipient. Backend support may be missing.",
        );
        return;
      }

      setDeletedRecipients((prev) =>
        prev.filter((recipient) => recipient.id !== selectedRecipient.id),
      );

      setSuccessMessage(
        `Recipient "${getOrganizationLabel(
          selectedRecipient.organizationId,
        )}" restored successfully.`,
      );
      setSelectedRecipientId("");
    } catch (err) {
      console.error("Restore recipient error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring recipient. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Recipient</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted recipient and restore it.
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
            <FiUserCheck />
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
                    Choose deleted recipient
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreRecipientSelect">
                    Deleted recipient
                  </label>

                  <select
                    id="restoreRecipientSelect"
                    className={styles.textInput}
                    value={selectedRecipientId}
                    onChange={(e) => {
                      setSelectedRecipientId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted recipient</option>

                    {deletedRecipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {getRecipientLabel(recipient)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/recipients/deleted </code>,
                  <code> GET /api/organizations/active </code>,
                  <code> GET /api/payment-orders/active </code>
                  and
                  <code> PUT /api/recipients/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected recipient details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedRecipient ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedRecipient.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Organization</span>
                      <span className={styles.detailValue}>
                        {getOrganizationLabel(selectedRecipient.organizationId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Payment order</span>
                      <span className={styles.detailValue}>
                        {getPaymentOrderLabel(selectedRecipient.paymentOrderId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Amount</span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedRecipient.amount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted recipient to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedRecipients}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedRecipient}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore recipient"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreRecipient;
