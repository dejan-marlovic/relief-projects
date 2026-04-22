import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

const initialForm = {
  organizationId: "",
  projectId: "",
  budgetId: "",
  financierOrganizationId: "",
  transactionStatusId: "",
  appliedForAmount: "",
  firstShareAmount: "",
  approvedAmount: "",
  ownContribution: "No",
  secondShareAmount: "",
  datePlanned: "",
  okStatus: "No",
};

const validate = (values) => {
  const errors = {};
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
  if (values.appliedForAmount === "")
    errors.appliedForAmount = "Applied for amount is required.";
  if (values.firstShareAmount === "")
    errors.firstShareAmount = "First share amount is required.";
  if (values.approvedAmount === "")
    errors.approvedAmount = "Approved amount is required.";
  if (values.secondShareAmount === "")
    errors.secondShareAmount = "Second share amount is required.";
  if (!values.datePlanned) errors.datePlanned = "Date planned is required.";
  return errors;
};

const CreateTransaction = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactionStatuses, setTransactionStatuses] = useState([]);

  const filteredBudgets = useMemo(() => {
    if (!form.projectId) return budgets;
    return budgets.filter(
      (b) => Number(b.projectId) === Number(form.projectId),
    );
  }, [budgets, form.projectId]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingLists(true);

        const [orgRes, projectRes, budgetRes, statusRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/organizations/active`),
          authFetch(`${BASE_URL}/api/projects/active`),
          authFetch(`${BASE_URL}/api/budgets/active`),
          authFetch(`${BASE_URL}/api/transaction-statuses/active`),
        ]);

        const [orgData, projectData, budgetData, statusData] =
          await Promise.all([
            safeReadJson(orgRes),
            safeReadJson(projectRes),
            safeReadJson(budgetRes),
            safeReadJson(statusRes),
          ]);

        setOrganizations(Array.isArray(orgData) ? orgData : []);
        setProjects(Array.isArray(projectData) ? projectData : []);
        setBudgets(Array.isArray(budgetData) ? budgetData : []);
        setTransactionStatuses(Array.isArray(statusData) ? statusData : []);
      } catch (err) {
        console.error("Error loading transaction form data:", err);
        setFormError("Failed to load related data.");
      } finally {
        setLoadingLists(false);
      }
    };

    loadData();
  }, [authFetch]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "projectId") {
        next.budgetId = "";
      }

      return next;
    });

    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const resetForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setFormError("");
  };

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const payload = {
        organizationId: Number(form.organizationId),
        projectId: Number(form.projectId),
        budgetId: Number(form.budgetId),
        financierOrganizationId: Number(form.financierOrganizationId),
        transactionStatusId: Number(form.transactionStatusId),
        appliedForAmount: Number(form.appliedForAmount),
        firstShareAmount: form.firstShareAmount,
        approvedAmount: Number(form.approvedAmount),
        ownContribution: form.ownContribution,
        secondShareAmount: form.secondShareAmount,
        datePlanned: form.datePlanned,
        okStatus: form.okStatus,
      };

      const res = await authFetch(`${BASE_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson(res);

      if (!res.ok) {
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the transaction.",
        );
        return;
      }

      alert(
        `Transaction created successfully${data?.id ? ` (id: ${data.id})` : ""}!`,
      );
      resetForm();
    } catch (err) {
      console.error("Create transaction error:", err);
      setFormError(
        err?.message || "Unexpected error while creating transaction.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingLists) {
    return (
      <div className={styles.createContainer}>
        <div className={styles.formContainer}>
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Transaction</h3>
            <p className={styles.pageSubtitle}>
              Create a transaction linked to project, budget and organizations.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Relations</div>
              <div className={styles.cardMeta}>Required links</div>
            </div>

            <div className={styles.formGroup}>
              <label>Organization</label>
              <select
                className={inputClass("organizationId")}
                name="organizationId"
                value={form.organizationId}
                onChange={handleChange}
              >
                <option value="">Select organization</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.organizationName} (id: {o.id})
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
                onChange={handleChange}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} (id: {p.id})
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
                onChange={handleChange}
              >
                <option value="">Select budget</option>
                {filteredBudgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    Budget #{b.id}
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
                onChange={handleChange}
              >
                <option value="">Select financier organization</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.organizationName} (id: {o.id})
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
                onChange={handleChange}
              >
                <option value="">Select transaction status</option>
                {transactionStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.transactionStatusName} (id: {s.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Amounts and statuses</div>
              <div className={styles.cardMeta}>Main transaction data</div>
            </div>

            <div className={styles.formGroup}>
              <label>Applied for amount</label>
              <input
                className={inputClass("appliedForAmount")}
                type="number"
                name="appliedForAmount"
                value={form.appliedForAmount}
                onChange={handleChange}
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
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Approved amount</label>
              <input
                className={inputClass("approvedAmount")}
                type="number"
                name="approvedAmount"
                value={form.approvedAmount}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Own contribution</label>
              <select
                className={inputClass("ownContribution")}
                name="ownContribution"
                value={form.ownContribution}
                onChange={handleChange}
              >
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
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Date planned</label>
              <input
                className={inputClass("datePlanned")}
                type="datetime-local"
                name="datePlanned"
                value={form.datePlanned}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>OK status</label>
              <select
                className={inputClass("okStatus")}
                name="okStatus"
                value={form.okStatus}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={handleCreate}
            className={styles.saveButton}
            disabled={loading}
          >
            <FiSave /> Create transaction
          </button>

          <button
            type="button"
            onClick={resetForm}
            className={styles.deleteButton}
            disabled={loading}
          >
            <FiX /> Reset form
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTransaction;
