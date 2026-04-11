import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiTag } from "react-icons/fi";

import styles from "./DeleteCostType.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteCostType = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [costTypes, setCostTypes] = useState([]);
  const [selectedCostTypeId, setSelectedCostTypeId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCostType = useMemo(() => {
    const id = Number(selectedCostTypeId);
    if (!id) return null;
    return costTypes.find((costType) => costType.id === id) || null;
  }, [selectedCostTypeId, costTypes]);

  const loadCostTypes = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/cost-types/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setCostTypes([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active cost types.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextCostTypes = Array.isArray(data) ? data : [];

      setCostTypes(nextCostTypes);

      if (
        selectedCostTypeId &&
        !nextCostTypes.some(
          (costType) => costType.id === Number(selectedCostTypeId),
        )
      ) {
        setSelectedCostTypeId("");
      }
    } catch (err) {
      console.error("Error loading cost types:", err);
      setCostTypes([]);
      setFormError(
        err?.message || "Unexpected error while loading cost types.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCostTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedCostTypeId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedCostType) {
        setFormError("Please select a cost type to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete cost type "${selectedCostType.costTypeName}" (id: ${selectedCostType.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/cost-types/${selectedCostType.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Cost type was not found. It may already have been deleted.",
        );
        await loadCostTypes();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the cost type.",
        );
        return;
      }

      const deletedCostTypeName = selectedCostType.costTypeName;

      setCostTypes((prev) =>
        prev.filter((costType) => costType.id !== selectedCostType.id),
      );
      setSelectedCostTypeId("");
      setSuccessMessage(
        `Cost type "${deletedCostTypeName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete cost type error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting cost type.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedCostTypeId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Cost Type</h3>
            <p className={styles.pageSubtitle}>
              Select an active cost type and soft delete it.
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
                  <div className={styles.cardTitle}>Choose cost type</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/cost-types/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteCostTypeSelect">Cost type</label>
                  <select
                    id="deleteCostTypeSelect"
                    className={inputClass}
                    value={selectedCostTypeId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select cost type</option>
                    {costTypes.map((costType) => (
                      <option key={costType.id} value={costType.id}>
                        {costType.costTypeName} (id: {costType.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active cost types are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected cost type details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the cost type is soft deleted through
                      <code> @SQLDelete </code>
                      which updates
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a cost type to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadCostTypes}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedCostType}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete cost type"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteCostType;
