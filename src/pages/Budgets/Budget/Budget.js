import React, { useEffect, useState } from "react";
import styles from "./Budget.module.scss";
import CostDetails from "./CostDetails/CostDetails";
import CreateCostDetail from "./CreateCostDetail/CreateCostDetail.js";

const BASE_URL = "http://localhost:8080";

const Budget = ({ budget: initialBudget, onUpdate, onDelete }) => {
  const formatDate = (dateString) =>
    dateString ? dateString.slice(0, 16) : "";

  const [budget, setBudget] = useState(initialBudget || {});
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [refreshCostDetailsTrigger, setRefreshCostDetailsTrigger] = useState(0);

  const triggerRefreshCostDetails = () =>
    setRefreshCostDetailsTrigger((prev) => prev + 1);

  // 🔄 Fetch: Currencies
  const fetchCurrencies = async (token) => {
    const response = await fetch(`${BASE_URL}/api/currencies/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  };

  // 🔄 Fetch: Exchange Rates
  const fetchExchangeRates = async (token) => {
    const response = await fetch(`${BASE_URL}/api/exchange-rates/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await response.json();
  };

  // ✅ Fetch both currencies and rates in parallel on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchFormData = async () => {
      try {
        const [currenciesData, exchangeRatesData] = await Promise.all([
          fetchCurrencies(token),
          fetchExchangeRates(token),
        ]);
        setCurrencies(currenciesData);
        setExchangeRates(exchangeRatesData);
      } catch (error) {
        console.error("Failed to fetch currency or exchange rate data", error);
      }
    };

    fetchFormData();
  }, []);

  // 💾 Save/Update Budget
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${BASE_URL}/api/budgets/${budget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(budget),
      });

      if (!response.ok) throw new Error("Failed to update budget");

      const updated = await response.json();
      console.log("🔁 Updated budget from server:", updated);
      alert("Budget updated successsfully!");

      // ✅ keep local state in sync
      setBudget(updated);
      onUpdate?.(updated);

      // 🔄 Refetch latest exchange rates (in case they changed on server)
      const freshRates = await fetchExchangeRates(token);
      setExchangeRates(freshRates);

      // ✅ trigger cost details recalculation (CostDetails sees new budget + new exchangeRates)
      triggerRefreshCostDetails();
    } catch (error) {
      console.error("Error updating budget:", error);
      alert("Error saving budget.");
    }
  };

  // 🗑️ Delete Budget
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${BASE_URL}/api/budgets/${budget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete budget");

      alert("Budget deleted successfully!");
      onDelete?.(budget.id);
      setBudget({});
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Error deleting budget.");
    }
  };

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

            <div className={styles.saveButtonContainer}>
              <button
                type="button"
                onClick={handleSave}
                className={styles.saveButton}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
              >
                Delete this budget
              </button>
            </div>
          </div>

          <div className={styles.formColumnRight}>
            {/* Local currency (e.g. TRY) and Local -> GBP rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
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

              <div className={styles.formItem}>
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

            {/* Reporting SEK + rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
                <label>Reporting currency (SEK):</label>
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

              <div className={styles.formItem}>
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

            {/* Reporting EUR + rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
                <label>Reporting currency (EUR):</label>
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

              <div className={styles.formItem}>
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
          </div>
        </form>
      </div>

      {budget?.id && (
        <CostDetails
          budgetId={budget.id}
          refreshTrigger={refreshCostDetailsTrigger}
          budget={budget}
          exchangeRates={exchangeRates}
        />
      )}
    </div>
  );
};

export default Budget;
