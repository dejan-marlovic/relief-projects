// Import core React features and hooks
import React, { useState, useEffect, useContext } from "react";

// Import the context that shares selectedProjectId globally
import { ProjectContext } from "../../context/ProjectContext";

// Import child components used in this component
import Budget from "../Budgets/Budget/Budget"; // Displays a single budget item
import CreateNewBudget from "../Budgets/CreateNewBudget/CreateNewBudget"; // Form to create a new budget

// Import scoped CSS styles
import styles from "./Budgets.module.scss";

// Main functional component
const Budgets = () => {
  // Access the globally selected project ID using React Context
  const { selectedProjectId } = useContext(ProjectContext);

  // Local state: holds the list of budget objects for the selected project
  const [budgets, setBudgets] = useState([]);

  // Local state: controls visibility of the "Create New Budget" form
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 🔄 useEffect triggers when selectedProjectId changes
  // This ensures budgets are fetched again when a different project is selected
  useEffect(() => {
    // Step 1: Get the token from localStorage for API authorization
    const token = localStorage.getItem("authToken");

    // Step 2: Define the async fetch function
    const fetchBudgets = async () => {
      try {
        // 🔍 Fetch budgets for the currently selected project
        const res = await fetch(
          `http://localhost:8080/api/budgets/project/${selectedProjectId}`,
          {
            method: "GET", // Optional since GET is default
            headers: {
              Authorization: `Bearer ${token}`, // 🔐 Include auth token
              "Content-Type": "application/json", // Let the server know we're handling JSON
            },
          }
        );

        // Parse the response as JSON
        const data = await res.json();

        // ✅ If data is an array, store it in state; otherwise default to an empty array
        setBudgets(Array.isArray(data) ? data : []);
      } catch (err) {
        // ❌ On error, log it and clear the budgets list to avoid showing stale data
        console.error("Failed to fetch budgets", err);
        setBudgets([]);
      }
    };

    // 🧠 Only fetch if a project is actually selected
    if (selectedProjectId) {
      fetchBudgets();
    }
  }, [selectedProjectId]); // 🔁 Re-run this effect any time the selectedProjectId changes

  // 🧩 Called when a new budget is created from the form
  const handleNewBudget = (newBudget) => {
    // Add the new budget to the existing list (immutably)
    setBudgets((prev) => [...prev, newBudget]);
  };

  // 🖼 Render logic starts here
  return (
    <div className={styles.container}>
      {/* 📌 Button to show the budget creation form */}
      <button
        className={styles.createButton}
        onClick={() => setShowCreateForm(true)}
      >
        Create Budget
      </button>

      {/* 📄 Conditionally render the creation form if the user clicked "Create Budget" */}
      {showCreateForm && (
        <CreateNewBudget
          onClose={() => setShowCreateForm(false)} // Callback to hide the form
          onBudgetCreated={handleNewBudget} // Callback to update list with the new budget
        />
      )}

      {/* 📋 Render the list of budgets, or a fallback message if the list is empty */}
      <div className={styles.budgetList}>
        {budgets.length === 0 ? (
          <p>No budgets available for this project.</p>
        ) : (
          budgets.map((budget) => (
            <Budget key={budget.id} budget={budget} /> // Pass each budget as a prop to the Budget component
          ))
        )}
      </div>
    </div>
  );
};

// Export this component to be used in the app
export default Budgets;
