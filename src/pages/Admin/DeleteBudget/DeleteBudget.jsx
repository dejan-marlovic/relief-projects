import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";

import styles from "./DeleteBudget.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteBudget = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const projectNameById = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = project.projectName;
      return acc;
    }, {});
  }, [projects]);

  const currencyNameById = useMemo(() => {
    return currencies.reduce((acc, currency) => {
      acc[currency.id] = currency.name;
      return acc;
    }, {});
  }, [currencies]);

  const selectedBudget = useMemo(() => {
    const id = Number(selectedBudgetId);
    if (!id) return null;
    return budgets.find((budget) => budget.id === id) || null;
  }, [selectedBudgetId, budgets]);

  const getProjectLabel = (projectId) => {
    if (!projectId) return "N/A";
    return projectNameById[projectId] || `Project id: ${projectId}`;
  };

  const getCurrencyLabel = (currencyId) => {
    if (!currencyId) return "N/A";
    return currencyNameById[currencyId] || `Currency id: ${currencyId}`;
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

  const loadProjects = async () => {
    const res = await authFetch(`${BASE_URL}/api/projects/ids-names`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load project names.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadCurrencies = async () => {
    const res = await authFetch(`${BASE_URL}/api/currencies/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load currencies.",
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

      const [nextBudgets, nextProjects, nextCurrencies] = await Promise.all([
        loadBudgets(),
        loadProjects(),
        loadCurrencies(),
      ]);

      setBudgets(nextBudgets);
      setProjects(nextProjects);
      setCurrencies(nextCurrencies);

      if (
        selectedBudgetId &&
        !nextBudgets.some((budget) => budget.id === Number(selectedBudgetId))
      ) {
        setSelectedBudgetId("");
      }
    } catch (err) {
      console.error("Error loading budget delete data:", err);
      setBudgets([]);
      setProjects([]);
      setCurrencies([]);
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
    setSelectedBudgetId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedBudget) {
        setFormError("Please select a budget to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete budget "${selectedBudget.budgetDescription || "Untitled budget"}" (id: ${selectedBudget.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/budgets/${selectedBudget.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError("Budget was not found. It may already have been deleted.");
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the budget.",
        );
        return;
      }

      const deletedBudgetLabel =
        selectedBudget.budgetDescription || `Budget #${selectedBudget.id}`;

      setBudgets((prev) =>
        prev.filter((budget) => budget.id !== selectedBudget.id),
      );
      setSelectedBudgetId("");
      setSuccessMessage(
        `Budget "${deletedBudgetLabel}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete budget error:", err);
      setFormError(err?.message || "Unexpected error while deleting budget.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedBudgetId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Budget</h3>
            <p className={styles.pageSubtitle}>
              Select an active budget and soft delete it.
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
            <FiDollarSign />
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
                  <div className={styles.cardTitle}>Choose budget</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/budgets/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteBudgetSelect">Budget</label>
                  <select
                    id="deleteBudgetSelect"
                    className={inputClass}
                    value={selectedBudgetId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select budget</option>
                    {budgets.map((budget) => (
                      <option key={budget.id} value={budget.id}>
                        {getProjectLabel(budget.projectId)} | Total:{" "}
                        {budget.totalAmount} | Id: {budget.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active budgets are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected budget details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedBudget ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedBudget.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Project</span>
                      <span className={styles.detailValue}>
                        {getProjectLabel(selectedBudget.projectId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Description</span>
                      <span className={styles.detailValue}>
                        {selectedBudget.budgetDescription || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Preparation date
                      </span>
                      <span className={styles.detailValue}>
                        {selectedBudget.budgetPreparationDate || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Total amount</span>
                      <span className={styles.detailValue}>
                        {selectedBudget.totalAmount}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Local currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(selectedBudget.localCurrencyId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>GBP currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(selectedBudget.localCurrencyToGbpId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>SEK currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(
                          selectedBudget.reportingCurrencySekId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>EUR currency</span>
                      <span className={styles.detailValue}>
                        {getCurrencyLabel(
                          selectedBudget.reportingCurrencyEurId,
                        )}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the budget is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>. Related active
                      <code> CostDetail </code>
                      rows for that budget are also soft deleted.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a budget to preview its details before deleting.
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
                disabled={deleting || !selectedBudget}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete budget"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteBudget;
