import React, { useEffect, useState } from "react";
import styles from "./Budget.module.scss";

const Budget = ({ budget: initialBudget }) => {
  const formatDate = (dateString) =>
    dateString ? dateString.slice(0, 16) : "";

  const [budget, setBudget] = useState(initialBudget || {});
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchFormData = async () => {
      try {
        const [currencyRes, rateRes] = await Promise.all([
          fetch("http://localhost:8080/api/currencies/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8080/api/exchange-rates/active", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const currencies = await currencyRes.json();
        const exchangeRates = await rateRes.json();

        setCurrencies(currencies);
        setExchangeRates(exchangeRates);
      } catch (error) {
        console.error("Failed to fetch currency or exchange rate data", error);
      }
    };

    fetchFormData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBudget((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Budget Details</h3>
        <form className={styles.formTwoColumn}>
          {/* Left column */}
          <div className={styles.formColumnLeft}>
            <div>
              <label>Description:</label>
              <textarea
                name="budgetDescription"
                className={styles.textareaInput}
                value={budget.budgetDescription || ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Preparation Date:</label>
              <input
                type="datetime-local"
                name="budgetPreparationDate"
                className={styles.textInput}
                value={formatDate(budget.budgetPreparationDate)}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Total Amount:</label>
              <input
                type="number"
                name="totalAmount"
                className={styles.textInput}
                value={budget.totalAmount || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Right column */}
          <div className={styles.formColumnRight}>
            <div className={styles.currencyRateRow}>
              <div>
                <label>Local Currency:</label>
                <select
                  name="localCurrencyId"
                  className={styles.textInput}
                  value={budget.localCurrencyId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Local → GBP Rate:</label>
                <select
                  name="localCurrencyToGbpId"
                  className={styles.textInput}
                  value={budget.localCurrencyToGbpId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {exchangeRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.exchangeRate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SEK pair */}
            <div className={styles.currencyRateRow}>
              <div>
                <label>SEK Currency:</label>
                <select
                  name="reportingCurrencySekId"
                  className={styles.textInput}
                  value={budget.reportingCurrencySekId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>SEK Exchange Rate:</label>
                <select
                  name="reportingExchangeRateSekId"
                  className={styles.textInput}
                  value={budget.reportingExchangeRateSekId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {exchangeRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.exchangeRate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* EUR pair */}
            <div className={styles.currencyRateRow}>
              <div>
                <label>EUR Currency:</label>
                <select
                  name="reportingCurrencyEurId"
                  className={styles.textInput}
                  value={budget.reportingCurrencyEurId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>EUR Exchange Rate:</label>
                <select
                  name="reportingExchangeRateEurId"
                  className={styles.textInput}
                  value={budget.reportingExchangeRateEurId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {exchangeRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.exchangeRate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Local alt rate pair */}
            <div className={styles.currencyRateRow}>
              <div>
                <label>Local Exchange Rate:</label>
                <select
                  name="localExchangeRateId"
                  className={styles.textInput}
                  value={budget.localExchangeRateId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {exchangeRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.exchangeRate}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Local → GBP Exchange Rate (Alt):</label>
                <select
                  name="localExchangeRateToGbpId"
                  className={styles.textInput}
                  value={budget.localExchangeRateToGbpId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select rate</option>
                  {exchangeRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.exchangeRate}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Budget;
