import React, { useState, useEffect, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";

import Budget from "../Budgets/Budget/Budget";
import CreateNewBudget from "../Budgets/CreateNewBudget/CreateNewBudget";

import styles from "./Budgets.module.scss";

const BASE_URL = "http://localhost:8080";

const Budgets = () => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [budgets, setBudgets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 🔄 Fetch: Budgets for selected project
  const fetchBudgets = async (projectId, token) => {
    try {
      const res = await fetch(`${BASE_URL}/api/budgets/project/${projectId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      setBudgets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch budgets", err);
      setBudgets([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (selectedProjectId) {
      fetchBudgets(selectedProjectId, token);
    }
  }, [selectedProjectId]);

  const handleNewBudget = (newBudget) => {
    setBudgets((prev) => [...prev, newBudget]);
  };

  const handleBudgetUpdate = (updatedBudget) => {
    setBudgets((prevBudgets) =>
      prevBudgets.map((b) => (b.id === updatedBudget.id ? updatedBudget : b))
    );
  };

  const handleBudgetDelete = (deletedBudgetId) => {
    setBudgets((prevBudgets) =>
      prevBudgets.filter((b) => b.id !== deletedBudgetId)
    );
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.createButton}
        onClick={() => setShowCreateForm(true)}
      >
        Create Budget
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
              onUpdate={handleBudgetUpdate}
              onDelete={handleBudgetDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Budgets;
