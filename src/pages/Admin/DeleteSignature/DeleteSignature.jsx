import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "./DeleteSignature.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteSignature = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [signatures, setSignatures] = useState([]);
  const [signatureStatuses, setSignatureStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const signatureStatusNameById = useMemo(() => {
    return signatureStatuses.reduce((acc, status) => {
      acc[status.id] = status.name;
      return acc;
    }, {});
  }, [signatureStatuses]);

  const employeeNameById = useMemo(() => {
    return employees.reduce((acc, employee) => {
      acc[employee.id] = `${employee.firstName} ${employee.lastName}`;
      return acc;
    }, {});
  }, [employees]);

  const paymentOrderLabelById = useMemo(() => {
    return paymentOrders.reduce((acc, order) => {
      acc[order.id] = order.paymentOrderDescription
        ? `${order.paymentOrderDescription} (id: ${order.id})`
        : `Payment Order #${order.id}`;
      return acc;
    }, {});
  }, [paymentOrders]);

  const selectedSignature = useMemo(() => {
    const id = Number(selectedSignatureId);
    if (!id) return null;
    return signatures.find((signature) => signature.id === id) || null;
  }, [selectedSignatureId, signatures]);

  const getSignatureStatusLabel = (signatureStatusId) => {
    if (!signatureStatusId) return "N/A";
    return (
      signatureStatusNameById[signatureStatusId] ||
      `Signature status id: ${signatureStatusId}`
    );
  };

  const getEmployeeLabel = (employeeId) => {
    if (!employeeId) return "N/A";
    return employeeNameById[employeeId] || `Employee id: ${employeeId}`;
  };

  const getPaymentOrderLabel = (paymentOrderId) => {
    if (!paymentOrderId) return "N/A";
    return (
      paymentOrderLabelById[paymentOrderId] ||
      `Payment order id: ${paymentOrderId}`
    );
  };

  const loadSignatures = async () => {
    const res = await authFetch(`${BASE_URL}/api/signatures/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active signatures.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadSignatureStatuses = async () => {
    const res = await authFetch(`${BASE_URL}/api/signature-statuses/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message ||
          data?.detail ||
          "Failed to load active signature statuses.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadEmployees = async () => {
    const res = await authFetch(`${BASE_URL}/api/employees/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message || data?.detail || "Failed to load active employees.",
      );
    }

    const data = await safeReadJson(res);
    return Array.isArray(data) ? data : [];
  };

  const loadPaymentOrders = async () => {
    const res = await authFetch(`${BASE_URL}/api/payment-orders/active`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok && res.status !== 204) {
      const data = await safeReadJson(res);
      throw new Error(
        data?.message ||
          data?.detail ||
          "Failed to load active payment orders.",
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
        nextSignatures,
        nextSignatureStatuses,
        nextEmployees,
        nextPaymentOrders,
      ] = await Promise.all([
        loadSignatures(),
        loadSignatureStatuses(),
        loadEmployees(),
        loadPaymentOrders(),
      ]);

      setSignatures(nextSignatures);
      setSignatureStatuses(nextSignatureStatuses);
      setEmployees(nextEmployees);
      setPaymentOrders(nextPaymentOrders);

      if (
        selectedSignatureId &&
        !nextSignatures.some(
          (signature) => signature.id === Number(selectedSignatureId),
        )
      ) {
        setSelectedSignatureId("");
      }
    } catch (err) {
      console.error("Error loading signature delete data:", err);
      setSignatures([]);
      setSignatureStatuses([]);
      setEmployees([]);
      setPaymentOrders([]);
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
    setSelectedSignatureId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedSignature) {
        setFormError("Please select a signature to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete signature "${selectedSignature.signature}" (id: ${selectedSignature.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/signatures/${selectedSignature.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Signature was not found. It may already have been deleted.",
        );
        await loadData();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the signature.",
        );
        return;
      }

      const deletedLabel = selectedSignature.signature;

      setSignatures((prev) =>
        prev.filter((signature) => signature.id !== selectedSignature.id),
      );
      setSelectedSignatureId("");
      setSuccessMessage(
        `Signature "${deletedLabel}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete signature error:", err);
      setFormError(
        err?.message || "Unexpected error while deleting signature.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${
    formError && !selectedSignatureId ? styles.inputError : ""
  }`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Signature</h3>
            <p className={styles.pageSubtitle}>
              Select an active signature and soft delete it.
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
                  <div className={styles.cardTitle}>Choose signature</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/signatures/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteSignatureSelect">Signature</label>
                  <select
                    id="deleteSignatureSelect"
                    className={inputClass}
                    value={selectedSignatureId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select signature</option>
                    {signatures.map((signature) => (
                      <option key={signature.id} value={signature.id}>
                        {signature.signature} |{" "}
                        {getSignatureStatusLabel(signature.signatureStatusId)} |
                        Id: {signature.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active signatures are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected signature details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
                </div>

                {selectedSignature ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedSignature.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        Signature status
                      </span>
                      <span className={styles.detailValue}>
                        {getSignatureStatusLabel(
                          selectedSignature.signatureStatusId,
                        )}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Employee</span>
                      <span className={styles.detailValue}>
                        {getEmployeeLabel(selectedSignature.employeeId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Payment order</span>
                      <span className={styles.detailValue}>
                        {getPaymentOrderLabel(selectedSignature.paymentOrderId)}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Signature text</span>
                      <span className={styles.detailValue}>
                        {selectedSignature.signature || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Signature date</span>
                      <span className={styles.detailValue}>
                        {selectedSignature.signatureDate || "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, the signature is soft deleted by setting
                      <code> is_deleted = true </code>
                      and
                      <code> deleted_at = NOW()</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a signature to preview its details before deleting.
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
                disabled={deleting || !selectedSignature}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete signature"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteSignature;
