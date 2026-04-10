import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiBriefcase,
} from "react-icons/fi";

import styles from "./DeletePosition.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeletePosition = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedPosition = useMemo(() => {
    const id = Number(selectedPositionId);
    if (!id) return null;
    return positions.find((position) => position.id === id) || null;
  }, [selectedPositionId, positions]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/positions/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setPositions([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active positions.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextPositions = Array.isArray(data) ? data : [];

      setPositions(nextPositions);

      // if selected position no longer exists in refreshed list -> clear it
      if (
        selectedPositionId &&
        !nextPositions.some(
          (position) => position.id === Number(selectedPositionId),
        )
      ) {
        setSelectedPositionId("");
      }
    } catch (err) {
      console.error("Error loading positions:", err);
      setPositions([]);
      setFormError(err?.message || "Unexpected error while loading positions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedPositionId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedPosition) {
        setFormError("Please select a position to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete position "${selectedPosition.positionName}" (id: ${selectedPosition.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/positions/${selectedPosition.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Position was not found. It may already have been deleted.",
        );
        await loadPositions();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the position.",
        );
        return;
      }

      const deletedPositionName = selectedPosition.positionName;

      setPositions((prev) =>
        prev.filter((position) => position.id !== selectedPosition.id),
      );
      setSelectedPositionId("");
      setSuccessMessage(
        `Position "${deletedPositionName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete position error:", err);
      setFormError(err?.message || "Unexpected error while deleting position.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedPositionId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Position</h3>
            <p className={styles.pageSubtitle}>
              Select an active position and soft delete it.
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
            <FiBriefcase />
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
                  <div className={styles.cardTitle}>Choose position</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/positions/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deletePositionSelect">Position</label>
                  <select
                    id="deletePositionSelect"
                    className={inputClass}
                    value={selectedPositionId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select position</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.positionName} (id: {position.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active positions are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected position details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedPosition ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedPosition.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Position name</span>
                      <span className={styles.detailValue}>
                        {selectedPosition.positionName}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint, which in your
                      current service/controller setup performs a soft delete by
                      setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a position to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadPositions}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedPosition}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete position"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeletePosition;
