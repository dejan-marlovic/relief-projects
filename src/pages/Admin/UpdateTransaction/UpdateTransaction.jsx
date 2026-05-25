import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "../UpdateUser/UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

const initialForm = {
  selectedId: "",
  organizationId: "",
  projectId: "",
  budgetId: "",
  financierOrganizationId: "",
  transactionStatusId: "",
  appliedForAmount: "",
  firstShareAmount: "",
  approvedAmount: "",
  ownContribution: "",
  secondShareAmount: "",
  datePlanned: "",
  okStatus: "",
};

const toInputDateTime = (value) => {
  if (!value) return "";
  try {
    return String(value).slice(0, 16);
  } catch {
    return "";
  }
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select a transaction.";
  if (!values.organizationId)
    errors.organizationId = "Organization is required.";
  if (!values.projectId) errors.projectId = "Project is required.";
  if (!values.budgetId) errors.budgetId = "Budget is required.";
  if (!values.financierOrganizationId) {
    errors.financierOrganizationId = "Financier organization is required.";
  }
  if (!values.transactionStatusId) {
    errors.transactionStatusId = "Transaction status is required.";
  }
  if (values.appliedForAmount === "") {
    errors.appliedForAmount = "Applied for amount is required.";
  }
  if (values.firstShareAmount === "") {
    errors.firstShareAmount = "First share amount is required.";
  }
  if (values.approvedAmount === "") {
    errors.approvedAmount = "Approved amount is required.";
  }
  if (!values.ownContribution) {
    errors.ownContribution = "Own contribution is required.";
  }
  if (values.secondShareAmount === "") {
    errors.secondShareAmount = "Second share amount is required.";
  }
  if (!values.datePlanned) {
    errors.datePlanned = "Date planned is required.";
  }
  if (!values.okStatus) {
    errors.okStatus = "OK status is required.";
  }

  return errors;
};

