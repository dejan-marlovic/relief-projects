/* Budgets.jsx */
import React, { useEffect, useState, useContext } from "react";
import styles from "./Budget.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

const Budget = () => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [budget, setBudget] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const [currencyRes, exchangeRes] = await Promise.all([
          fetch("http://localhost:8080/api/currencies/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
          fetch("http://localhost:8080/api/exchange-rates/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
        ]);

        setCurrencies(currencyRes);
        setExchangeRates(exchangeRes);
      } catch (err) {
        console.error("Error fetching currencies or exchange rates", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchBudget = async () => {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(
          `http://localhost:8080/api/budgets/${selectedProjectId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch budget");
        const data = await res.json();
        setBudget(data);
      } catch (err) {
        console.error("Error fetching budget", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [selectedProjectId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBudget((prev) => ({ ...prev, [name]: value }));
  };

  if (loading || !budget) return <p>Loading budget data...</p>;

  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Budget Details</h3>

        <div className={styles.fullWidthField}>
          <label htmlFor="budgetDescription">Budget Description:</label>
          <textarea
            id="budgetDescription"
            name="budgetDescription"
            value={budget.budgetDescription || ""}
            onChange={handleChange}
            className={styles.textareaInput}
            placeholder="Enter detailed description of the budget"
          />
        </div>

        <div className={`${styles.formItem} ${styles.narrowField}`}>
          <label htmlFor="budgetPreparationDate">
            Budget Preparation Date:
          </label>
          <input
            type="datetime-local"
            id="budgetPreparationDate"
            name="budgetPreparationDate"
            value={budget.budgetPreparationDate?.slice(0, 16) || ""}
            onChange={handleChange}
            className={styles.textInput}
          />
        </div>

        <div className={`${styles.formItem} ${styles.narrowField}`}>
          <label htmlFor="totalAmount">Total Amount:</label>
          <input
            type="number"
            name="totalAmount"
            id="totalAmount"
            value={budget.totalAmount || ""}
            onChange={handleChange}
            className={styles.textInput}
            placeholder="Total budgeted amount"
          />
        </div>

        <div className={styles.formRowPair}>
          <div className={styles.formItem}>
            <label htmlFor="localCurrencyId">Local Currency:</label>
            <select
              name="localCurrencyId"
              id="localCurrencyId"
              value={budget.localCurrencyId || ""}
              onChange={handleChange}
              className={styles.textInput}
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formItem}>
            <label htmlFor="localCurrencyToGbpId">To GBP Rate:</label>
            <select
              name="localCurrencyToGbpId"
              id="localCurrencyToGbpId"
              value={budget.localCurrencyToGbpId || ""}
              onChange={handleChange}
              className={styles.textInput}
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

        <div className={styles.formRowPair}>
          <div className={styles.formItem}>
            <label htmlFor="reportingCurrencySekId">SEK Currency:</label>
            <select
              name="reportingCurrencySekId"
              id="reportingCurrencySekId"
              value={budget.reportingCurrencySekId || ""}
              onChange={handleChange}
              className={styles.textInput}
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formItem}>
            <label htmlFor="reportingExchangeRateSekId">
              SEK Exchange Rate:
            </label>
            <select
              name="reportingExchangeRateSekId"
              id="reportingExchangeRateSekId"
              value={budget.reportingExchangeRateSekId || ""}
              onChange={handleChange}
              className={styles.textInput}
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

        <div className={styles.formRowPair}>
          <div className={styles.formItem}>
            <label htmlFor="reportingCurrencyEurId">EUR Currency:</label>
            <select
              name="reportingCurrencyEurId"
              id="reportingCurrencyEurId"
              value={budget.reportingCurrencyEurId || ""}
              onChange={handleChange}
              className={styles.textInput}
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formItem}>
            <label htmlFor="reportingExchangeRateEurId">
              EUR Exchange Rate:
            </label>
            <select
              name="reportingExchangeRateEurId"
              id="reportingExchangeRateEurId"
              value={budget.reportingExchangeRateEurId || ""}
              onChange={handleChange}
              className={styles.textInput}
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
    </div>
  );
};

export default Budget;
