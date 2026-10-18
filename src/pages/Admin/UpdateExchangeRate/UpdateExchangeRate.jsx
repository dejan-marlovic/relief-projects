import useTransientMessage from "../../../hooks/useTransientMessage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import useExchangeRateDraft from "../../../hooks/useExchangeRateDraft";
import useAutomaticRefresh from "../../../hooks/useAutomaticRefresh";
import { notifySuccess } from "../../../utils/successNotifications";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiEdit3 } from "react-icons/fi";

import styles from "../UpdateUser/UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";
import ErrorBanner from "../../../components/ErrorBanner/ErrorBanner";

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
  else if (values.baseCurrencyId && String(values.baseCurrencyId) === String(values.quoteCurrencyId) && !/^0*1(?:\.0+)?$/.test(String(values.rate).trim()))
    errors.rate = "For matching currencies, the rate must be exactly 1.";
  return errors;
};

const UpdateExchangeRate = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [items, setItems] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm, clearDraft, draftMessage] = useExchangeRateDraft("update", initialForm);
  const formRef = useRef(null);
  const reading = useRef(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useTransientMessage("");
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

  const loadData = async (quiet = false) => {
    if (reading.current) return;
    reading.current = true;
    try {
      if (!quiet) setLoading(true);
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
      if (!exchangeRes.ok || !currencyRes.ok) throw new Error("Could not refresh exchange rates. Previously loaded data is retained; automatic refresh will retry.");

      setItems(Array.isArray(exchangeData) ? exchangeData : []);
      setCurrencies(Array.isArray(currencyData) ? currencyData : []);
    } catch (err) {
      console.error("Load exchange rates error:", err);
      setFormError(
        err?.message || "Unexpected error while loading exchange rates.",
      );
    } finally {
      reading.current = false;
      setLoading(false);
    }
  };

  useAutomaticRefresh(() => loadData(true), loading || saving || Boolean(form.selectedId));
  useEffect(() => {
    if (!loading) formRef.current?.querySelector(form.selectedId ? '[name="baseCurrencyId"]' : 'select')?.focus();
  }, [loading, form.selectedId]);
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    if (form.selectedId && form.baseline && (String(form.baseCurrencyId) !== String(form.baseline.baseCurrencyId) || String(form.quoteCurrencyId) !== String(form.baseline.quoteCurrencyId) || String(form.rate) !== String(form.baseline.rate)) && !window.confirm("Discard unfinished edits and select another exchange rate?")) return;
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
      baseline: selected,
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
      clearDraft(initialForm);
      return;
    }

    clearDraft({
      selectedId: String(selectedItem.id),
      baseCurrencyId: selectedItem.baseCurrencyId
        ? String(selectedItem.baseCurrencyId)
        : "",
      quoteCurrencyId: selectedItem.quoteCurrencyId
        ? String(selectedItem.quoteCurrencyId)
        : "",
      rate: selectedItem.rate ?? "",
      baseline: selectedItem,
    });
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    if (saving) return;
    if (form.baseline && ["baseCurrencyId", "quoteCurrencyId", "rate"].every(key => String(form[key]) === String(form.baseline[key]))) {
      notifySuccess("All exchange-rate changes are already saved.");
      return;
    }
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

      const currentResponse = await authFetch(`${BASE_URL}/api/exchange-rates/${Number(form.selectedId)}`, { cache: "no-store" });
      if (!currentResponse.ok) throw new Error("Could not check this exchange rate. Your draft is retained.");
      const current = await safeReadJson(currentResponse);
      const baseline = form.baseline || selectedItem;
      if (!baseline || ["id", "baseCurrencyId", "quoteCurrencyId", "rate", "rateDate"].some(key => String(current?.[key] ?? "") !== String(baseline[key] ?? ""))) {
        if (current?.id) setItems(old => old.map(row => row.id === current.id ? current : row));
        throw new Error("This exchange rate changed elsewhere. Your edits are retained. Copy them before using Reset form to load the current values.");
      }

      const payload = {
        baseCurrencyId: Number(form.baseCurrencyId),
        quoteCurrencyId: Number(form.quoteCurrencyId),
        rate: form.rate,
        rateDate: current.rateDate,
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
          [data?.message ||
            data?.detail ||
            "There was a problem updating the exchange rate.",
          ...Object.values(fe || {}).filter(Boolean)].join(" "),
        );
        return;
      }
      clearDraft({ ...form, baseline: { ...current, ...payload, ...data } });

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
      <div className={styles.formContainer} ref={formRef}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Exchange Rate</h3>
            <p className={styles.pageSubtitle}>
              Select a shared exchange rate. Edits are retained in this tab and applied only when you choose Save changes.
            </p>
          </div>
        </div>

        {draftMessage && <p role="status">{draftMessage}</p>}
        {formError && (
          <ErrorBanner message={formError} onDismiss={() => setFormError("")} />
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
                  <label htmlFor="update-exchange-selected">Exchange rate</label>
                  <select
                    className={inputClass("selectedId")}
                    id="update-exchange-selected" value={form.selectedId}
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
                {selectedItem && <p>Rate date: {String(form.baseline?.rateDate || selectedItem.rateDate || "Not recorded").replace("T", " ")}. The original date is preserved when saving.</p>}

                <div className={styles.formGroup}>
                  <label htmlFor="update-exchange-baseCurrencyId">Base currency</label>
                  <select
                    className={inputClass("baseCurrencyId")}
                    id="update-exchange-baseCurrencyId" name="baseCurrencyId"
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
                  <label htmlFor="update-exchange-quoteCurrencyId">Quote currency</label>
                  <select
                    className={inputClass("quoteCurrencyId")}
                    id="update-exchange-quoteCurrencyId" name="quoteCurrencyId"
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
                  <label htmlFor="update-exchange-rate">Rate</label>
                  <input
                    className={inputClass("rate")}
                    type="number"
                    step="0.00000001"
                    id="update-exchange-rate" name="rate"
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
                <FiSave /> {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateExchangeRate;