const UpdateTransaction = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [transactions, setTransactions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedTransaction = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return transactions.find((item) => item.id === id) || null;
  }, [form.selectedId, transactions]);

  const organizationLabelById = useMemo(() => {
    return organizations.reduce((acc, item) => {
      acc[item.id] = item.organizationName || `Organization #${item.id}`;
      return acc;
    }, {});
  }, [organizations]);

  const projectLabelById = useMemo(() => {
    return projects.reduce((acc, item) => {
      acc[item.id] = item.projectName || `Project #${item.id}`;
      return acc;
    }, {});
  }, [projects]);

  const statusLabelById = useMemo(() => {
    return statuses.reduce((acc, item) => {
      acc[item.id] = item.transactionStatusName || `Status #${item.id}`;
      return acc;
    }, {});
  }, [statuses]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const budgetsForSelectedProject = useMemo(() => {
    if (!form.projectId) return budgets;
    return budgets.filter((item) => item.projectId === Number(form.projectId));
  }, [budgets, form.projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [txRes, orgRes, projectRes, budgetRes, statusRes] =
        await Promise.all([
          authFetch(`${BASE_URL}/api/transactions/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/organizations/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/projects/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/budgets/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/transaction-statuses/active`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

      const txData = await safeReadJson(txRes);
      const orgData = await safeReadJson(orgRes);
      const projectData = await safeReadJson(projectRes);
      const budgetData = await safeReadJson(budgetRes);
      const statusData = await safeReadJson(statusRes);

      setTransactions(Array.isArray(txData) ? txData : []);
      setOrganizations(Array.isArray(orgData) ? orgData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setBudgets(Array.isArray(budgetData) ? budgetData : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
    } catch (err) {
      console.error("Load transactions error:", err);
      setTransactions([]);
      setOrganizations([]);
      setProjects([]);
      setBudgets([]);
      setStatuses([]);
      setFormError(
        err?.message || "Unexpected error while loading transaction data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    if (!selectedId) {
      setForm(initialForm);
      return;
    }

    const selected = transactions.find(
      (item) => item.id === Number(selectedId),
    );

    setForm({
      selectedId,
      organizationId: selected?.organizationId
        ? String(selected.organizationId)
        : "",
      projectId: selected?.projectId ? String(selected.projectId) : "",
      budgetId: selected?.budgetId ? String(selected.budgetId) : "",
      financierOrganizationId: selected?.financierOrganizationId
        ? String(selected.financierOrganizationId)
        : "",
      transactionStatusId: selected?.transactionStatusId
        ? String(selected.transactionStatusId)
        : "",
      appliedForAmount:
        selected?.appliedForAmount !== undefined &&
        selected?.appliedForAmount !== null
          ? String(selected.appliedForAmount)
          : "",
      firstShareAmount:
        selected?.firstShareAmount !== undefined &&
        selected?.firstShareAmount !== null
          ? String(selected.firstShareAmount)
          : "",
      approvedAmount:
        selected?.approvedAmount !== undefined &&
        selected?.approvedAmount !== null
          ? String(selected.approvedAmount)
          : "",
      ownContribution: selected?.ownContribution || "",
      secondShareAmount:
        selected?.secondShareAmount !== undefined &&
        selected?.secondShareAmount !== null
          ? String(selected.secondShareAmount)
          : "",
      datePlanned: toInputDateTime(selected?.datePlanned),
      okStatus: selected?.okStatus || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "projectId" ? { budgetId: "" } : {}),
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedTransaction) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedTransaction.id),
      organizationId: selectedTransaction.organizationId
        ? String(selectedTransaction.organizationId)
        : "",
      projectId: selectedTransaction.projectId
        ? String(selectedTransaction.projectId)
        : "",
      budgetId: selectedTransaction.budgetId
        ? String(selectedTransaction.budgetId)
        : "",
      financierOrganizationId: selectedTransaction.financierOrganizationId
        ? String(selectedTransaction.financierOrganizationId)
        : "",
      transactionStatusId: selectedTransaction.transactionStatusId
        ? String(selectedTransaction.transactionStatusId)
        : "",
      appliedForAmount:
        selectedTransaction.appliedForAmount !== undefined &&
        selectedTransaction.appliedForAmount !== null
          ? String(selectedTransaction.appliedForAmount)
          : "",
      firstShareAmount:
        selectedTransaction.firstShareAmount !== undefined &&
        selectedTransaction.firstShareAmount !== null
          ? String(selectedTransaction.firstShareAmount)
          : "",
      approvedAmount:
        selectedTransaction.approvedAmount !== undefined &&
        selectedTransaction.approvedAmount !== null
          ? String(selectedTransaction.approvedAmount)
          : "",
      ownContribution: selectedTransaction.ownContribution || "",
      secondShareAmount:
        selectedTransaction.secondShareAmount !== undefined &&
        selectedTransaction.secondShareAmount !== null
          ? String(selectedTransaction.secondShareAmount)
          : "",
      datePlanned: toInputDateTime(selectedTransaction.datePlanned),
      okStatus: selectedTransaction.okStatus || "",
    });

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    try {
      setFormError("");
      setSuccessMessage("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setSaving(true);

      const payload = {
        organizationId: Number(form.organizationId),
        projectId: Number(form.projectId),
        budgetId: Number(form.budgetId),
        financierOrganizationId: Number(form.financierOrganizationId),
        transactionStatusId: Number(form.transactionStatusId),
        appliedForAmount: Number(form.appliedForAmount),
        firstShareAmount: Number(form.firstShareAmount),
        approvedAmount: Number(form.approvedAmount),
        ownContribution: form.ownContribution,
        secondShareAmount: Number(form.secondShareAmount),
        datePlanned: form.datePlanned,
        okStatus: form.okStatus,
      };

      const res = await authFetch(
        `${BASE_URL}/api/transactions/${Number(form.selectedId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await safeReadJson(res);

      if (!res.ok) {
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem updating the transaction.",
        );
        return;
      }

      setTransactions((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? { ...item, ...payload, id: item.id }
            : item,
        ),
      );

      setSuccessMessage("Transaction updated successfully.");
    } catch (err) {
      console.error("Update transaction error:", err);
      setFormError(
        err?.message || "Unexpected error while updating transaction.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Transaction</h3>
            <p className={styles.pageSubtitle}>
              Select an active transaction and update it.
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
                  <div className={styles.cardTitle}>Choose transaction</div>
                  <div className={styles.cardMeta}>
                    Active transactions only
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Transaction</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select transaction</option>
                    {transactions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {projectLabelById[item.projectId] ||
                          `Project #${item.projectId}`}{" "}
                        -{" "}
                        {statusLabelById[item.transactionStatusId] ||
                          `Status #${item.transactionStatusId}`}{" "}
                        (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Relations and amounts</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Organization</label>
                  <select
                    className={inputClass("organizationId")}
                    name="organizationId"
                    value={form.organizationId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {organizationLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Project</label>
                  <select
                    className={inputClass("projectId")}
                    name="projectId"
                    value={form.projectId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select project</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {projectLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Budget</label>
                  <select
                    className={inputClass("budgetId")}
                    name="budgetId"
                    value={form.budgetId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select budget</option>
                    {budgetsForSelectedProject.map((item) => (
                      <option key={item.id} value={item.id}>
                        {projectLabelById[item.projectId] ||
                          `Project #${item.projectId}`}{" "}
                        - total: {item.totalAmount} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Financier organization</label>
                  <select
                    className={inputClass("financierOrganizationId")}
                    name="financierOrganizationId"
                    value={form.financierOrganizationId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {organizationLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Transaction status</label>
                  <select
                    className={inputClass("transactionStatusId")}
                    name="transactionStatusId"
                    value={form.transactionStatusId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select status</option>
                    {statuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {statusLabelById[item.id]} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Applied for amount</label>
                  <input
                    className={inputClass("appliedForAmount")}
                    type="number"
                    name="appliedForAmount"
                    value={form.appliedForAmount}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>First share amount</label>
                  <input
                    className={inputClass("firstShareAmount")}
                    type="number"
                    step="0.01"
                    name="firstShareAmount"
                    value={form.firstShareAmount}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Approved amount</label>
                  <input
                    className={inputClass("approvedAmount")}
                    type="number"
                    name="approvedAmount"
                    value={form.approvedAmount}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Own contribution</label>
                  <select
                    className={inputClass("ownContribution")}
                    name="ownContribution"
                    value={form.ownContribution}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Second share amount</label>
                  <input
                    className={inputClass("secondShareAmount")}
                    type="number"
                    step="0.01"
                    name="secondShareAmount"
                    value={form.secondShareAmount}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Date planned</label>
                  <input
                    className={inputClass("datePlanned")}
                    type="datetime-local"
                    name="datePlanned"
                    value={form.datePlanned}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>OK status</label>
                  <select
                    className={inputClass("okStatus")}
                    name="okStatus"
                    value={form.okStatus}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || saving}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={resetForm}
                className={styles.secondaryButton}
                disabled={saving}
              >
                <FiRefreshCw /> Reset form
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className={styles.saveButton}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Update transaction"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateTransaction;
