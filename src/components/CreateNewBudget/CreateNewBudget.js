import React, { useState, useEffect, useContext } from "react";
import styles from "../../pages/Budget/Budget.module.scss"; // Reuse styling from Budget
import { ProjectContext } from "../../context/ProjectContext";

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
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Create New Budget</h3>
        <form className={styles.formTwoColumn}>
          {/* Left column */}
          <div className={styles.formColumnLeft}>
            <div>
              <label>Description:</label>
              <textarea
                name="budgetDescription"
                className={styles.textareaInput}
                value={budget.budgetDescription}
                onChange={handleChange}
                placeholder="Budget Description"
              />
            </div>

            <div>
              <label>Preparation Date:</label>
              <input
                type="datetime-local"
                name="budgetPreparationDate"
                value={budget.budgetPreparationDate}
                onChange={handleChange}
                className={styles.textInput}
              />
            </div>

            <div>
              <label>Total Amount:</label>
              <input
                type="number"
                name="totalAmount"
                placeholder="Total Amount"
                value={budget.totalAmount}
                onChange={handleChange}
                className={styles.textInput}
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
                  value={budget.localCurrencyId}
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
                  value={budget.localCurrencyToGbpId}
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

            <div className={styles.currencyRateRow}>
              <div>
                <label>SEK Currency:</label>
                <select
                  name="reportingCurrencySekId"
                  className={styles.textInput}
                  value={budget.reportingCurrencySekId}
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
                  value={budget.reportingExchangeRateSekId}
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

            <div className={styles.currencyRateRow}>
              <div>
                <label>EUR Currency:</label>
                <select
                  name="reportingCurrencyEurId"
                  className={styles.textInput}
                  value={budget.reportingCurrencyEurId}
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
                  value={budget.reportingExchangeRateEurId}
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

            <div className={styles.currencyRateRow}></div>
          </div>
        </form>

        <div className={styles.buttonRow}>
          <button onClick={handleSave} className={styles.saveButton}>
            Create Budget
          </button>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNewBudget;
