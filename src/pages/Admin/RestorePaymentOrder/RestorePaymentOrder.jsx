import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";

import styles from "./RestorePaymentOrder.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestorePaymentOrder = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedPaymentOrders, setDeletedPaymentOrders] = useState([]);
  const [transactionsById, setTransactionsById] = useState({});
  const [organizationsById, setOrganizationsById] = useState({});
  const [projectsById, setProjectsById] = useState({});
  const [transactionStatusesById, setTransactionStatusesById] = useState({});

  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedPaymentOrder = useMemo(() => {
    const id = Number(selectedPaymentOrderId);
    if (!id) return null;

    return (
      deletedPaymentOrders.find((paymentOrder) => paymentOrder.id === id) ||
      null
    );
  }, [selectedPaymentOrderId, deletedPaymentOrders]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    return String(value).replace("T", " ");
  };

  const getAmountLabel = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return "N/A";
    }

    return amount;
  };

  const getOrganizationLabel = (organizationId) => {
    if (!organizationId) return "N/A";

    const organization = organizationsById[organizationId];

    if (!organization) {
      return `Organization id: ${organizationId}`;
    }

    return (
      organization.organizationName ||
      organization.name ||
      `Organization id: ${organizationId}`
    );
  };

  const getProjectLabel = (projectId) => {
    if (!projectId) return "N/A";

    const project = projectsById[projectId];

    if (!project) {
      return `Project id: ${projectId}`;
    }

    const code = project.projectCode ? `${project.projectCode} - ` : "";

    return `${code}${project.projectName || `Project id: ${projectId}`}`;
  };

  const getTransactionStatusLabel = (transactionStatusId) => {
    if (!transactionStatusId) return "N/A";

    const status = transactionStatusesById[transactionStatusId];

    if (!status) {
      return `Transaction status id: ${transactionStatusId}`;
    }

    return (
      status.transactionStatusName ||
      status.name ||
      `Transaction status id: ${transactionStatusId}`
    );
  };

  const getTransactionLabel = (transactionId) => {
    if (!transactionId) return "No header transaction";

    const transaction = transactionsById[transactionId];

    if (!transaction) {
      return `Transaction id: ${transactionId}`;
    }

    const project = getProjectLabel(transaction.projectId);
    const organization = getOrganizationLabel(transaction.organizationId);
    const status = getTransactionStatusLabel(transaction.transactionStatusId);
    const approvedAmount = getAmountLabel(transaction.approvedAmount);

    return `${project} | ${organization} | ${status} | approved: ${approvedAmount}`;
  };

  const getPaymentOrderLabel = (paymentOrder) => {
    if (!paymentOrder) return "N/A";

    const description =
      paymentOrder.paymentOrderDescription ||
      `Payment order id: ${paymentOrder.id}`;
    const date = formatDate(paymentOrder.paymentOrderDate);
    const amount = getAmountLabel(paymentOrder.amount);

    return `${description} | date: ${date} | amount: ${amount}`;
  };

  const loadDeletedPaymentOrders = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [
        paymentOrdersRes,
        transactionsRes,
        organizationsRes,
        projectsRes,
        transactionStatusesRes,
      ] = await Promise.all([
        authFetch(`${BASE_URL}/api/payment-orders/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/transactions/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organizations/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/transaction-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!paymentOrdersRes.ok && paymentOrdersRes.status !== 204) {
        const data = await safeReadJson(paymentOrdersRes);
        setDeletedPaymentOrders([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted payment orders. Backend support may be missing.",
        );
        return;
      }

      const paymentOrdersData = await safeReadJson(paymentOrdersRes);
      const nextPaymentOrders = Array.isArray(paymentOrdersData)
        ? paymentOrdersData
        : [];

      let nextTransactionsById = {};
      let nextOrganizationsById = {};
      let nextProjectsById = {};
      let nextTransactionStatusesById = {};

      if (transactionsRes.ok || transactionsRes.status === 204) {
        const transactionsData = await safeReadJson(transactionsRes);
        const nextTransactions = Array.isArray(transactionsData)
          ? transactionsData
          : [];
        nextTransactionsById = buildLookupById(nextTransactions);
      }

      if (organizationsRes.ok || organizationsRes.status === 204) {
        const organizationsData = await safeReadJson(organizationsRes);
        const nextOrganizations = Array.isArray(organizationsData)
          ? organizationsData
          : [];
        nextOrganizationsById = buildLookupById(nextOrganizations);
      }

      if (projectsRes.ok || projectsRes.status === 204) {
        const projectsData = await safeReadJson(projectsRes);
        const nextProjects = Array.isArray(projectsData) ? projectsData : [];
        nextProjectsById = buildLookupById(nextProjects);
      }

      if (transactionStatusesRes.ok || transactionStatusesRes.status === 204) {
        const transactionStatusesData = await safeReadJson(
          transactionStatusesRes,
        );
        const nextTransactionStatuses = Array.isArray(transactionStatusesData)
          ? transactionStatusesData
          : [];
        nextTransactionStatusesById = buildLookupById(nextTransactionStatuses);
      }

      setDeletedPaymentOrders(nextPaymentOrders);
      setTransactionsById(nextTransactionsById);
      setOrganizationsById(nextOrganizationsById);
      setProjectsById(nextProjectsById);
      setTransactionStatusesById(nextTransactionStatusesById);

      if (
        selectedPaymentOrderId &&
        !nextPaymentOrders.some(
          (paymentOrder) => paymentOrder.id === Number(selectedPaymentOrderId),
        )
      ) {
        setSelectedPaymentOrderId("");
      }
    } catch (err) {
      console.error("Error loading deleted payment orders:", err);
      setDeletedPaymentOrders([]);
      setTransactionsById({});
      setOrganizationsById({});
      setProjectsById({});
      setTransactionStatusesById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted payment orders. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedPaymentOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedPaymentOrder) {
        setFormError("Please select a deleted payment order to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/payment-orders/${selectedPaymentOrder.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the payment order. Backend support may be missing.",
        );
        return;
      }

      setDeletedPaymentOrders((prev) =>
        prev.filter(
          (paymentOrder) => paymentOrder.id !== selectedPaymentOrder.id,
        ),
      );

      setSuccessMessage(
        `Payment order "${selectedPaymentOrder.id}" restored successfully.`,
      );
      setSelectedPaymentOrderId("");
    } catch (err) {
      console.error("Restore payment order error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring payment order. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Payment Order</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted payment order and restore it.
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
            <FiFileText />
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
                    Choose deleted payment order
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restorePaymentOrderSelect">
                    Deleted payment order
                  </label>

                  <select
                    id="restorePaymentOrderSelect"
                    className={styles.textInput}
                    value={selectedPaymentOrderId}
                    onChange={(e) => {
                      setSelectedPaymentOrderId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted payment order</option>

                    {deletedPaymentOrders.map((paymentOrder) => (
                      <option key={paymentOrder.id} value={paymentOrder.id}>
                        {getPaymentOrderLabel(paymentOrder)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/payment-orders/deleted </code>,
                  <code> GET /api/transactions/active </code>,
                  <code> GET /api/organizations/active </code>,
                  <code> GET /api/projects/active </code>,
                  <code> GET /api/transaction-statuses/active </code>
                  and
                  <code> PUT /api/payment-orders/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected payment order details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedPaymentOrder ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Header transaction
                      </span>
                      <span className={styles.detailValue}>
                        {getTransactionLabel(
                          selectedPaymentOrder.transactionId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Payment order date
                      </span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedPaymentOrder.paymentOrderDate)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Number of transactions
                      </span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.numberOfTransactions ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Description</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.paymentOrderDescription || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Computed amount
                      </span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedPaymentOrder.amount)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Message</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.message || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Pin code</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.pinCode || "N/A"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted payment order to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedPaymentOrders}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedPaymentOrder}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore payment order"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestorePaymentOrder;
