import React, { useState, useEffect, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import Budget from "../Budget/Budget";
import CreateNewBudget from "../../components/CreateNewBudget/CreateNewBudget";
import styles from "./Budgets.module.scss";

const Budgets = () => {
  const { selectedProjectId } = useContext(ProjectContext);
  const [budgets, setBudgets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchBudgets = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/budgets/project/${selectedProjectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        setBudgets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch budgets", err);
        setBudgets([]);
      }
    };

    if (selectedProjectId) {
      fetchBudgets();
    }
  }, [selectedProjectId]);

  const handleNewBudget = (newBudget) => {
    setBudgets((prev) => [...prev, newBudget]);
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
          budgets.map((budget) => <Budget key={budget.id} budget={budget} />)
        )}
      </div>
    </div>
  );
};

export default Budgets;
