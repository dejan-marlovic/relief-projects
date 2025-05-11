import React, { useState, useEffect, useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import Budget from "../Budget/Budget";
import CreateNewBudget from "../../components/CreateNewBudget/CreateNewBudget";

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
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setBudgets(Array.isArray(data) ? data : []); // ✅ Force array
      } catch (err) {
        console.error("Failed to fetch budgets", err);
        setBudgets([]); // ✅ Fallback to empty array on error
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
    <div>
      <h2>Budgets</h2>
      <button onClick={() => setShowCreateForm(true)}>Create Budget</button>

      {showCreateForm && (
        <CreateNewBudget
          onClose={() => setShowCreateForm(false)}
          onBudgetCreated={handleNewBudget}
        />
      )}

      {Array.isArray(budgets) &&
        budgets.map((budget) => <Budget key={budget.id} budget={budget} />)}
    </div>
  );
};

export default Budgets;
