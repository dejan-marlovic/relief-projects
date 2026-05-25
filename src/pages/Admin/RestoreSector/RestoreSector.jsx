import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiGrid,
} from "react-icons/fi";

import styles from "./RestoreSector.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreSector = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedSectors, setDeletedSectors] = useState([]);
  const [selectedSectorId, setSelectedSectorId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSector = useMemo(() => {
    const id = Number(selectedSectorId);
    if (!id) return null;

    return deletedSectors.find((sector) => sector.id === id) || null;
  }, [selectedSectorId, deletedSectors]);

  const loadDeletedSectors = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/sectors/deleted`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setDeletedSectors([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted sectors. Backend support may be missing.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextSectors = Array.isArray(data) ? data : [];

      setDeletedSectors(nextSectors);

      if (
        selectedSectorId &&
        !nextSectors.some((sector) => sector.id === Number(selectedSectorId))
      ) {
        setSelectedSectorId("");
      }
    } catch (err) {
      console.error("Error loading deleted sectors:", err);
      setDeletedSectors([]);
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted sectors. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedSector) {
        setFormError("Please select a deleted sector to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/sectors/${selectedSector.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the sector. Backend support may be missing.",
        );
        return;
      }

      setDeletedSectors((prev) =>
        prev.filter((sector) => sector.id !== selectedSector.id),
      );

      setSuccessMessage(
        `Sector "${selectedSector.sectorCode}" restored successfully.`,
      );
      setSelectedSectorId("");
    } catch (err) {
      console.error("Restore sector error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring sector. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Sector</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted sector and restore it.
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
            <FiGrid />
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
                  <div className={styles.cardTitle}>Choose deleted sector</div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreSectorSelect">Deleted sector</label>

                  <select
                    id="restoreSectorSelect"
                    className={styles.textInput}
                    value={selectedSectorId}
                    onChange={(e) => {
                      setSelectedSectorId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted sector</option>

                    {deletedSectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.sectorCode} - {sector.sectorDescription}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/sectors/deleted </code>
                  and
                  <code> PUT /api/sectors/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected sector details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedSector ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedSector.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Sector code</span>
                      <span className={styles.detailValue}>
                        {selectedSector.sectorCode}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Sector description
                      </span>
                      <span className={styles.detailValue}>
                        {selectedSector.sectorDescription}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted sector to preview details before restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedSectors}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedSector}
              >
                <FiRotateCcw /> {restoring ? "Restoring..." : "Restore sector"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreSector;
