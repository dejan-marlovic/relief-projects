// src/components/Admin/CreateCost/CreateCost.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateCost.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Initial form state
const initialCostDetails = {
  costName: "",
  costTypeId: "",
};

// UX validation aligned with your DTO intent + entity constraints:
// - costName: required (NotNull + NotBlank), max 255
// - costTypeId: required (NotNull)
const validateCostDetails = (values) => {
  const errors = {};

  const name = values.costName?.trim() || "";
  if (!name) errors.costName = "Cost name is required (e.g. Rent, Fuel).";
  else if (name.length > 255)
    errors.costName = "Cost name must be max 255 characters.";

  if (!values.costTypeId) errors.costTypeId = "Cost type is required.";

  return errors;
};

const CreateCost = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingCostTypes, setLoadingCostTypes] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Dropdown data
  const [costTypes, setCostTypes] = useState([]);

  // Form state
  const [costDetails, setCostDetails] = useState(initialCostDetails);

  const hasError = (name) => Boolean(fieldErrors?.[name]);
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setCostDetails(initialCostDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setCostDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    costName: values.costName?.trim() ?? "",
    costTypeId: values.costTypeId ? Number(values.costTypeId) : null,
  });

  // Load cost types for dropdowns from your CostType API: GET /api/cost-types/active
  const loadCostTypes = async () => {
    try {
      setLoadingCostTypes(true);
      setFormError("");

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const res = await authFetch(`${BASE_URL}/api/cost-types/active`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // Controller returns 204 when empty
      if (res.status === 204) {
        setCostTypes([]);
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Could not load cost types (needed for cost creation).",
        );
        setCostTypes([]);
        return;
      }

      const data = await safeReadJson(res);
      const list = Array.isArray(data) ? data : [];

      // Sort by name for nicer UX
      list.sort((a, b) =>
        String(a?.costTypeName || "").localeCompare(
          String(b?.costTypeName || ""),
        ),
      );

      setCostTypes(list);

      // Optional UX: if only 1 cost type exists, auto-select it
      if (list.length === 1 && !costDetails.costTypeId) {
        setCostDetails((prev) => ({
          ...prev,
          costTypeId: String(list[0]?.id ?? ""),
        }));
      }
    } catch (err) {
      console.error("Load cost types error:", err);
      setCostTypes([]);
      setFormError(
        err?.message || "Unexpected error while loading cost types.",
      );
    } finally {
      setLoadingCostTypes(false);
    }
  };

  useEffect(() => {
    loadCostTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateCostDetails(costDetails);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const payload = buildPayload(costDetails);

      const res = await authFetch(`${BASE_URL}/api/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeReadJson(res);

        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating the cost.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId = created?.id ?? created?.costId ?? created?.cost_id;

      alert(
        `Cost created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );

      resetForm();
    } catch (err) {
      console.error("Create cost error:", err);
      setFormError(err?.message || "Unexpected error while creating cost.");
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Cost</h3>
            <p className={styles.pageSubtitle}>
              Create a cost item (one level below Cost Types), e.g.{" "}
              <strong>Rent</strong>, <strong>Fuel</strong>,{" "}
              <strong>Salaries</strong>.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {hasAnyFieldErrors && (
          <div className={styles.errorList}>
            <ul>
              {Object.entries(fieldErrors).map(([field, message]) => (
                <li key={field}>
                  <strong>{field}</strong>: {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading || loadingCostTypes ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {/* Card 1 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Cost details</div>
                  <div className={styles.cardMeta}>Required fields</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Cost name</label>
                  <input
                    className={inputClass("costName")}
                    name="costName"
                    placeholder="e.g. Rent"
                    value={costDetails.costName}
                    onChange={handleInputChange}
                    autoComplete="off"
                    disabled={loading}
                  />
                  {fieldErrors.costName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.costName}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Cost type</label>
                  <select
                    className={inputClass("costTypeId")}
                    name="costTypeId"
                    value={costDetails.costTypeId}
                    onChange={handleInputChange}
                    disabled={loading || costTypes.length === 0}
                  >
                    <option value="">Select cost type...</option>
                    {costTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.costTypeName} (id: {ct.id})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.costTypeId && (
                    <div className={styles.fieldError}>
                      {fieldErrors.costTypeId}
                    </div>
                  )}
                </div>

                {costTypes.length === 0 && (
                  <div className={styles.mutedHint}>
                    No cost types found. Create cost types first (Admin → Cost
                    Type).
                  </div>
                )}

                <div className={styles.mutedHint}>
                  Tip: keep cost names consistent (e.g. “Rent” vs “Office rent”)
                  so reporting stays clean.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>How this is used</div>
                  <div className={styles.cardMeta}>Budgets + cost details</div>
                </div>

                <div className={styles.mutedHint}>
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>
                      Costs are the <strong>specific items</strong> you select
                      when entering budget lines or cost details (e.g. “Fuel”,
                      “Rent”).
                    </li>
                    <li>
                      Every Cost belongs to a <strong>Cost Type</strong> (e.g.
                      Direct Cost / Indirect Cost) which is used for grouping.
                    </li>
                    <li>
                      Costs will be available when creating{" "}
                      <strong>Budgets</strong> and also used for
                      grouping/reporting in <strong>Cost Details</strong>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={handleCreate}
                className={styles.saveButton}
                disabled={loading || costTypes.length === 0}
                title={costTypes.length === 0 ? "Create cost types first." : ""}
              >
                <FiSave /> Create cost
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
          </>
        )}
      </div>
    </div>
  );
};

export default CreateCost;
