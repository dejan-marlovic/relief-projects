import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiRefreshCw, FiAlertCircle, FiUser } from "react-icons/fi";

import styles from "./DeleteEmployee.module.scss";
import { BASE_URL } from "../../../config/api";

import { createAuthFetch, safeReadJson } from "../../../utils/http";

const DeleteEmployee = () => {
  const navigate = useNavigate();

  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedEmployee = useMemo(() => {
    const id = Number(selectedEmployeeId);
    if (!id) return null;
    return employees.find((employee) => employee.id === id) || null;
  }, [selectedEmployeeId, employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const res = await authFetch(`${BASE_URL}/api/employees/active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        const data = await safeReadJson(res);
        setEmployees([]);
        setFormError(
          data?.message || data?.detail || "Failed to load active employees.",
        );
        return;
      }

      const data = await safeReadJson(res);
      const nextEmployees = Array.isArray(data) ? data : [];

      setEmployees(nextEmployees);

      // if selected employee no longer exists in refreshed list -> clear it
      if (
        selectedEmployeeId &&
        !nextEmployees.some(
          (employee) => employee.id === Number(selectedEmployeeId),
        )
      ) {
        setSelectedEmployeeId("");
      }
    } catch (err) {
      console.error("Error loading employees:", err);
      setEmployees([]);
      setFormError(err?.message || "Unexpected error while loading employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    setSelectedEmployeeId(e.target.value);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = async () => {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!selectedEmployee) {
        setFormError("Please select an employee to delete.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete employee "${selectedEmployee.firstName} ${selectedEmployee.lastName}" (id: ${selectedEmployee.id})?`,
      );

      if (!confirmed) return;

      setDeleting(true);

      const res = await authFetch(
        `${BASE_URL}/api/employees/${selectedEmployee.id}`,
        {
          method: "DELETE",
        },
      );

      if (res.status === 404) {
        setFormError(
          "Employee was not found. It may already have been deleted.",
        );
        await loadEmployees();
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message || data?.detail || "Failed to delete the employee.",
        );
        return;
      }

      const deletedEmployeeName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;

      setEmployees((prev) =>
        prev.filter((employee) => employee.id !== selectedEmployee.id),
      );
      setSelectedEmployeeId("");
      setSuccessMessage(
        `Employee "${deletedEmployeeName}" was deleted successfully.`,
      );
    } catch (err) {
      console.error("Delete employee error:", err);
      setFormError(err?.message || "Unexpected error while deleting employee.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = `${styles.textInput} ${formError && !selectedEmployeeId ? styles.inputError : ""}`;

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Delete Employee</h3>
            <p className={styles.pageSubtitle}>
              Select an active employee and soft delete it.
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
            <FiUser />
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
                  <div className={styles.cardTitle}>Choose employee</div>
                  <div className={styles.cardMeta}>
                    Loaded from /api/employees/active
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deleteEmployeeSelect">Employee</label>
                  <select
                    id="deleteEmployeeSelect"
                    className={inputClass}
                    value={selectedEmployeeId}
                    onChange={handleSelectChange}
                    disabled={deleting}
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - id:{" "}
                        {employee.id} - position id:{" "}
                        {employee.positionId ?? "N/A"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mutedHint}>
                  Only active employees are shown in the dropdown.
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    Selected employee details
                  </div>
                  <div className={styles.cardMeta}>Review before deleting</div>
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
                        {selectedEmployee.firstName}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Last name</span>
                      <span className={styles.detailValue}>
                        {selectedEmployee.lastName}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Position id</span>
                      <span className={styles.detailValue}>
                        {selectedEmployee.positionId ?? "N/A"}
                      </span>
                    </div>

                    <div className={styles.warningBox}>
                      This calls the backend DELETE endpoint. In your current
                      backend setup, deleting an employee performs a soft delete
                      on the employee and may also soft delete linked users
                      because the employee entity uses cascade remove together
                      with <code>@SQLDelete</code>.
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Select an employee to preview its details before deleting.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadEmployees}
                className={styles.secondaryButton}
                disabled={loading || deleting}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={deleting || !selectedEmployee}
              >
                <FiTrash2 /> {deleting ? "Deleting..." : "Delete employee"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteEmployee;
