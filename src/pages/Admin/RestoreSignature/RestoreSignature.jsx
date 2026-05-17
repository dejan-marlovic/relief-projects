import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiEdit3,
} from "react-icons/fi";

import styles from "./RestoreSignature.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreSignature = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedSignatures, setDeletedSignatures] = useState([]);
  const [signatureStatusesById, setSignatureStatusesById] = useState({});
  const [employeesById, setEmployeesById] = useState({});
  const [paymentOrdersById, setPaymentOrdersById] = useState({});

  const [selectedSignatureId, setSelectedSignatureId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSignature = useMemo(() => {
    const id = Number(selectedSignatureId);
    if (!id) return null;

    return deletedSignatures.find((signature) => signature.id === id) || null;
  }, [selectedSignatureId, deletedSignatures]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    return String(value).replace("T", " ");
  };

  const getSignatureStatusLabel = (signatureStatusId) => {
    if (!signatureStatusId) return "N/A";

    const status = signatureStatusesById[signatureStatusId];

    if (!status) {
      return `Signature status id: ${signatureStatusId}`;
    }

    return status.name || `Signature status id: ${signatureStatusId}`;
  };

  const getEmployeeLabel = (employeeId) => {
    if (!employeeId) return "N/A";

    const employee = employeesById[employeeId];

    if (!employee) {
      return `Employee id: ${employeeId}`;
    }

    const firstName = employee.firstName || "";
    const lastName = employee.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return `${fullName} - id: ${employeeId}`;
    }

    if (employee.name) {
      return `${employee.name} - id: ${employeeId}`;
    }

    if (employee.email) {
      return `${employee.email} - id: ${employeeId}`;
    }

    return `Employee id: ${employeeId}`;
  };

  const getPaymentOrderLabel = (paymentOrderId) => {
    if (!paymentOrderId) return "N/A";

    const paymentOrder = paymentOrdersById[paymentOrderId];

    if (!paymentOrder) {
      return `Payment order id: ${paymentOrderId}`;
    }

    if (paymentOrder.paymentOrderNumber) {
      return `${paymentOrder.paymentOrderNumber} - id: ${paymentOrderId}`;
    }

    if (paymentOrder.poNumber) {
      return `${paymentOrder.poNumber} - id: ${paymentOrderId}`;
    }

    if (paymentOrder.referenceNumber) {
      return `${paymentOrder.referenceNumber} - id: ${paymentOrderId}`;
    }

    return `Payment order id: ${paymentOrderId}`;
  };

  const getSignatureLabel = (signature) => {
    return `${signature.signature} | ${getSignatureStatusLabel(
      signature.signatureStatusId,
    )} | ${getEmployeeLabel(signature.employeeId)} | ${formatDate(
      signature.signatureDate,
    )}`;
  };

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const loadDeletedSignatures = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [
        signaturesRes,
        signatureStatusesRes,
        employeesRes,
        paymentOrdersRes,
      ] = await Promise.all([
        authFetch(`${BASE_URL}/api/signatures/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/signature-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/employees/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/payment-orders/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!signaturesRes.ok && signaturesRes.status !== 204) {
        const data = await safeReadJson(signaturesRes);
        setDeletedSignatures([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted signatures. Backend support may be missing.",
        );
        return;
      }

      const signaturesData = await safeReadJson(signaturesRes);
      const nextSignatures = Array.isArray(signaturesData)
        ? signaturesData
        : [];

      let nextSignatureStatusesById = {};
      let nextEmployeesById = {};
      let nextPaymentOrdersById = {};

      if (signatureStatusesRes.ok || signatureStatusesRes.status === 204) {
        const signatureStatusesData = await safeReadJson(signatureStatusesRes);
        const nextSignatureStatuses = Array.isArray(signatureStatusesData)
          ? signatureStatusesData
          : [];
        nextSignatureStatusesById = buildLookupById(nextSignatureStatuses);
      }

      if (employeesRes.ok || employeesRes.status === 204) {
        const employeesData = await safeReadJson(employeesRes);
        const nextEmployees = Array.isArray(employeesData) ? employeesData : [];
        nextEmployeesById = buildLookupById(nextEmployees);
      }

      if (paymentOrdersRes.ok || paymentOrdersRes.status === 204) {
        const paymentOrdersData = await safeReadJson(paymentOrdersRes);
        const nextPaymentOrders = Array.isArray(paymentOrdersData)
          ? paymentOrdersData
          : [];
        nextPaymentOrdersById = buildLookupById(nextPaymentOrders);
      }

      setDeletedSignatures(nextSignatures);
      setSignatureStatusesById(nextSignatureStatusesById);
      setEmployeesById(nextEmployeesById);
      setPaymentOrdersById(nextPaymentOrdersById);

      if (
        selectedSignatureId &&
        !nextSignatures.some(
          (signature) => signature.id === Number(selectedSignatureId),
        )
      ) {
        setSelectedSignatureId("");
      }
    } catch (err) {
      console.error("Error loading deleted signatures:", err);
      setDeletedSignatures([]);
      setSignatureStatusesById({});
      setEmployeesById({});
      setPaymentOrdersById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted signatures. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedSignatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedSignature) {
        setFormError("Please select a deleted signature to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/signatures/${selectedSignature.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the signature. Backend support may be missing.",
        );
        return;
      }

      setDeletedSignatures((prev) =>
        prev.filter((signature) => signature.id !== selectedSignature.id),
      );

      setSuccessMessage(
        `Signature "${selectedSignature.signature}" restored successfully.`,
      );
      setSelectedSignatureId("");
    } catch (err) {
      console.error("Restore signature error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring signature. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Signature</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted signature and restore it.
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
                    Choose deleted signature
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreSignatureSelect">
                    Deleted signature
                  </label>

                  <select
                    id="restoreSignatureSelect"
                    className={styles.textInput}
                    value={selectedSignatureId}
                    onChange={(e) => {
                      setSelectedSignatureId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted signature</option>

                    {deletedSignatures.map((signature) => (
                      <option key={signature.id} value={signature.id}>
                        {getSignatureLabel(signature)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/signatures/deleted </code>,
                  <code> GET /api/signature-statuses/active </code>,
                  <code> GET /api/employees/active </code>,
                  <code> GET /api/payment-orders/active </code>
                  and
                  <code> PUT /api/signatures/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected signature details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
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
                      <span className={styles.detailLabel}>Signature</span>
                      <span className={styles.detailValue}>
                        {selectedSignature.signature}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Status</span>
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
                      <span className={styles.detailLabel}>Signature date</span>
                      <span className={styles.detailValue}>
                        {formatDate(selectedSignature.signatureDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted signature to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedSignatures}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedSignature}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore signature"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreSignature;
