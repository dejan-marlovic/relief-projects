import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "./DeleteSignatureStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteSignatureStatus = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [signatureStatuses, setSignatureStatuses] = useState([]);
  const [selectedSignatureStatusId, setSelectedSignatureStatusId] =
    useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSignatureStatus = useMemo(() => {
    const id = Number(selectedSignatureStatusId);
    if (!id) return null;
    return signatureStatuses.find((status) => status.id === id) || null;
  }, [selectedSignatureStatusId, signatureStatuses]);

  const loadSignatureStatuses = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/signature-statuses/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setSignatureStatuses([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load active signature statuses.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextSignatureStatuses = Array.isArray(data) ? data : [];

      setSignatureStatuses(nextSignatureStatuses);

      if (
        selectedSignatureStatusId &&
        !nextSignatureStatuses.some(
          (status) => status.id === Number(selectedSignatureStatusId),
        )
      ) {
        setSelectedSignatureStatusId("");
      }
    } catch (err) {
      console.error("Error loading signature statuses:", err);
      setSignatureStatuses([]);
      setFormError(
        err?.message || "Unexpected error while loading signature statuses.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignatureStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedSignatureStatusId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedSignatureStatus) {
        setFormError("Please select a signature status to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete signature status "${selectedSignatureStatus.name}" (id: ${selectedSignatureStatus.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/signature-statuses/${selectedSignatureStatus.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Signature status was not found. It may already have been deleted.",
        );
        await loadSignatureStatuses();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to delete the signature status.",
        );
        return;
      }

      const deletedStatusName = selectedSignatureStatus.name;

      setSignatureStatuses((prev) =>
        prev.filter((status) => status.id !== selectedSignatureStatus.id),
      );
      setSelectedSignatureStatusId("");
      setSuccessMessage(
        `Signature status "${deletedStatusName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete signature status error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting signature status.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${
    formError && !selectedSignatureStatusId ? styles.inputError : ""
  }`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Signature Status</h3>
            <p className={styles.pageSubtitle}>
              Select an active signature status and soft delete it.
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
            <FiEdit3 />
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
                    Choose signature status
                  </div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/signature-statuses/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteSignatureStatusSelect">
                    Signature status
                  </label>
                  <select
                    id="deleteSignatureStatusSelect"
                    className={inputClass}
                    value={selectedSignatureStatusId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select signature status</option>
                    {signatureStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name} (id: {status.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active signature statuses are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected signature status details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedSignatureStatus ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedSignatureStatus.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Signature status name
                      </span>
                      <span className={styles.detailValue}>
                        {selectedSignatureStatus.name}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the signature status is soft deleted by
                      setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a signature status to preview its details before
                    deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadSignatureStatuses}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedSignatureStatus}
              >
                <FiTrash2 />{" "}
                {deleting ? "Deleting..." : "Delete signature status"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteSignatureStatus;
