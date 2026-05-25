import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";

import styles from "./RestoreCost.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreCost = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedCosts, setDeletedCosts] = useState([]);
  const [costTypesById, setCostTypesById] = useState({});
  const [selectedCostId, setSelectedCostId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCost = useMemo(() => {
    const id = Number(selectedCostId);
    if (!id) return null;

    return deletedCosts.find((cost) => cost.id === id) || null;
  }, [selectedCostId, deletedCosts]);

  const getCostTypeLabel = (costTypeId) => {
    if (!costTypeId) return "N/A";

    const costType = costTypesById[costTypeId];

    if (!costType) {
      return `Cost type id: ${costTypeId}`;
    }

    return costType.costTypeName;
  };

  const getCostLabel = (cost) => {
    return `${cost.costName} | type: ${getCostTypeLabel(cost.costTypeId)}`;
  };

  const loadDeletedCosts = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [costsRes, costTypesRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/costs/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/cost-types/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!costsRes.ok && costsRes.status !== 204) {
        const data = await safeReadJson(costsRes);
        setDeletedCosts([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted costs. Backend support may be missing.",
        );
        return;
      }

      if (!costTypesRes.ok && costTypesRes.status !== 204) {
        const data = await safeReadJson(costTypesRes);
        setCostTypesById({});
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load cost types for display names.",
        );
        return;
      }

      const costsData = await safeReadJson(costsRes);
      const costTypesData = await safeReadJson(costTypesRes);

      const nextCosts = Array.isArray(costsData) ? costsData : [];
      const nextCostTypes = Array.isArray(costTypesData) ? costTypesData : [];

      const nextCostTypesById = nextCostTypes.reduce((acc, costType) => {
        acc[costType.id] = costType;
        return acc;
      }, {});

      setDeletedCosts(nextCosts);
      setCostTypesById(nextCostTypesById);

      if (
        selectedCostId &&
        !nextCosts.some((cost) => cost.id === Number(selectedCostId))
      ) {
        setSelectedCostId("");
      }
    } catch (err) {
      console.error("Error loading deleted costs:", err);
      setDeletedCosts([]);
      setCostTypesById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted costs. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedCosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedCost) {
        setFormError("Please select a deleted cost to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/costs/${selectedCost.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the cost. Backend support may be missing.",
        );
        return;
      }

      setDeletedCosts((prev) =>
        prev.filter((cost) => cost.id !== selectedCost.id),
      );

      setSuccessMessage(
        `Cost "${selectedCost.costName}" restored successfully.`,
      );
      setSelectedCostId("");
    } catch (err) {
      console.error("Restore cost error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring cost. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Cost</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted cost and restore it.
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
                  <div className={styles.cardTitle}>Choose deleted cost</div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreCostSelect">Deleted cost</label>

                  <select
                    id="restoreCostSelect"
                    className={styles.textInput}
                    value={selectedCostId}
                    onChange={(e) => {
                      setSelectedCostId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted cost</option>

                    {deletedCosts.map((cost) => (
                      <option key={cost.id} value={cost.id}>
                        {getCostLabel(cost)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/costs/deleted </code>,
                  <code> GET /api/cost-types/active </code>
                  and
                  <code> PUT /api/costs/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Selected cost details</div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted cost to preview details before restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedCosts}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedCost}
              >
                <FiRotateCcw /> {restoring ? "Restoring..." : "Restore cost"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreCost;
