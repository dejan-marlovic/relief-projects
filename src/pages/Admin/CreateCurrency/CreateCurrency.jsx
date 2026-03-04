// src/components/Admin/CreateCurrency/CreateCurrency.jsx

//we are importing deafult react exports from "react" module + named exports: useMemo + useState
//default export + selected named exports.
import React, { useMemo, useState } from "react";
//import named export useNavigate from module "react-router-dom"
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateCurrency.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";
import { MdDescription } from "react-icons/md";

//Intial form state
const initialCurrencyDetails = {
  name: "",
  description: "",
};

// UX validation aligned with your DTO intent + DB constraints:
// - name: required (NotBlank + unique)
// - description: required (DB column is NOT NULL + unique in your schema)
const validateCurrencyDetails = (values) => {
  const errors = {};

  const name = values.name?.trim() || "";
  const description = values.description?.trim() || "";

  if (!name) errors.name = "Currency name is required (e.g. USD)";
  else if (name.length > 50) errors.name = "Name must be max 50 characters.";

  if (!description)
    errors.description = "Currency description is required (e.g. US Dollar).";
  else if (description.length > 255)
    errors.description = "Description must be max 255 charachters.";

  return errors;
};

const CreateCurrency = () => {
  const navigate = useNavigate();
  //With useMemo, React will reuse the same function unless a dependency changes.
  //Recompute the memoized value only when something in the dependency array changes.
  //factory pattern
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  //UI state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  //Form state
  const [currencyDetails, setCurrencyDetails] = useState(
    initialCurrencyDetails,
  );
  //Check if there is an error. If fieldErrors is populated for that field
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  //make input class inputError if there is an error
  //we want inputClass allways inputError is added second if we have an error
  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  //use setters to clean all states
  const resetForm = () => {
    setCurrencyDetails(initialCurrencyDetails);
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setCurrencyDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    name: values.name?.trim() ?? "",
    description: values.description?.trim() ?? "",
  });

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateCurrencyDetails(currencyDetails);

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const token = localStorage.getItem("authToken");

      if (!token) {
        // NOTE: must be "/login" (with a slash) to match your route
        navigate("/login", { replace: true });
        return;
      }

      const payload = buildPayload(currencyDetails);

      const res = await authFetch(`${BASE_URL}/api/currencies`, {
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
            "There was a problem creating the currency.",
        );
        return;
      }

      const created = await safeReadJson(res);
      // fixed typos: crrencyId -> currencyId
      const createdId =
        created?.id ?? created?.currencyId ?? created?.currency_id;

      alert(
        `Currency created successfully${createdId ? ` (id: ${createdId})` : "!"}`,
      );
      resetForm();
    } catch (err) {
      console.error("Create currency error", err);
      setFormError(err?.message || "Unexpected error while creating currency.");
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  return (
    <div>
      <h1>Hej</h1>

      {/* basic placeholders so you can test quickly */}
      {formError && (
        <div>
          <FiAlertCircle /> {formError}
        </div>
      )}

      {hasAnyFieldErrors && (
        <ul>
          {Object.entries(fieldErrors).map(([field, message]) => (
            <li key={field}>
              <strong>{field}</strong>: {message}
            </li>
          ))}
        </ul>
      )}

      <div>
        <label>
          Currency name
          <input
            className={inputClass("name")}
            name="name"
            placeholder="e.g. USD"
            value={currencyDetails.name}
            onChange={handleInputChange}
            disabled={loading}
          />
        </label>
        {hasError("name") && <div>{fieldErrors.name}</div>}
      </div>

      <div>
        <label>
          Description <MdDescription />
          <input
            className={inputClass("description")}
            name="description"
            placeholder="e.g. US Dollar"
            value={currencyDetails.description}
            onChange={handleInputChange}
            disabled={loading}
          />
        </label>
        {hasError("description") && <div>{fieldErrors.description}</div>}
      </div>

      <button type="button" onClick={handleCreate} disabled={loading}>
        <FiSave /> {loading ? "Creating..." : "Create currency"}
      </button>

      <button type="button" onClick={resetForm} disabled={loading}>
        <FiX /> Reset form
      </button>
    </div>
  );
};

export default CreateCurrency; // src/utils/http.js

/**
 * NOTE:
 * You wrote "I will add real return html later."
 * The above JSX is just a minimal working placeholder so:
 * - handleInputChange works
 * - validation + fieldErrors display works
 * - handleCreate can be tested end-to-end
 */
