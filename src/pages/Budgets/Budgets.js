import React, { useEffect, useMemo, useState, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";

import Budget from "../Budgets/Budget/Budget";
import CreateNewBudget from "../Budgets/CreateNewBudget/CreateNewBudget";

import styles from "./Budgets.module.scss";
import { FiPlus } from "react-icons/fi";

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
    if (selectedProjectId) fetchBudgets(selectedProjectId, token);
    else setBudgets([]);
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

  const subtitle = useMemo(() => {
    if (!selectedProjectId) return "Select a project to see budgets";
    return `Project #${selectedProjectId} • ${budgets.length} budget${
      budgets.length === 1 ? "" : "s"
    }`;
  }, [selectedProjectId, budgets.length]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Header (same feel as Signatures) */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Budgets</h3>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setShowCreateForm(true)}
              disabled={!selectedProjectId || showCreateForm}
              title={
                !selectedProjectId
                  ? "Select a project first"
                  : showCreateForm
                  ? "Finish the current draft first"
                  : "Create new budget"
              }
            >
              <FiPlus />
              New Budget
            </button>
          </div>
        </div>

        {showCreateForm && (
          <CreateNewBudget
            onClose={() => setShowCreateForm(false)}
            onBudgetCreated={handleNewBudget}
          />
        )}

        <div className={styles.budgetList}>
          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see its budgets.
            </p>
          ) : budgets.length === 0 ? (
            <p className={styles.noData}>
              No budgets available for this project.
            </p>
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
    </div>
  );
};

export default Budgets;
