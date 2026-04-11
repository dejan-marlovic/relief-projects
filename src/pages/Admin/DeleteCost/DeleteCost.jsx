import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiTag } from "react-icons/fi";

import styles from "./DeleteCost.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteCost = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [costs, setCosts] = useState([]);
  const [costTypes, setCostTypes] = useState([]);
  const [selectedCostId, setSelectedCostId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const costTypeNameById = useMemo(() => {
    return costTypes.reduce((acc, costType) => {
      acc[costType.id] = costType.costTypeName;
      return acc;
    }, {});
  }, [costTypes]);

  const selectedCost = useMemo(() => {
    const id = Number(selectedCostId);
    if (!id) return null;
    return costs.find((cost) => cost.id === id) || null;
  }, [selectedCostId, costs]);

  const getCostTypeLabel = (costTypeId) => {
    if (!costTypeId) return "N/A";
    return costTypeNameById[costTypeId] || `Cost type id: ${costTypeId}`;
  };

  const loadCostTypes = async () => {
    const res = await authFetch(`${BASE_URL}/api/cost-types/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active cost types.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadCosts = async () => {
    const res = await authFetch(`${BASE_URL}/api/costs/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active costs.",
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

      const [nextCostTypes, nextCosts] = await Promise.all([
        loadCostTypes(),
        loadCosts(),
      ]);

      setCostTypes(nextCostTypes);
      setCosts(nextCosts);

      if (
        selectedCostId &&
        !nextCosts.some((cost) => cost.id === Number(selectedCostId))
      ) {
        setSelectedCostId("");
      }
    } catch (err) {
      console.error("Error loading cost delete data:", err);
      setCostTypes([]);
      setCosts([]);
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
    setSelectedCostId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedCost) {
        setFormError("Please select a cost to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete cost "${selectedCost.costName}" (id: ${selectedCost.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(`${BASE_URL}/api/costs/${selectedCost.id}`, {
        method: "DELETE",
      });

      if (res.status === 404) {
        setFormError("Cost was not found. It may already have been deleted.");
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the cost.",
        );
        return;
      }

      const deletedCostName = selectedCost.costName;

      setCosts((prev) => prev.filter((cost) => cost.id !== selectedCost.id));
      setSelectedCostId("");
      setSuccessMessage(`Cost "${deletedCostName}" was deleted successfully.`);
    } catch (err) {
      console.error("Delete cost error:", err);
      setFormError(err?.message || "Unexpected error while deleting cost.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedCostId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Cost</h3>
            <p className={styles.pageSubtitle}>
              Select an active cost and soft delete it.
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
            <FiTag />
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
                  <div className={styles.cardTitle}>Choose cost</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/costs/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteCostSelect">Cost</label>
                  <select
                    id="deleteCostSelect"
                    className={inputClass}
                    value={selectedCostId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select cost</option>
                    {costs.map((cost) => (
                      <option key={cost.id} value={cost.id}>
                        {cost.costName} | Type:{" "}
                        {getCostTypeLabel(cost.costTypeId)} | Id: {cost.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active costs are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Selected cost details</div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedCost ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedCost.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Cost name</span>
                      <span className={styles.detailValue}>
                        {selectedCost.costName}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Cost type</span>
                      <span className={styles.detailValue}>
                        {getCostTypeLabel(selectedCost.costTypeId)}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the cost is soft deleted through
                      <code> @SQLDelete </code>
                      which updates
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a cost to preview its details before deleting.
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
                disabled={deleting || !selectedCost}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete cost"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteCost;
