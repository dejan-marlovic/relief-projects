import React, { useEffect, useState, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext.js";
import CostDetail from "../Budget/CostDetail/CostDetail.js";
import styles from "../Budget/Budget.module.scss";

const Budget = ({
  budget: initialBudget,
  isSelected,
  onSelect,
  onUpdated,
  onDeleted,
}) => {
  const { selectedProjectId } = useContext(ProjectContext);
  const formatDate = (dateString) =>
    dateString ? dateString.slice(0, 16) : "";
  const [budget, setBudget] = useState(initialBudget || {});
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);

  useEffect(() => {
    console.log("Budget.js: initialBudget:", initialBudget);
    setBudget(initialBudget || {});
  }, [initialBudget]);

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
        setCurrencies(await currencyRes.json());
        setExchangeRates(await rateRes.json());
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

  const handleDelete = async () => {
    if (!budget.id) return;
    if (!window.confirm("Are you sure you want to delete this budget?")) return;
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(
        `http://localhost:8080/api/budgets/${budget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to delete budget.");
      alert("Budget deleted successfully.");
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting budget.");
    }
  };

  const handleSave = async () => {
    if (!budget.id) return;
    const token = localStorage.getItem("authToken");
    const payload = {
      projectId: selectedProjectId,
      budgetDescription: budget.budgetDescription,
      budgetPreparationDate: budget.budgetPreparationDate,
      totalAmount: parseFloat(budget.totalAmount),
      localCurrencyId: budget.localCurrencyId,
      localCurrencyToGbpId: budget.localCurrencyToGbpId,
      reportingCurrencySekId: budget.reportingCurrencySekId,
      reportingCurrencyEurId: budget.reportingCurrencyEurId,
      localExchangeRateId: budget.localExchangeRateId,
      localExchangeRateToGbpId: budget.localExchangeRateToGbpId,
      reportingExchangeRateSekId: budget.reportingExchangeRateSekId,
      reportingExchangeRateEurId: budget.reportingExchangeRateEurId,
    };

    try {
      console.log(
        "Sending PUT request for budget:",
        budget.id,
        "with payload:",
        payload
      );
      const response = await fetch(
        `http://localhost:8080/api/budgets/${budget.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const responseData = await response.json();
      console.log("PUT response:", responseData);
      if (!response.ok)
        throw new Error(`Failed to update budget: ${response.status}`);
      console.log("Budget updated successfully");
      alert("Budget updated successfully!");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Update error:", err.message);
      alert("Error updating budget.");
    }
  };

  return (
    <div
      className={`${styles.budgetContainer} ${
        isSelected ? styles.selected : ""
      }`}
      onClick={onSelect}
    >
      <div className={styles.formContainer}>
        <h3>Budget Details</h3>
        <form className={styles.formTwoColumn}>
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
            <div className={styles.buttonRow}>
              <button className={styles.saveButton} onClick={handleSave}>
                Save
              </button>
              <button className={styles.deleteButton} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>

          <div className={styles.formColumnRight}>
            <div className={styles.currencyRateRow}>
              <div>
                <label>Local Currency:</label>
                <select
                  name="localCurrencyId"
                  className={styles.textInput}
                  value={budget.localCurrencyId ?? ""}
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
                  value={budget.localCurrencyToGbpId ?? ""}
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
                  value={budget.reportingCurrencySekId ?? ""}
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
                  value={budget.reportingExchangeRateSekId ?? ""}
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
                  value={budget.reportingCurrencyEurId ?? ""}
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
                  value={budget.reportingExchangeRateEurId ?? ""}
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

        {isSelected && (
          <div className={styles.costDetailsSection}>
            <h3>Cost Details</h3>
            <CostDetail budgetId={budget.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Budget);
