import { fundingErrors } from "../../../utils/transactionFunding";
import { budgetOptionLabel } from "../../../utils/budgetDisplay";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX } from "react-icons/fi";

import styles from "../CreateUser/CreateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import { createAuthFetch, safeReadJson } from "../../../utils/http";
import ErrorBanner from "../../../components/ErrorBanner/ErrorBanner";

const initialForm = {
  organizationId: "",
  projectId: "",
  budgetId: "",
  financierOrganizationId: "",
  transactionStatusId: "",
  appliedForAmount: "",
  approvedAmount: "",
  ownContribution: "No",
  datePlanned: "",
  okStatus: "No",
};

const validate = (values) => {
  const errors = fundingErrors(values);
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
    errors.appliedForAmount = "Requested funding is required.";

  if (values.approvedAmount === "")
    errors.approvedAmount = "Approved funding is required.";

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
        appliedForAmount: String(form.appliedForAmount),
        approvedAmount: String(form.approvedAmount),
        ownContribution: form.ownContribution,
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
        if (data?.fieldErrors) setFieldErrors(data.fieldErrors);
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the transaction.",
        );
        return;
      }

      // Successful mutations are announced by the shared notification banner.
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

        <p className={styles.pageSubtitle}>Own contribution is a recorded Yes/No flag, not an amount or calculated share. Funding currency follows the selected budget.</p>
        {formError && (
          <ErrorBanner message={formError} onDismiss={() => setFormError("")} />
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
                    {budgetOptionLabel(b)}
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
              <label htmlFor="funding-appliedForAmount">Requested funding</label>
              <input
                className={inputClass("appliedForAmount")}
                type="number"
                id="funding-appliedForAmount" name="appliedForAmount" aria-invalid={Boolean(fieldErrors.appliedForAmount)} aria-describedby="funding-error-appliedForAmount" step="any" min="0"
                value={form.appliedForAmount}
                onChange={handleChange}
              />
              <span id="funding-error-appliedForAmount" className={styles.fieldError}>{fieldErrors.appliedForAmount}</span>
            </div>


            <div className={styles.formGroup}>
              <label htmlFor="funding-approvedAmount">Approved funding</label>
              <input
                className={inputClass("approvedAmount")}
                type="number"
                id="funding-approvedAmount" name="approvedAmount" aria-invalid={Boolean(fieldErrors.approvedAmount)} aria-describedby="funding-error-approvedAmount" step="any" min="0"
                value={form.approvedAmount}
                onChange={handleChange}
              />
              <span id="funding-error-approvedAmount" className={styles.fieldError}>{fieldErrors.approvedAmount}</span>
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
