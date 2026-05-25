import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiUsers } from "react-icons/fi";

import styles from "./DeleteRecipient.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteRecipient = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [recipients, setRecipients] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const organizationNameById = useMemo(() => {
    return organizations.reduce((acc, organization) => {
      acc[organization.id] = organization.organizationName;
      return acc;
    }, {});
  }, [organizations]);

  const paymentOrderLabelById = useMemo(() => {
    return paymentOrders.reduce((acc, order) => {
      acc[order.id] = order.paymentOrderDescription
        ? `${order.paymentOrderDescription} (id: ${order.id})`
        : `Payment Order #${order.id}`;
      return acc;
    }, {});
  }, [paymentOrders]);

  const selectedRecipient = useMemo(() => {
    const id = Number(selectedRecipientId);
    if (!id) return null;
    return recipients.find((recipient) => recipient.id === id) || null;
  }, [selectedRecipientId, recipients]);

  const getOrganizationLabel = (organizationId) => {
    if (!organizationId) return "N/A";
    return (
      organizationNameById[organizationId] ||
      `Organization id: ${organizationId}`
    );
  };

  const getPaymentOrderLabel = (paymentOrderId) => {
    if (!paymentOrderId) return "N/A";
    return (
      paymentOrderLabelById[paymentOrderId] ||
      `Payment order id: ${paymentOrderId}`
    );
  };

  const loadRecipients = async () => {
    const res = await authFetch(`${BASE_URL}/api/recipients/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active recipients.",
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

  const loadPaymentOrders = async () => {
    const res = await authFetch(`${BASE_URL}/api/payment-orders/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message ||
          data?.detail ||
          "Failed to load active payment orders.",
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

      const [nextRecipients, nextOrganizations, nextPaymentOrders] =
        await Promise.all([
          loadRecipients(),
          loadOrganizations(),
          loadPaymentOrders(),
        ]);

      setRecipients(nextRecipients);
      setOrganizations(nextOrganizations);
      setPaymentOrders(nextPaymentOrders);

      if (
        selectedRecipientId &&
        !nextRecipients.some(
          (recipient) => recipient.id === Number(selectedRecipientId),
        )
      ) {
        setSelectedRecipientId("");
      }
    } catch (err) {
      console.error("Error loading recipient delete data:", err);
      setRecipients([]);
      setOrganizations([]);
      setPaymentOrders([]);
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
    setSelectedRecipientId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedRecipient) {
        setFormError("Please select a recipient to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete recipient id ${selectedRecipient.id}?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/recipients/${selectedRecipient.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Recipient was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the recipient.",
        );
        return;
      }

      const deletedId = selectedRecipient.id;

      setRecipients((prev) =>
        prev.filter((recipient) => recipient.id !== selectedRecipient.id),
      );
      setSelectedRecipientId("");
      setSuccessMessage(`Recipient id ${deletedId} was deleted successfully.`);
    } catch (err) {
      console.error("Delete recipient error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting recipient.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${
    formError && !selectedRecipientId ? styles.inputError : ""
  }`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Recipient</h3>
            <p className={styles.pageSubtitle}>
              Select an active recipient and soft delete it.
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
            <FiUsers />
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
                  <div className={styles.cardTitle}>Choose recipient</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/recipients/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteRecipientSelect">Recipient</label>
                  <select
                    id="deleteRecipientSelect"
                    className={inputClass}
                    value={selectedRecipientId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select recipient</option>
                    {recipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {getOrganizationLabel(recipient.organizationId)} |{" "}
                        {getPaymentOrderLabel(recipient.paymentOrderId)} | Id:{" "}
                        {recipient.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active recipients are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected recipient details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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
                        {selectedRecipient.amount ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the recipient is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a recipient to preview its details before deleting.
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
                disabled={deleting || !selectedRecipient}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete recipient"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteRecipient;
