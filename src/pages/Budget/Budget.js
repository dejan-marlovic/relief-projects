// Import React core and hooks: useState (to manage local state) and useEffect (for lifecycle actions)
import React, { useEffect, useState } from "react";

// Import scoped styles for this component
import styles from "./Budget.module.scss";

// Define the Budget component, accepting a prop called "budget" (initialBudget)
const Budget = ({ budget: initialBudget }) => {
  // Helper function to format date/time input values for the form
  // Ensures we slice the date string to a "YYYY-MM-DDTHH:mm" format for datetime-local input
  const formatDate = (dateString) =>
    dateString ? dateString.slice(0, 16) : "";

  // Initialize state with either the passed-in budget or an empty object
  const [budget, setBudget] = useState(initialBudget || {});

  // Lists of currencies and exchange rates for dropdown menus
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);

  // 🔄 useEffect is a React Hook that runs side effects — like API calls — in function components
  // 🔁 In this case, it runs **only once when the component mounts** (due to the empty dependency array [])
  //
  // 📅 It will NOT re-run on re-renders or when state/props change — unless explicitly told to with dependencies
  // ❗ If you want to re-fetch when the selected project changes, for example, you'd
  // include [projectId] in the dependency array
  useEffect(() => {
    // Step 1: Grab auth token from local storage
    const token = localStorage.getItem("authToken");

    // Step 2: Define async function to fetch form data
    const fetchFormData = async () => {
      try {
        // Make two API requests in parallel: one for currencies, one for exchange rates
        const [currencyRes, rateRes] = await Promise.all([
          fetch("http://localhost:8080/api/currencies/active", {
            // Headers for authentication
            // GET is default
            headers: {
              Authorization: `Bearer ${token}`, // 🔐 Pass Bearer token for secure access
            },
          }),
          fetch("http://localhost:8080/api/exchange-rates/active", {
            headers: {
              Authorization: `Bearer ${token}`, // 🔐 Same token used to authenticate
            },
          }),
        ]);

        // Convert both responses to JSON format
        const currencies = await currencyRes.json();
        const exchangeRates = await rateRes.json();

        // Save the results in state so they populate dropdowns
        setCurrencies(currencies);
        setExchangeRates(exchangeRates);
      } catch (error) {
        // Log any issues that occur during the fetch
        console.error("Failed to fetch currency or exchange rate data", error);
      }
    };

    // Trigger the data fetch
    fetchFormData();
  }, []); // 🧠 This empty array means:
  // → Run this effect **once** on mount
  // → NEVER re-run unless the component is unmounted and re-mounted

  // 🛠 If you wanted to re-run this effect when a certain variable changes (like `selectedProjectId`),
  // you could add it to the dependency array like: [selectedProjectId]

  // Handle changes in any form input field
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Dynamically update the budget field that changed
    setBudget((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Render the form UI
  return (
    <div className={styles.budgetContainer}>
      <div className={styles.formContainer}>
        <h3>Budget Details</h3>

        {/* Form layout: two columns */}
        <form className={styles.formTwoColumn}>
          {/* Left column – main details */}
          <div className={styles.formColumnLeft}>
            {/* Description */}
            <div>
              <label>Description:</label>
              <textarea
                name="budgetDescription"
                className={styles.textareaInput}
                value={budget.budgetDescription || ""}
                onChange={handleChange}
              />
            </div>

            {/* Preparation date */}
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

            {/* Total amount */}
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

          {/* Right column – currency and exchange rate pairs */}
          <div className={styles.formColumnRight}>
            {/* Local Currency and its Exchange Rate */}
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

            {/* SEK Currency and Exchange Rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
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

            {/* EUR Currency and Exchange Rate */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
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

            {/* Local (Alt) Exchange Rates */}
            <div className={styles.formRowPair}>
              <div className={styles.formItem}>
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

              <div className={styles.formItem}>
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

// Export the component so it can be used in routes or other views
export default Budget;
