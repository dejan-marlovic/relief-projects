import React, { useState, useEffect, useContext } from "react";
import styles from "./CreateNewBudget.module.scss";
import { ProjectContext } from "../../../context/ProjectContext";

const CreateNewBudget = ({ onClose, onBudgetCreated }) => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);

  const [budget, setBudget] = useState({
    budgetDescription: "",
    totalAmount: "",
    budgetPreparationDate: "",
    localCurrencyId: "",
    localCurrencyToGbpId: "",
    reportingCurrencySekId: "",
    reportingExchangeRateSekId: "",
    reportingCurrencyEurId: "",
    reportingExchangeRateEurId: "",
    localExchangeRateId: "",
    localExchangeRateToGbpId: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchData = async () => {
      try {
        const [currencyRes, rateRes] = await Promise.all([
          fetch("http://localhost:8080/api/currencies/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
          fetch("http://localhost:8080/api/exchange-rates/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
        ]);

        setCurrencies(currencyRes);
        setExchangeRates(rateRes);
      } catch (err) {
        console.error("Error fetching form data", err);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBudget((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch("http://localhost:8080/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...budget, projectId: selectedProjectId }),
      });

      if (!response.ok) throw new Error("Failed to create budget");

      const created = await response.json();
      onBudgetCreated(created);
      onClose();
    } catch (err) {
      console.error("Create budget error:", err);
      alert("Error creating budget.");
    }
  };

  return (
    <div className={styles.modal}>
      <h3>Create New Budget</h3>

      <textarea
        name="budgetDescription"
        value={budget.budgetDescription}
        onChange={handleChange}
        placeholder="Budget Description"
        className={styles.textareaInput}
      />

      <input
        type="datetime-local"
        name="budgetPreparationDate"
        value={budget.budgetPreparationDate}
        onChange={handleChange}
        className={styles.textInput}
      />

      <input
        type="number"
        name="totalAmount"
        placeholder="Total Amount"
        value={budget.totalAmount}
        onChange={handleChange}
        className={styles.textInput}
      />

      <select
        name="localCurrencyId"
        value={budget.localCurrencyId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">Local Currency</option>
        {currencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        name="localCurrencyToGbpId"
        value={budget.localCurrencyToGbpId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">Local to GBP Rate</option>
        {exchangeRates.map((r) => (
          <option key={r.id} value={r.id}>
            {r.exchangeRate}
          </option>
        ))}
      </select>

      <select
        name="reportingCurrencySekId"
        value={budget.reportingCurrencySekId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">SEK Currency</option>
        {currencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        name="reportingExchangeRateSekId"
        value={budget.reportingExchangeRateSekId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">SEK Rate</option>
        {exchangeRates.map((r) => (
          <option key={r.id} value={r.id}>
            {r.exchangeRate}
          </option>
        ))}
      </select>

      <select
        name="reportingCurrencyEurId"
        value={budget.reportingCurrencyEurId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">EUR Currency</option>
        {currencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        name="reportingExchangeRateEurId"
        value={budget.reportingExchangeRateEurId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">EUR Rate</option>
        {exchangeRates.map((r) => (
          <option key={r.id} value={r.id}>
            {r.exchangeRate}
          </option>
        ))}
      </select>

      <select
        name="localExchangeRateId"
        value={budget.localExchangeRateId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">Local Exchange Rate</option>
        {exchangeRates.map((r) => (
          <option key={r.id} value={r.id}>
            {r.exchangeRate}
          </option>
        ))}
      </select>

      <select
        name="localExchangeRateToGbpId"
        value={budget.localExchangeRateToGbpId}
        onChange={handleChange}
        className={styles.textInput}
      >
        <option value="">Local → GBP Rate (Alternative)</option>
        {exchangeRates.map((r) => (
          <option key={r.id} value={r.id}>
            {r.exchangeRate}
          </option>
        ))}
      </select>

      <div className={styles.buttonRow}>
        <button onClick={handleSave} className={styles.saveButton}>
          Save
        </button>
        <button onClick={onClose} className={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateNewBudget;
