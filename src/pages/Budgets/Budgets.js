import React, { useState, useEffect, useContext, useCallback } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import Budget from "../Budget/Budget";
import styles from "../Budget/Budget.module.scss";

const Budgets = () => {
  const { selectedProjectId } = useContext(ProjectContext);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);

  const fetchBudgets = useCallback(async () => {
    if (!selectedProjectId) {
      console.log("Budgets.js: No selectedProjectId, skipping fetchBudgets");
      setBudgets([]);
      setSelectedBudgetId(null);
      return;
    }
    console.log("Budgets.js: Fetching budgets for project:", selectedProjectId);
    const token = localStorage.getItem("authToken");
    console.log("Budgets.js: Using token:", token ? "Present" : "Missing");
    console.log(
      "Budgets.js: Token (first 10 chars):",
      token ? token.slice(0, 10) + "..." : "None"
    );

    // Try multiple possible endpoints
    const endpoints = [
      `http://localhost:8080/api/budgets/by-project/${selectedProjectId}`,
      `http://localhost:8080/api/budgets/project/${selectedProjectId}`,
      `http://localhost:8080/api/projects/${selectedProjectId}/budgets`,
    ];

    for (const url of endpoints) {
      console.log("Budgets.js: Trying endpoint:", url);
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Budgets.js: Fetch response status:", res.status);
        console.log("Budgets.js: Response headers:", [
          ...res.headers.entries(),
        ]);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `Failed to fetch budgets: ${res.status}, Message: ${errorText}`
          );
        }
        const data = await res.json();
        console.log("Budgets.js: Budgets fetched:", data);
        const normalized = Array.isArray(data) ? data : [];
        console.log("Budgets.js: Normalized budgets:", normalized);
        setBudgets(normalized);
        // Auto-select first budget after state update
        setTimeout(() => {
          if (normalized.length > 0) {
            setSelectedBudgetId((current) => {
              const selectedStillExists = normalized.some(
                (budget) => budget.id === current
              );
              if (!selectedStillExists || current === null) {
                console.log(
                  "Budgets.js: Auto-selecting first budget:",
                  normalized[0].id
                );
                return normalized[0].id;
              }
              console.log("Budgets.js: Keeping selectedBudgetId:", current);
              return current;
            });
          } else {
            console.log("Budgets.js: No budgets, clearing selectedBudgetId");
            setSelectedBudgetId(null);
          }
        }, 0);
        return; // Exit loop on success
      } catch (err) {
        console.error(
          "Budgets.js: Failed to fetch budgets from",
          url,
          ":",
          err.message
        );
      }
    }
    console.error("Budgets.js: All endpoints failed, setting empty budgets");
    setBudgets([]);
    setSelectedBudgetId(null);
  }, [selectedProjectId]);

  useEffect(() => {
    console.log("Budgets.js: selectedProjectId changed:", selectedProjectId);
    fetchBudgets();
  }, [selectedProjectId, fetchBudgets]);

  // Log selectedBudgetId changes
  useEffect(() => {
    console.log("Budgets.js: selectedBudgetId:", selectedBudgetId);
  }, [selectedBudgetId]);

  return (
    <div className={styles.budgetsContainer}>
      <h2>Budgets</h2>
      {budgets.length === 0 ? (
        <p>No budgets available for this project.</p>
      ) : (
        budgets.map((budget) => (
          <Budget
            key={budget.id}
            budget={budget}
            isSelected={budget.id === selectedBudgetId}
            onSelect={() => {
              console.log("Budgets.js: Selecting budget:", budget.id);
              setSelectedBudgetId(budget.id);
            }}
            onUpdated={fetchBudgets}
            onDeleted={fetchBudgets}
          />
        ))
      )}
    </div>
  );
};

export default Budgets;
