import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiRotateCcw, FiRefreshCw, FiAlertCircle, FiTag } from "react-icons/fi";

import styles from "./RestoreCostType.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreCostType = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedCostTypes, setDeletedCostTypes] = useState([]);
  const [selectedCostTypeId, setSelectedCostTypeId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCostType = useMemo(() => {
    const id = Number(selectedCostTypeId);
    if (!id) return null;

    return deletedCostTypes.find((costType) => costType.id === id) || null;
  }, [selectedCostTypeId, deletedCostTypes]);

  const loadDeletedCostTypes = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/cost-types/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedCostTypes([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted cost types. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextCostTypes = Array.isArray(data) ? data : [];

      setDeletedCostTypes(nextCostTypes);

      if (
        selectedCostTypeId &&
        !nextCostTypes.some(
          (costType) => costType.id === Number(selectedCostTypeId),
        )
      ) {
        setSelectedCostTypeId("");
      }
    } catch (err) {
      console.error("Error loading deleted cost types:", err);
      setDeletedCostTypes([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted cost types. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedCostTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedCostType) {
        setFormError("Please select a deleted cost type to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/cost-types/${selectedCostType.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the cost type. Backend support may be missing.",
        );
        return;
      }

      setDeletedCostTypes((prev) =>
        prev.filter((costType) => costType.id !== selectedCostType.id),
      );

      setSuccessMessage(
        `Cost type "${selectedCostType.costTypeName}" restored successfully.`,
      );
      setSelectedCostTypeId("");
    } catch (err) {
      console.error("Restore cost type error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring cost type. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Cost Type</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted cost type and restore it.
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
                  <div className={styles.cardTitle}>
                    Choose deleted cost type
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreCostTypeSelect">
                    Deleted cost type
                  </label>

                  <select
                    id="restoreCostTypeSelect"
                    className={styles.textInput}
                    value={selectedCostTypeId}
                    onChange={(e) => {
                      setSelectedCostTypeId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted cost type</option>

                    {deletedCostTypes.map((costType) => (
                      <option key={costType.id} value={costType.id}>
                        {costType.costTypeName} - id: {costType.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/cost-types/deleted </code>
                  and
                  <code> PUT /api/cost-types/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected cost type details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedCostType ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedCostType.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Cost type name</span>
                      <span className={styles.detailValue}>
                        {selectedCostType.costTypeName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted cost type to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedCostTypes}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedCostType}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore cost type"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreCostType;
