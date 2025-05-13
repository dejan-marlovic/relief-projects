import React, { useState, useEffect, useContext } from "react";
import styles from "../../Budget/Budget.module.scss";
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
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Create New Budget</h3>
        <form className={styles.formTwoColumn}>
          {/* Left Column */}
          <div className={styles.formColumnLeft}>
            <div className={styles.formItem}>
              <label>Description:</label>
              <textarea
                name="budgetDescription"
                className={styles.textareaInput}
                value={budget.budgetDescription}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formItem}>
              <label>Preparation Date:</label>
              <input
                type="datetime-local"
                name="budgetPreparationDate"
                className={styles.textInput}
                value={budget.budgetPreparationDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formItem}>
              <label>Total Amount:</label>
              <input
                type="number"
                name="totalAmount"
                className={styles.textInput}
                value={budget.totalAmount}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.formColumnRight}>
            {/* Currency + Rate Pairs */}
            {[
              {
                currencyName: "Local Currency",
                currencyField: "localCurrencyId",
                rateLabel: "Local → GBP Rate",
                rateField: "localCurrencyToGbpId",
              },
              {
                currencyName: "SEK Currency",
                currencyField: "reportingCurrencySekId",
                rateLabel: "SEK Exchange Rate",
                rateField: "reportingExchangeRateSekId",
              },
              {
                currencyName: "EUR Currency",
                currencyField: "reportingCurrencyEurId",
                rateLabel: "EUR Exchange Rate",
                rateField: "reportingExchangeRateEurId",
              },
              {
                currencyName: "Local Exchange Rate",
                currencyField: "localExchangeRateId",
                rateLabel: "Local → GBP Exchange Rate (Alt)",
                rateField: "localExchangeRateToGbpId",
              },
            ].map((pair, index) => (
              <div className={styles.formRowPair} key={index}>
                <div className={styles.formItem}>
                  <label>{pair.currencyName}</label>
                  <select
                    name={pair.currencyField}
                    className={styles.textInput}
                    value={budget[pair.currencyField]}
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

                <div className={styles.formItem}>
                  <label>{pair.rateLabel}</label>
                  <select
                    name={pair.rateField}
                    className={styles.textInput}
                    value={budget[pair.rateField]}
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
            ))}
          </div>
        </form>

        <div className={styles.formRowPair}>
          <button onClick={handleSave} className={styles.saveButton}>
            Save
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
