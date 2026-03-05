// src/components/Admin/CreateExchangeRate/CreateExchangeRate.jsx

//we are importing deafult react exports from "react" module + named exports: useEffect + useMemo + useState
//default export + selected named exports.
import React, { useEffect, useMemo, useState } from "react";
//import named export useNavigate from module "react-router-dom"
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiAlertCircle } from "react-icons/fi";

import styles from "./CreateExchangeRate.module.scss";
import { BASE_URL } from "../../../config/api";

import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

// Intial form state
const initialExchangeRateDetails = {
  baseCurrencyId: "",
  quoteCurrencyId: "",
  rate: "",
  // keep as datetime-local string: "YYYY-MM-DDTHH:mm"
  rateDate: "",
};

// Helpers
const pad2 = (n) => String(n).padStart(2, "0");

// Default to "now" (local) formatted for <input type="datetime-local" />
const nowAsDatetimeLocal = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

// Convert datetime-local => LocalDateTime string "YYYY-MM-DDTHH:mm:ss"
const toLocalDateTimeSeconds = (dtLocal) => {
  if (!dtLocal) return null;
  // dtLocal is "YYYY-MM-DDTHH:mm" (no seconds)
  return `${dtLocal}:00`;
};

// UX validation aligned with your DTO intent + DB constraints:
// - baseCurrencyId: required
// - quoteCurrencyId: required
// - rate: required
// - base != quote
// - rate should be > 0
const validateExchangeRateDetails = (values) => {
  const errors = {};

  const base = values.baseCurrencyId;
  const quote = values.quoteCurrencyId;

  const rateRaw = String(values.rate ?? "").trim();
  const rateNum = rateRaw === "" ? NaN : Number(rateRaw);

  if (!base) errors.baseCurrencyId = "Base currency is required.";
  if (!quote) errors.quoteCurrencyId = "Quote currency is required.";

  if (base && quote && String(base) === String(quote)) {
    errors.quoteCurrencyId = "Base and quote currency must be different.";
  }

  if (!rateRaw) errors.rate = "Exchange rate is required (e.g. 10.5321).";
  else if (!Number.isFinite(rateNum))
    errors.rate = "Rate must be a valid number.";
  else if (rateNum <= 0) errors.rate = "Rate must be greater than 0.";

  // rateDate: required here so uniqueness is predictable + avoid server/JPA defaults issues
  if (!values.rateDate)
    errors.rateDate = "Rate date is required (auto-filled).";

  return errors;
};

