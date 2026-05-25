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
  baseCurrencyId: "",
  quoteCurrencyId: "",
  rate: "",
};

const validate = (values) => {
  const errors = {};
  if (!values.selectedId) errors.selectedId = "Please select an exchange rate.";
  if (!values.baseCurrencyId)
    errors.baseCurrencyId = "Base currency is required.";
  if (!values.quoteCurrencyId)
    errors.quoteCurrencyId = "Quote currency is required.";
  if (!values.rate) errors.rate = "Rate is required.";
  return errors;
};

const UpdateExchangeRate = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [items, setItems] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const currencyNameById = useMemo(() => {
    return currencies.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }, [currencies]);

  const selectedItem = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return items.find((item) => item.id === id) || null;
  }, [form.selectedId, items]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const exchangeRateLabel = (item) => {
    const base =
      currencyNameById[item.baseCurrencyId] || `#${item.baseCurrencyId}`;
    const quote =
      currencyNameById[item.quoteCurrencyId] || `#${item.quoteCurrencyId}`;
    return `${base} → ${quote} | rate: ${item.rate} | id: ${item.id}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [exchangeRes, currencyRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/exchange-rates/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/currencies/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const exchangeData = await safeReadJson(exchangeRes);
      const currencyData = await safeReadJson(currencyRes);

      setItems(Array.isArray(exchangeData) ? exchangeData : []);
      setCurrencies(Array.isArray(currencyData) ? currencyData : []);
    } catch (err) {
      console.error("Load exchange rates error:", err);
      setItems([]);
      setCurrencies([]);
      setFormError(
        err?.message || "Unexpected error while loading exchange rates.",
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

    const selected = items.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      baseCurrencyId: selected?.baseCurrencyId
        ? String(selected.baseCurrencyId)
        : "",
      quoteCurrencyId: selected?.quoteCurrencyId
        ? String(selected.quoteCurrencyId)
        : "",
      rate: selected?.rate ?? "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedItem) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedItem.id),
      baseCurrencyId: selectedItem.baseCurrencyId
        ? String(selectedItem.baseCurrencyId)
        : "",
      quoteCurrencyId: selectedItem.quoteCurrencyId
        ? String(selectedItem.quoteCurrencyId)
        : "",
      rate: selectedItem.rate ?? "",
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
        baseCurrencyId: Number(form.baseCurrencyId),
        quoteCurrencyId: Number(form.quoteCurrencyId),
        rate: form.rate,
      };

      const res = await authFetch(
        `${BASE_URL}/api/exchange-rates/${Number(form.selectedId)}`,
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
            "There was a problem updating the exchange rate.",
        );
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                baseCurrencyId:
                  data?.baseCurrencyId ?? Number(form.baseCurrencyId),
                quoteCurrencyId:
                  data?.quoteCurrencyId ?? Number(form.quoteCurrencyId),
                rate: data?.rate ?? form.rate,
              }
            : item,
        ),
      );

      setSuccessMessage("Exchange rate updated successfully.");
    } catch (err) {
      console.error("Update exchange rate error:", err);
      setFormError(
        err?.message || "Unexpected error while updating exchange rate.",
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
            <h3 className={styles.pageTitle}>Update Exchange Rate</h3>
            <p className={styles.pageSubtitle}>
              Select an active exchange rate and update its currencies and rate.
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
                  <div className={styles.cardTitle}>Choose exchange rate</div>
                  <div className={styles.cardMeta}>
                    Readable currency labels
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Exchange rate</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select exchange rate</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {exchangeRateLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Currencies and rate</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Base currency</label>
                  <select
                    className={inputClass("baseCurrencyId")}
                    name="baseCurrencyId"
                    value={form.baseCurrencyId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select base currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Quote currency</label>
                  <select
                    className={inputClass("quoteCurrencyId")}
                    name="quoteCurrencyId"
                    value={form.quoteCurrencyId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select quote currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Rate</label>
                  <input
                    className={inputClass("rate")}
                    type="number"
                    step="0.00000001"
                    name="rate"
                    value={form.rate}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
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
                <FiSave /> {saving ? "Saving..." : "Update exchange rate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateExchangeRate;
