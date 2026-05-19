import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiRepeat,
} from "react-icons/fi";

import styles from "./RestoreTransaction.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreTransaction = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [organizationsById, setOrganizationsById] = useState({});
  const [projectsById, setProjectsById] = useState({});
  const [budgetsById, setBudgetsById] = useState({});
  const [transactionStatusesById, setTransactionStatusesById] = useState({});

  const [selectedTransactionId, setSelectedTransactionId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedTransaction = useMemo(() => {
    const id = Number(selectedTransactionId);
    if (!id) return null;

    return (
      deletedTransactions.find((transaction) => transaction.id === id) || null
    );
  }, [selectedTransactionId, deletedTransactions]);

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

  const getBudgetLabel = (budgetId) => {
    if (!budgetId) return "N/A";

    const budget = budgetsById[budgetId];

    if (!budget) {
      return `Budget id: ${budgetId}`;
    }

    const project = getProjectLabel(budget.projectId);
    const amount =
      budget.totalAmount !== null && budget.totalAmount !== undefined
        ? budget.totalAmount
        : "N/A";

    return `${project} | amount: ${amount} | budget id: ${budgetId}`;
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

  const getAmountLabel = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return "N/A";
    }

    return amount;
  };

  const getTransactionLabel = (transaction) => {
    if (!transaction) return "N/A";

    const project = getProjectLabel(transaction.projectId);
    const organization = getOrganizationLabel(transaction.organizationId);
    const status = getTransactionStatusLabel(transaction.transactionStatusId);
    const amount = getAmountLabel(transaction.approvedAmount);
    const date = formatDate(transaction.datePlanned);

    return `${project} | ${organization} | ${status} | approved: ${amount} | date: ${date}`;
  };

  const loadDeletedTransactions = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [
        transactionsRes,
        organizationsRes,
        projectsRes,
        budgetsRes,
        transactionStatusesRes,
      ] = await Promise.all([
        authFetch(`${BASE_URL}/api/transactions/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/organizations/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/budgets/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/transaction-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!transactionsRes.ok && transactionsRes.status !== 204) {
        const data = await safeReadJson(transactionsRes);
        setDeletedTransactions([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted transactions. Backend support may be missing.",
        );
        return;
      }

      const transactionsData = await safeReadJson(transactionsRes);
      const nextTransactions = Array.isArray(transactionsData)
        ? transactionsData
        : [];

      let nextOrganizationsById = {};
      let nextProjectsById = {};
      let nextBudgetsById = {};
      let nextTransactionStatusesById = {};

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

      if (budgetsRes.ok || budgetsRes.status === 204) {
        const budgetsData = await safeReadJson(budgetsRes);
        const nextBudgets = Array.isArray(budgetsData) ? budgetsData : [];
        nextBudgetsById = buildLookupById(nextBudgets);
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

      setDeletedTransactions(nextTransactions);
      setOrganizationsById(nextOrganizationsById);
      setProjectsById(nextProjectsById);
      setBudgetsById(nextBudgetsById);
      setTransactionStatusesById(nextTransactionStatusesById);

      if (
        selectedTransactionId &&
        !nextTransactions.some(
          (transaction) => transaction.id === Number(selectedTransactionId),
        )
      ) {
        setSelectedTransactionId("");
      }
    } catch (err) {
      console.error("Error loading deleted transactions:", err);
      setDeletedTransactions([]);
      setOrganizationsById({});
      setProjectsById({});
      setBudgetsById({});
      setTransactionStatusesById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted transactions. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedTransaction) {
        setFormError("Please select a deleted transaction to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/transactions/${selectedTransaction.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the transaction. Backend support may be missing.",
        );
        return;
      }

      setDeletedTransactions((prev) =>
        prev.filter((transaction) => transaction.id !== selectedTransaction.id),
      );

      setSuccessMessage(
        `Transaction "${selectedTransaction.id}" restored successfully.`,
      );
      setSelectedTransactionId("");
    } catch (err) {
      console.error("Restore transaction error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring transaction. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Transaction</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted transaction and restore it.
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
            <FiRepeat />
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
                    Choose deleted transaction
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreTransactionSelect">
                    Deleted transaction
                  </label>

                  <select
                    id="restoreTransactionSelect"
                    className={styles.textInput}
                    value={selectedTransactionId}
                    onChange={(e) => {
                      setSelectedTransactionId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted transaction</option>

                    {deletedTransactions.map((transaction) => (
                      <option key={transaction.id} value={transaction.id}>
                        {getTransactionLabel(transaction)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/transactions/deleted </code>,
                  <code> GET /api/organizations/active </code>,
                  <code> GET /api/projects/active </code>,
                  <code> GET /api/budgets/active </code>,
                  <code> GET /api/transaction-statuses/active </code>
                  and
                  <code> PUT /api/transactions/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected transaction details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedTransaction ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Organization</span>
                      <span className={styles.detailValue}>
                        {getOrganizationLabel(
                          selectedTransaction.organizationId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project</span>
                      <span className={styles.detailValue}>
                        {getProjectLabel(selectedTransaction.projectId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Budget</span>
                      <span className={styles.detailValue}>
                        {getBudgetLabel(selectedTransaction.budgetId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Financier organization
                      </span>
                      <span className={styles.detailValue}>
                        {getOrganizationLabel(
                          selectedTransaction.financierOrganizationId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Status</span>
                      <span className={styles.detailValue}>
                        {getTransactionStatusLabel(
                          selectedTransaction.transactionStatusId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Applied for amount
                      </span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedTransaction.appliedForAmount)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        First share amount
                      </span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedTransaction.firstShareAmount)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Approved amount
                      </span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedTransaction.approvedAmount)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Own contribution
                      </span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.ownContribution || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Second share amount
                      </span>
                      <span className={styles.detailValue}>
                        {getAmountLabel(selectedTransaction.secondShareAmount)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Date planned</span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedTransaction.datePlanned)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>OK status</span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.okStatus || "N/A"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted transaction to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedTransactions}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedTransaction}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore transaction"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreTransaction;
