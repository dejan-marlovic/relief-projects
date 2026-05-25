import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiRepeat } from "react-icons/fi";

import styles from "./DeleteTransaction.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteTransaction = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactionStatuses, setTransactionStatuses] = useState([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const organizationNameById = useMemo(() => {
    return organizations.reduce((acc, organization) => {
      acc[organization.id] = organization.organizationName;
      return acc;
    }, {});
  }, [organizations]);

  const projectNameById = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = project.projectName;
      return acc;
    }, {});
  }, [projects]);

  const budgetLabelById = useMemo(() => {
    return budgets.reduce((acc, budget) => {
      const label = budget.budgetDescription
        ? `${budget.budgetDescription} (id: ${budget.id})`
        : `Budget #${budget.id}`;
      acc[budget.id] = label;
      return acc;
    }, {});
  }, [budgets]);

  const transactionStatusNameById = useMemo(() => {
    return transactionStatuses.reduce((acc, status) => {
      acc[status.id] = status.transactionStatusName;
      return acc;
    }, {});
  }, [transactionStatuses]);

  const selectedTransaction = useMemo(() => {
    const id = Number(selectedTransactionId);
    if (!id) return null;
    return transactions.find((transaction) => transaction.id === id) || null;
  }, [selectedTransactionId, transactions]);

  const getOrganizationLabel = (organizationId) => {
    if (!organizationId) return "N/A";
    return (
      organizationNameById[organizationId] ||
      `Organization id: ${organizationId}`
    );
  };

  const getProjectLabel = (projectId) => {
    if (!projectId) return "N/A";
    return projectNameById[projectId] || `Project id: ${projectId}`;
  };

  const getBudgetLabel = (budgetId) => {
    if (!budgetId) return "N/A";
    return budgetLabelById[budgetId] || `Budget id: ${budgetId}`;
  };

  const getTransactionStatusLabel = (transactionStatusId) => {
    if (!transactionStatusId) return "N/A";
    return (
      transactionStatusNameById[transactionStatusId] ||
      `Status id: ${transactionStatusId}`
    );
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

  const loadBudgets = async () => {
    const res = await authFetch(`${BASE_URL}/api/budgets/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active budgets.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadTransactionStatuses = async () => {
    const res = await authFetch(`${BASE_URL}/api/transaction-statuses/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message ||
          data?.detail ||
          "Failed to load active transaction statuses.",
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

      const [
        nextTransactions,
        nextOrganizations,
        nextProjects,
        nextBudgets,
        nextTransactionStatuses,
      ] = await Promise.all([
        loadTransactions(),
        loadOrganizations(),
        loadProjects(),
        loadBudgets(),
        loadTransactionStatuses(),
      ]);

      setTransactions(nextTransactions);
      setOrganizations(nextOrganizations);
      setProjects(nextProjects);
      setBudgets(nextBudgets);
      setTransactionStatuses(nextTransactionStatuses);

      if (
        selectedTransactionId &&
        !nextTransactions.some(
          (transaction) => transaction.id === Number(selectedTransactionId),
        )
      ) {
        setSelectedTransactionId("");
      }
    } catch (err) {
      console.error("Error loading transaction delete data:", err);
      setTransactions([]);
      setOrganizations([]);
      setProjects([]);
      setBudgets([]);
      setTransactionStatuses([]);
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
    setSelectedTransactionId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedTransaction) {
        setFormError("Please select a transaction to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete transaction id ${selectedTransaction.id}?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/transactions/${selectedTransaction.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Transaction was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the transaction.",
        );
        return;
      }

      const deletedId = selectedTransaction.id;

      setTransactions((prev) =>
        prev.filter((transaction) => transaction.id !== selectedTransaction.id),
      );
      setSelectedTransactionId("");
      setSuccessMessage(
        `Transaction id ${deletedId} was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete transaction error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting transaction.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${
    formError && !selectedTransactionId ? styles.inputError : ""
  }`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Transaction</h3>
            <p className={styles.pageSubtitle}>
              Select an active transaction and soft delete it.
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
                  <div className={styles.cardTitle}>Choose transaction</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/transactions/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteTransactionSelect">Transaction</label>
                  <select
                    id="deleteTransactionSelect"
                    className={inputClass}
                    value={selectedTransactionId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select transaction</option>
                    {transactions.map((transaction) => (
                      <option key={transaction.id} value={transaction.id}>
                        Id: {transaction.id} |{" "}
                        {getProjectLabel(transaction.projectId)} |{" "}
                        {getTransactionStatusLabel(
                          transaction.transactionStatusId,
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active transactions are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected transaction details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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
                      <span className={styles.detailLabel}>Project</span>
                      <span className={styles.detailValue}>
                        {getProjectLabel(selectedTransaction.projectId)}
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
                      <span className={styles.detailLabel}>Budget</span>
                      <span className={styles.detailValue}>
                        {getBudgetLabel(selectedTransaction.budgetId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Transaction status
                      </span>
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
                        {selectedTransaction.appliedForAmount ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        First share amount
                      </span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.firstShareAmount ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Approved amount
                      </span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.approvedAmount ?? "N/A"}
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
                        {selectedTransaction.secondShareAmount ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Date planned</span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.datePlanned || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>OK status</span>
                      <span className={styles.detailValue}>
                        {selectedTransaction.okStatus || "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the transaction is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a transaction to preview its details before deleting.
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
                disabled={deleting || !selectedTransaction}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete transaction"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteTransaction;