const CreateExchangeRate = () => {
  const navigate = useNavigate();
  //With useMemo, React will reuse the same function unless a dependency changes.
  //Recompute the memoized value only when something in the dependency array changes.
  //factory pattern
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  //UI state
  const [loading, setLoading] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Currencies (from Currencies table via Currency API)
  const [currencies, setCurrencies] = useState([]);

  //Form state
  const [exchangeRateDetails, setExchangeRateDetails] = useState(() => ({
    ...initialExchangeRateDetails,
    rateDate: nowAsDatetimeLocal(),
  }));

  //Check if there is an error. If fieldErrors is populated for that field
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  //make input class inputError if there is an error
  //we want inputClass allways inputError is added second if we have an error
  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  //use setters to clean all states
  const resetForm = () => {
    setExchangeRateDetails({
      ...initialExchangeRateDetails,
      rateDate: nowAsDatetimeLocal(),
    });
    setFormError("");
    setFieldErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setExchangeRateDetails((prev) => ({ ...prev, [name]: value }));

    // Clear per-field error as user edits
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const buildPayload = (values) => ({
    baseCurrencyId: values.baseCurrencyId
      ? Number(values.baseCurrencyId)
      : null,
    quoteCurrencyId: values.quoteCurrencyId
      ? Number(values.quoteCurrencyId)
      : null,
    // DTO expects BigDecimal -> send JSON number (works fine in Spring)
    rate: String(values.rate ?? "").trim() === "" ? null : Number(values.rate),
    // Send LocalDateTime style (no timezone)
    rateDate: toLocalDateTimeSeconds(values.rateDate),
  });

  // Format currency label: "USD — US Dollar"
  const currencyLabel = (c) => {
    const name = c?.name ?? "";
    const desc = c?.description ?? "";
    return desc ? `${name} — ${desc}` : name;
  };

  // Load currencies for dropdowns from your Currency API: GET /api/currencies/active
  const loadCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      setFormError("");

      const token = localStorage.getItem("authToken");
      if (!token) {
        // NOTE: must be "/login" (with a slash) to match your route
        navigate("/login", { replace: true });
        return;
      }

      const res = await authFetch(`${BASE_URL}/api/currencies/active`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // Controller returns 204 when empty
      if (res.status === 204) {
        setCurrencies([]);
        return;
      }

      if (!res.ok) {
        const data = await safeReadJson(res);
        setFormError(
          data?.message ||
            data?.detail ||
            "Could not load currencies (needed for exchange rate form).",
        );
        return;
      }

      const data = await safeReadJson(res);
      const list = Array.isArray(data) ? data : [];

      // Sort by currency code/name for nicer UX (USD, EUR, SEK...)
      list.sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || "")),
      );

      setCurrencies(list);
    } catch (err) {
      console.error("Load currencies error", err);
      setFormError(
        err?.message || "Unexpected error while loading currencies.",
      );
    } finally {
      setLoadingCurrencies(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validateExchangeRateDetails(exchangeRateDetails);

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

      const payload = buildPayload(exchangeRateDetails);

      const res = await authFetch(`${BASE_URL}/api/exchange-rates`, {
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
            "There was a problem creating the exchange rate.",
        );
        return;
      }

      const created = await safeReadJson(res);
      const createdId =
        created?.id ?? created?.exchangeRateId ?? created?.exchange_rate_id;

      alert(
        `Exchange rate created successfully${
          createdId ? ` (id: ${createdId})` : "!"
        }`,
      );
      resetForm();
    } catch (err) {
      console.error("Create exchange rate error", err);
      setFormError(
        err?.message || "Unexpected error while creating the exchange rate.",
      );
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  const baseId = exchangeRateDetails.baseCurrencyId;
  const quoteId = exchangeRateDetails.quoteCurrencyId;

  return (
    <div className={styles.createContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Create Exchange Rate</h3>
            <p className={styles.pageSubtitle}>
              Add an exchange rate (base + quote + rate + date).
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

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Exchange rate details</div>
              <div className={styles.cardMeta}>
                {loadingCurrencies
                  ? "Loading currencies..."
                  : "Required fields"}
              </div>
            </div>

            {/* Two columns: LEFT = base+quote, RIGHT = rate+rateDate */}
            <div className={styles.twoColumnForm}>
              {/* LEFT COLUMN */}
              <div className={styles.column}>
                <div className={styles.formGroup}>
                  <label>Base currency</label>
                  <select
                    className={inputClass("baseCurrencyId")}
                    name="baseCurrencyId"
                    value={baseId}
                    onChange={handleInputChange}
                    disabled={loading || loadingCurrencies}
                  >
                    <option value="">Select base currency...</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {currencyLabel(c)}
                      </option>
                    ))}
                  </select>
                  {hasError("baseCurrencyId") && (
                    <div className={styles.fieldError}>
                      {fieldErrors.baseCurrencyId}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Quote currency</label>
                  <select
                    className={inputClass("quoteCurrencyId")}
                    name="quoteCurrencyId"
                    value={quoteId}
                    onChange={handleInputChange}
                    disabled={loading || loadingCurrencies}
                  >
                    <option value="">Select quote currency...</option>
                    {currencies.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        // UX: prevent selecting same currency (still validated server-side too)
                        disabled={
                          String(baseId) === String(c.id) && Boolean(baseId)
                        }
                      >
                        {currencyLabel(c)}
                      </option>
                    ))}
                  </select>
                  {hasError("quoteCurrencyId") && (
                    <div className={styles.fieldError}>
                      {fieldErrors.quoteCurrencyId}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className={styles.column}>
                <div className={styles.formGroup}>
                  <label>Rate</label>
                  <input
                    className={inputClass("rate")}
                    name="rate"
                    placeholder="e.g. 10.5321"
                    value={exchangeRateDetails.rate}
                    onChange={handleInputChange}
                    disabled={loading}
                    inputMode="decimal"
                  />
                  {hasError("rate") && (
                    <div className={styles.fieldError}>{fieldErrors.rate}</div>
                  )}
                  <div className={styles.mutedHint}>
                    Meaning: <strong>1</strong> unit of base currency equals{" "}
                    <strong>rate</strong> units of quote currency.
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Rate date</label>
                  <input
                    className={inputClass("rateDate")}
                    type="datetime-local"
                    name="rateDate"
                    value={exchangeRateDetails.rateDate}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  {hasError("rateDate") && (
                    <div className={styles.fieldError}>
                      {fieldErrors.rateDate}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.mutedHint}>
              Note: your DB unique constraint is{" "}
              <strong>(base_currency_id, quote_currency_id, rate_date)</strong>.
            </div>

            {currencies.length === 0 && !loadingCurrencies && (
              <div className={styles.mutedHint}>
                No currencies found. Create currencies first (Admin → Currency).
              </div>
            )}
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={handleCreate}
            className={styles.saveButton}
            disabled={loading || loadingCurrencies || currencies.length === 0}
            title={currencies.length === 0 ? "Create currencies first." : ""}
          >
            <FiSave /> {loading ? "Creating..." : "Create exchange rate"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className={styles.deleteButton}
            disabled={loading || loadingCurrencies}
          >
            <FiX /> Reset form
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateExchangeRate;
