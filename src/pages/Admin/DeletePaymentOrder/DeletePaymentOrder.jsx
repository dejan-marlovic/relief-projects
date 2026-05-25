import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";

import styles from "./DeletePaymentOrder.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeletePaymentOrder = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [paymentOrders, setPaymentOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const projectNameById = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = project.projectName;
      return acc;
    }, {});
  }, [projects]);

  const transactionById = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      acc[transaction.id] = transaction;
      return acc;
    }, {});
  }, [transactions]);

  const selectedPaymentOrder = useMemo(() => {
    const id = Number(selectedPaymentOrderId);
    if (!id) return null;
    return paymentOrders.find((order) => order.id === id) || null;
  }, [selectedPaymentOrderId, paymentOrders]);

  const getProjectLabelFromTransactionId = (transactionId) => {
    if (!transactionId) return "N/A";
    const tx = transactionById[transactionId];
    if (!tx) return `Transaction id: ${transactionId}`;
    const projectName = projectNameById[tx.projectId];
    return projectName || `Project id: ${tx.projectId ?? "N/A"}`;
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

  const loadTransactions = async () => {
    const res = await authFetch(`${BASE_URL}/api/transactions/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active transactions.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadProjects = async () => {
    const res = await authFetch(`${BASE_URL}/api/projects/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active projects.",
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

      const [nextPaymentOrders, nextTransactions, nextProjects] =
        await Promise.all([
          loadPaymentOrders(),
          loadTransactions(),
          loadProjects(),
        ]);

      setPaymentOrders(nextPaymentOrders);
      setTransactions(nextTransactions);
      setProjects(nextProjects);

      if (
        selectedPaymentOrderId &&
        !nextPaymentOrders.some(
          (order) => order.id === Number(selectedPaymentOrderId),
        )
      ) {
        setSelectedPaymentOrderId("");
      }
    } catch (err) {
      console.error("Error loading payment order delete data:", err);
      setPaymentOrders([]);
      setTransactions([]);
      setProjects([]);
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
    setSelectedPaymentOrderId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedPaymentOrder) {
        setFormError("Please select a payment order to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete payment order "${selectedPaymentOrder.paymentOrderDescription}" (id: ${selectedPaymentOrder.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/payment-orders/${selectedPaymentOrder.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Payment order was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to delete the payment order.",
        );
        return;
      }

      const deletedLabel =
        selectedPaymentOrder.paymentOrderDescription ||
        `Payment Order #${selectedPaymentOrder.id}`;

      setPaymentOrders((prev) =>
        prev.filter((order) => order.id !== selectedPaymentOrder.id),
      );
      setSelectedPaymentOrderId("");
      setSuccessMessage(
        `Payment order "${deletedLabel}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete payment order error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting payment order.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${
    formError && !selectedPaymentOrderId ? styles.inputError : ""
  }`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Payment Order</h3>
            <p className={styles.pageSubtitle}>
              Select an active payment order and soft delete it.
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
                  <div className={styles.cardTitle}>Choose payment order</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/payment-orders/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deletePaymentOrderSelect">
                    Payment order
                  </label>
                  <select
                    id="deletePaymentOrderSelect"
                    className={inputClass}
                    value={selectedPaymentOrderId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select payment order</option>
                    {paymentOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.paymentOrderDescription} | Project:{" "}
                        {getProjectLabelFromTransactionId(order.transactionId)}{" "}
                        | Id: {order.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active payment orders are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected payment order details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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
                      <span className={styles.detailLabel}>Project</span>
                      <span className={styles.detailValue}>
                        {getProjectLabelFromTransactionId(
                          selectedPaymentOrder.transactionId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Transaction id</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.transactionId ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Order date</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.paymentOrderDate || "N/A"}
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
                      <span className={styles.detailLabel}>Amount</span>
                      <span className={styles.detailValue}>
                        {selectedPaymentOrder.amount ?? "N/A"}
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the payment order is soft deleted by
                      setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>. If the payment order is
                      Booked by a final signature, the backend may block
                      deletion.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a payment order to preview its details before
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
                disabled={deleting || !selectedPaymentOrder}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete payment order"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeletePaymentOrder;
