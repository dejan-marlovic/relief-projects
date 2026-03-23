// src/components/Admin/CreateTransactionStatus/CreateTransactionStatus.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateTransactionStatus.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

//never changed we copy it into state tranasctionStatusDetails once.
const intialTransactionStatusDetails = {
  transactionStatusName: "",
};

const validateTransactionStatusDetails = (values) => {
  const errors = {};

  //we are checking if name is populated inside the object
  // NOTE: trim() (not tim())
  const name = values.transactionStatusName?.trim() || "";

  if (!name) {
    errors.transactionStatusName =
      "Transaction status name is required (e.g. Payment made)";
  } else if (name.length > 255) {
    // entity column length is typically 255 in your other "name" columns
    errors.transactionStatusName = "Name must be max 255 characters.";
  }

  return errors;
};

const CreateTransactionStatus = () => {
  const navigate = useNavigate();
  //we save the authFetch call and create new only if useNavigate changes
  // NOTE: useMemo needs a function that returns the value
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  //UI states
  const [loading, setLoading] = useState(false);
  //top form-error message so the intial state is only empty string
  const [formError, setFormError] = useState("");
  //error for each field stored as an object. Intial state empty object
  const [fieldErrors, setFieldErrors] = useState({});

  //Form state
  const [transactionStatusDetails, setTransactionStatusDetails] = useState(
    intialTransactionStatusDetails,
  );

  //check if name is populated in fieldErrors
  const hasError = (name) => Boolean(fieldErrors?.[name]);

  // Same approach as other Create pages: base input + optional error class
  const inputClass = (name) =>
    `${styles.textInput} ${hasError(name) ? styles.inputError : ""}`;

  const resetForm = () => {
    setTransactionStatusDetails(intialTransactionStatusDetails);
    //set main form error
    setFormError("");
    setFieldErrors({});
  };

  //receives e, which is the event object React gives you when an input changes.
  //For <input onChange={handleInputChange} />, React passes a “change event”.
  const handleInputChange = (e) => {
    //  //Object destructuring
    const { name, value } = e.target;
    //we are using the functional state update form
    setTransactionStatusDetails((prev) => ({ ...prev, [name]: value }));
    //clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  //“extra parentheses” are there because of a JavaScript syntax rule
  //In an arrow function, { ... } is normally treated as a function body block, not an object.
  //If we want the arrow function to return an object literal directly, we must wrap the object in parentheses (...).
  const buildPayload = (values) => ({
    transactionStatusName: values.transactionStatusName?.trim() ?? "",
  });

  //we want handleCreate to be able to use await
  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateTransactionStatusDetails(transactionStatusDetails);
      if (Object.keys(errors).length > 0) {
        // NOTE: fieldErrors should be the per-field map, formError should be the main message
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        /*
        If we don’t return, the function would continue and still try to send 
        the API request with invalid data. That would:

        waste a network call

        potentially create confusing errors (server-side errors on top of client-side errors)

        maybe even create partial/invalid records if server rules differ
        */
        return;
      }
      /*
      Why do we set setLoading(true)?

      setLoading(true) is used to put the UI into a “submission in progress” state while the async request runs.

      It helps in a few important ways:

      Prevents double-submits

      Without loading, a user can click “Create” multiple times quickly.

      That can create duplicates or multiple API calls.

      Typically your button has:

      <button disabled={loading}>...</button>
      */

      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const payload = buildPayload(transactionStatusDetails);

      // NOTE: must await authFetch
      const res = await authFetch(`${BASE_URL}/api/transaction-statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await safeReadJson(res);

        // NOTE: extractFieldErrors expects the parsed error body
        const fe = extractFieldErrors(data);
        //updating current fieldErrors state with new field erros from this call
        if (fe) setFieldErrors(fe);
        //update top form error with current message
        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem creating new transaction status.",
        );
        return;
      }

      const created = await safeReadJson(res);

      const createdId =
        created?.id ??
        created?.transactionStatusId ??
        created?.transaction_status_id;

      alert(
        `New transaction status created successfully${
          createdId ? ` (id: ${createdId})` : "!"
        }`,
      );

      resetForm();
    } catch (err) {
      console.error("Create transaction status error ", err);
      setFormError(
        err?.message || "Unexpected while creating new transaction status.",
      );
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
            <h3 className={styles.pageTitle}>Create Transaction Status</h3>
            <p className={styles.pageSubtitle}>
              Add a status used to classify transactions (e.g. Payment made,
              Pending, Cancelled).
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

        {loading ? (
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
                  <div className={styles.cardTitle}>Status details</div>
                  <div className={styles.cardMeta}>Required field</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Status name</label>
                  <input
                    className={inputClass("transactionStatusName")}
                    name="transactionStatusName"
                    placeholder="e.g. Payment made"
                    value={transactionStatusDetails.transactionStatusName}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {fieldErrors.transactionStatusName && (
                    <div className={styles.fieldError}>
                      {fieldErrors.transactionStatusName}
                    </div>
                  )}
                </div>

                <div className={styles.mutedHint}>
                  Tip: keep names consistent so reporting stays clean.
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>How this is used</div>
                  <div className={styles.cardMeta}>Transactions</div>
                </div>

                <div className={styles.mutedHint}>
                  Transaction statuses are master data used for:
                  <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                    <li>Filtering and dashboards (e.g. show all “Pending”).</li>
                    <li>
                      Workflow progress tracking (initiated → approved → paid).
                    </li>
                    <li>Grouping reports and exports by status.</li>
                  </ul>
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
                <FiSave /> Create transaction status
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

export default CreateTransactionStatus;
