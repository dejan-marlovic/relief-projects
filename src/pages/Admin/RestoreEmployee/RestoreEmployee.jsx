import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRotateCcw,
  FiRefreshCw,
  FiAlertCircle,
  FiUserCheck,
} from "react-icons/fi";

import styles from "./RestoreEmployee.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const RestoreEmployee = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [deletedEmployees, setDeletedEmployees] = useState([]);
  const [positionsById, setPositionsById] = useState({});

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedEmployee = useMemo(() => {
    const id = Number(selectedEmployeeId);
    if (!id) return null;

    return deletedEmployees.find((employee) => employee.id === id) || null;
  }, [selectedEmployeeId, deletedEmployees]);

  const buildLookupById = (items) => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  };

  const getPositionLabel = (positionId) => {
    if (!positionId) return "N/A";

    const position = positionsById[positionId];

    if (!position) {
      return `Position id: ${positionId}`;
    }

    return position.positionName || `Position id: ${positionId}`;
  };

  const getEmployeeName = (employee) => {
    if (!employee) return "N/A";

    const fullName = `${employee.firstName || ""} ${
      employee.lastName || ""
    }`.trim();

    return fullName || `Employee id: ${employee.id}`;
  };

  const getEmployeeLabel = (employee) => {
    if (!employee) return "N/A";

    return `${getEmployeeName(employee)} | ${getPositionLabel(
      employee.positionId,
    )}`;
  };

  const loadDeletedEmployees = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [employeesRes, positionsRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/employees/deleted`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/positions/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!employeesRes.ok && employeesRes.status !== 204) {
        const data = await safeReadJson(employeesRes);
        setDeletedEmployees([]);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to load deleted employees. Backend support may be missing.",
        );
        return;
      }

      const employeesData = await safeReadJson(employeesRes);
      const nextEmployees = Array.isArray(employeesData) ? employeesData : [];

      let nextPositionsById = {};

      if (positionsRes.ok || positionsRes.status === 204) {
        const positionsData = await safeReadJson(positionsRes);
        const nextPositions = Array.isArray(positionsData) ? positionsData : [];
        nextPositionsById = buildLookupById(nextPositions);
      }

      setDeletedEmployees(nextEmployees);
      setPositionsById(nextPositionsById);

      if (
        selectedEmployeeId &&
        !nextEmployees.some(
          (employee) => employee.id === Number(selectedEmployeeId),
        )
      ) {
        setSelectedEmployeeId("");
      }
    } catch (err) {
      console.error("Error loading deleted employees:", err);
      setDeletedEmployees([]);
      setPositionsById({});
      setFormError(
        err?.message ||
          "Unexpected error while loading deleted employees. Backend support may be missing.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedEmployee) {
        setFormError("Please select a deleted employee to restore.");
        return;
      }

      setRestoring(true);

      const res = await authFetch(
        `${BASE_URL}/api/employees/${selectedEmployee.id}/restore`,
        {
          method: "PUT",
        },
      );

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Failed to restore the employee. Backend support may be missing.",
        );
        return;
      }

      setDeletedEmployees((prev) =>
        prev.filter((employee) => employee.id !== selectedEmployee.id),
      );

      setSuccessMessage(
        `Employee "${getEmployeeName(selectedEmployee)}" restored successfully.`,
      );
      setSelectedEmployeeId("");
    } catch (err) {
      console.error("Restore employee error:", err);
      setFormError(
        err?.message ||
          "Unexpected error while restoring employee. Backend support may be missing.",
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
            <h3 className={styles.pageTitle}>Restore Employee</h3>
            <p className={styles.pageSubtitle}>
              Select a deleted employee and restore it.
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
            <FiUserCheck />
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
                    Choose deleted employee
                  </div>
                  <div className={styles.cardMeta}>
                    Requires backend support
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="restoreEmployeeSelect">
                    Deleted employee
                  </label>

                  <select
                    id="restoreEmployeeSelect"
                    className={styles.textInput}
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      setSelectedEmployeeId(e.target.value);
                      setFormError("");
                      setSuccessMessage("");
                    }}
                    disabled={restoring}
                  >
                    <option value="">Select deleted employee</option>

                    {deletedEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {getEmployeeLabel(employee)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  This screen needs endpoints like:
                  <code> GET /api/employees/deleted </code>,
                  <code> GET /api/positions/active </code>
                  and
                  <code> PUT /api/employees/{`{id}`}/restore</code>.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected employee details
                  </div>
                  <div className={styles.cardMeta}>Review before restore</div>
                </div>

                {selectedEmployee ? (
                  <div className={styles.detailList}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Id</span>
                      <span className={styles.detailValue}>
                        {selectedEmployee.id}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>First name</span>
                      <span className={styles.detailValue}>
                        {selectedEmployee.firstName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Last name</span>
                      <span className={styles.detailValue}>
                        {selectedEmployee.lastName || "N/A"}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Position</span>
                      <span className={styles.detailValue}>
                        {getPositionLabel(selectedEmployee.positionId)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select a deleted employee to preview details before
                    restoring.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadDeletedEmployees}
                className={styles.secondaryButton}
                disabled={loading || restoring}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleRestore}
                className={styles.restoreButton}
                disabled={restoring || !selectedEmployee}
              >
                <FiRotateCcw />{" "}
                {restoring ? "Restoring..." : "Restore employee"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestoreEmployee;
