import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";

import Budget from "../Budgets/Budget/Budget";
import CreateNewBudget from "../Budgets/CreateNewBudget/CreateNewBudget";

import styles from "./Budgets.module.scss";
import { FiPlus } from "react-icons/fi";

import { BASE_URL } from "../../config/api";

const Budgets = () => {
  const { selectedProjectId } = useContext(ProjectContext);
  const { hasAnyRole } = useAuth();
  const canEditBudgets = hasAnyRole("ADMIN", "FINANCE");

  const [budgets, setBudgets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  /*
   * Points to the wrapper around the create-budget form.
   * We scroll to this element after React has rendered the form.
   */
  const createFormRef = useRef(null);

  // Fetch budgets for the selected project.
  const fetchBudgets = async (projectId, token) => {
    try {
      const res = await fetch(`${BASE_URL}/api/budgets/project/${projectId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch budgets. Status: ${res.status}`);
      }

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
    } else {
      setBudgets([]);
      setShowCreateForm(false);
    }
  }, [selectedProjectId]);

  /*
   * Opens the form and scrolls to it after React and the browser have completed
   * the DOM update and layout.
   */
  const handleOpenCreateForm = () => {
    if (!canEditBudgets) return;
    setShowCreateForm(true);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        createFormRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    });
  };

  const handleNewBudget = (newBudget) => {
    setBudgets((prev) => [...prev, newBudget]);
  };

  const handleBudgetUpdate = (updatedBudget) => {
    setBudgets((prevBudgets) =>
      prevBudgets.map((budget) =>
        budget.id === updatedBudget.id ? updatedBudget : budget,
      ),
    );
  };

  const handleBudgetDelete = (deletedBudgetId) => {
    setBudgets((prevBudgets) =>
      prevBudgets.filter((budget) => budget.id !== deletedBudgetId),
    );
  };

  const subtitle = useMemo(() => {
    if (!selectedProjectId) {
      return "Select a project to see budgets";
    }

    return `Project #${selectedProjectId} • ${budgets.length} budget${
      budgets.length === 1 ? "" : "s"
    }`;
  }, [selectedProjectId, budgets.length]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Budgets</h3>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          {canEditBudgets && <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleOpenCreateForm}
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
          </div>}
        </div>

        {canEditBudgets && showCreateForm && (
          <div ref={createFormRef} className={styles.createFormSection}>
            <CreateNewBudget
              onClose={() => setShowCreateForm(false)}
              onBudgetCreated={handleNewBudget}
            />
          </div>
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
