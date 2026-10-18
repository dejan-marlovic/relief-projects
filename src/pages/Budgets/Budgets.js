import useAutomaticRefresh from "../../hooks/useAutomaticRefresh";
import useFinancialRefresh from "../../hooks/useFinancialRefresh";
import { appFetch as fetch } from "../../utils/appFetch";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import { getSelectedProjectName } from "../../utils/projectDisplay";

import Budget from "../Budgets/Budget/Budget";
import CreateNewBudget from "../Budgets/CreateNewBudget/CreateNewBudget";

import styles from "./Budgets.module.scss";
import { FiPlus } from "react-icons/fi";

import { BASE_URL } from "../../config/api";
import { useUnsavedChange, useUnsavedChanges } from "../../context/UnsavedChangesContext";

const Budgets = () => {
  const financialRefresh = useFinancialRefresh();
  const { selectedProjectId, projects } = useContext(ProjectContext);
  const { hasAnyRole } = useAuth();
  const canEditBudgets = hasAnyRole("ADMIN", "FINANCE");

  const { hasUnsavedChanges } = useUnsavedChanges();
  const [readError, setReadError] = useState("");
  const [reading, setReading] = useState(false);
  const request = useRef(null);
  const activeProject = useRef(selectedProjectId); activeProject.current = selectedProjectId;
  const [budgets, setBudgets] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBudgetId, setNewBudgetId] = useState(null);
  const refreshBlocked = useRef(false);
  refreshBlocked.current = showCreateForm || hasUnsavedChanges;
  useUnsavedChange("new-budget", showCreateForm);

  /*
   * Points to the wrapper around the create-budget form.
   * We scroll to this element after React has rendered the form.
   */
  const createFormRef = useRef(null);
  const newBudgetRef = useRef(null);

  // Fetch budgets for the selected project.
  const fetchBudgets = async (projectId, token) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setReading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/budgets/project/${projectId}`, {
        method: "GET", signal: controller.signal, cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch budgets. Status: ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Could not read budgets.");
      if (!controller.signal.aborted && activeProject.current === projectId && !refreshBlocked.current) { setBudgets(data); setReadError(""); }
    } catch (err) {
      if (!controller.signal.aborted) setReadError("Could not refresh budgets. Previously loaded budgets are retained; automatic refresh will retry.");
    } finally {
      if (!controller.signal.aborted) setReading(false);
    }
  };

  useAutomaticRefresh(() => { if (selectedProjectId) fetchBudgets(selectedProjectId, localStorage.getItem("authToken")); }, reading || showCreateForm || hasUnsavedChanges);
  useEffect(() => { setBudgets([]); setShowCreateForm(false); setReadError(""); return () => request.current?.abort(); }, [selectedProjectId]);
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (selectedProjectId) {
      fetchBudgets(selectedProjectId, token);
    } else {
      setBudgets([]);
      setShowCreateForm(false);
    }
  }, [selectedProjectId, financialRefresh]);

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
    setNewBudgetId(newBudget.id);
    setBudgets((prev) => [...prev, newBudget]);
  };

  useEffect(() => {
    if (!newBudgetId || !newBudgetRef.current) return;
    window.requestAnimationFrame(() => {
      newBudgetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      setNewBudgetId(null);
    });
  }, [budgets, newBudgetId]);

  const handleBudgetUpdate = (updatedBudget) => {
    request.current?.abort();
    setReading(false);
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

    return `${getSelectedProjectName(projects, selectedProjectId)} • ${budgets.length} budget${
      budgets.length === 1 ? "" : "s"
    }`;
  }, [selectedProjectId, projects, budgets.length]);

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
            <CreateNewBudget key={selectedProjectId}
              onClose={() => setShowCreateForm(false)}
              onBudgetCreated={handleNewBudget}
            />
          </div>
        )}

        {readError && <p role="alert">{readError}</p>}
        <div className={styles.budgetList}>
          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see its budgets.
            </p>
          ) : budgets.length === 0 ? (
            <p className={styles.noData}>
              {reading ? "Loading budgets…" : readError ? "Budgets could not be loaded." : "No budgets available for this project."}
            </p>
          ) : (
            budgets.map((budget) => (
              <div
                key={budget.id}
                ref={budget.id === newBudgetId ? newBudgetRef : null}
                className={styles.budgetSection}
              >
                <Budget
                  budget={budget}
                  onUpdate={handleBudgetUpdate}
                  onDelete={handleBudgetDelete}
                  onRevisionsChanged={(result) => { if (!budgets.some(row => row.id === result.budget.id)) setNewBudgetId(result.budget.id); fetchBudgets(selectedProjectId, localStorage.getItem("authToken")); }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Budgets;
