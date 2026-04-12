import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiGrid } from "react-icons/fi";

import styles from "./DeleteSector.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteSector = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [sectors, setSectors] = useState([]);
  const [selectedSectorId, setSelectedSectorId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSector = useMemo(() => {
    const id = Number(selectedSectorId);
    if (!id) return null;
    return sectors.find((sector) => sector.id === id) || null;
  }, [selectedSectorId, sectors]);

  const loadSectors = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/sectors/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setSectors([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active sectors.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextSectors = Array.isArray(data) ? data : [];

      setSectors(nextSectors);

      if (
        selectedSectorId &&
        !nextSectors.some((sector) => sector.id === Number(selectedSectorId))
      ) {
        setSelectedSectorId("");
      }
    } catch (err) {
      console.error("Error loading sectors:", err);
      setSectors([]);
      setFormError(err?.message || "Unexpected error while loading sectors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedSectorId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedSector) {
        setFormError("Please select a sector to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete sector "${selectedSector.sectorCode} - ${selectedSector.sectorDescription}" (id: ${selectedSector.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/sectors/${selectedSector.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError("Sector was not found. It may already have been deleted.");
        await loadSectors();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the sector.",
        );
        return;
      }

      const deletedSectorLabel = `${selectedSector.sectorCode} - ${selectedSector.sectorDescription}`;

      setSectors((prev) =>
        prev.filter((sector) => sector.id !== selectedSector.id),
      );
      setSelectedSectorId("");
      setSuccessMessage(
        `Sector "${deletedSectorLabel}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete sector error:", err);
      setFormError(err?.message || "Unexpected error while deleting sector.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedSectorId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Sector</h3>
            <p className={styles.pageSubtitle}>
              Select an active sector and soft delete it.
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
                  <div className={styles.cardTitle}>Choose sector</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/sectors/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteSectorSelect">Sector</label>
                  <select
                    id="deleteSectorSelect"
                    className={inputClass}
                    value={selectedSectorId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select sector</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.sectorCode} - {sector.sectorDescription} (id:{" "}
                        {sector.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active sectors are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected sector details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the sector is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a sector to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadSectors}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedSector}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete sector"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteSector;
