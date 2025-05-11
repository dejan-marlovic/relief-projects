import React, { useState, useEffect, useContext, useCallback } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import Budget from "../Budget/Budget";
import CreateNewBudget from "../../components/CreateNewBudget/CreateNewBudget";
import styles from "./Budgets.module.scss";

const Budgets = () => {
  const { selectedProjectId } = useContext(ProjectContext);
  const [budgets, setBudgets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);

  const fetchBudgets = useCallback(async () => {
    if (!selectedProjectId) {
      console.log("No selectedProjectId, skipping fetchBudgets");
      return;
    }
    const token = localStorage.getItem("authToken");
    try {
      console.log("Fetching budgets for project:", selectedProjectId);
      const res = await fetch(
        `http://localhost:8080/api/budgets/project/${selectedProjectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! Status: ${res.status}, Message: ${errorText}`
        );
      }
      const data = await res.json();
      console.log("Budgets fetched:", data);
      const normalized = Array.isArray(data) ? data : [];
      console.log("Normalized budgets:", normalized);
      setBudgets(normalized);
      const selectedStillExists = normalized.some(
        (b) => b.id === selectedBudgetId
      );
      if (!selectedStillExists) {
        console.log("Clearing selectedBudgetId - budget not found");
        setSelectedBudgetId(null);
      }
    } catch (err) {
      console.error("Failed to fetch budgets:", err.message);
      // setBudgets([]); // Preserve budgets on error
    }
  }, [selectedProjectId, selectedBudgetId]);

  useEffect(() => {
    console.log("selectedProjectId changed:", selectedProjectId);
    if (selectedProjectId) {
      fetchBudgets();
    }
  }, [selectedProjectId, fetchBudgets]);

  const handleNewBudget = (newBudget) => {
    setBudgets((prev) => [...prev, newBudget]);
    setSelectedBudgetId(newBudget.id);
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.createButton}
        onClick={() => setShowCreateForm(true)}
      >
        New Budget
      </button>

      {showCreateForm && (
        <CreateNewBudget
          onClose={() => setShowCreateForm(false)}
          onBudgetCreated={handleNewBudget}
        />
      )}

      <div className={styles.budgetList}>
        {budgets.length === 0 ? (
          <p>No budgets available for this project.</p>
        ) : (
          budgets.map((budget) => (
            <Budget
              key={budget.id}
              budget={budget}
              isSelected={budget.id === selectedBudgetId}
              onSelect={() => setSelectedBudgetId(budget.id)}
              onUpdated={fetchBudgets}
              onDeleted={fetchBudgets}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Budgets;
