// Import core React functionality and hooks
import React, { useContext } from "react";

// Import routing utilities
import { Outlet, Link, useLocation } from "react-router-dom";

// Import scoped CSS module styles
import styles from "./Layout.module.scss";

// Import context for accessing the selected project and project list
import { ProjectContext } from "../../context/ProjectContext";

// Define the main layout component that wraps the app UI and navigation
const Layout = () => {
  // 📍 Current URL path (used to highlight active tab and hide selector)
  const location = useLocation();

  // Global state from ProjectContext
  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  // Handle project change
  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  // Hide selector on register page AND statistics page
  const isRegisterPage = location.pathname === "/register-project";
  const isStatisticsPage = location.pathname === "/statistics";
  const hideSelector = isRegisterPage || isStatisticsPage;

  return (
    <>
      {/* App heading */}
      <h1>
        <strong>Relief Projects</strong>
      </h1>

      {/* Project selector (hidden on register + statistics) */}
      <div
        className={`${styles.selectorContainer} ${
          hideSelector ? styles.hiddenSelector : ""
        }`}
      >
        <strong>Select a Project</strong>
        <br />
        <select
          value={selectedProjectId}
          onChange={handleSelectChange}
          className={styles.selectInput}
          disabled={!projects || projects.length === 0}
          aria-label="Select a project"
        >
          {(!projects || projects.length === 0) && (
            <option value="">No projects available</option>
          )}
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <ul>
          <li>
            <Link
              to="/project"
              className={location.pathname === "/project" ? styles.active : ""}
            >
              Project
            </Link>
          </li>
          <li>
            <Link
              to="/budgets"
              className={location.pathname === "/budgets" ? styles.active : ""}
            >
              Budgets
            </Link>
          </li>
          <li>
            <Link
              to="/transactions"
              className={
                location.pathname === "/transactions" ? styles.active : ""
              }
            >
              Transactions
            </Link>
          </li>
          <li>
            <Link
              to="/payments"
              className={location.pathname === "/payments" ? styles.active : ""}
            >
              Payments
            </Link>
          </li>
          <li>
            <Link
              to="/signatures"
              className={
                location.pathname === "/signatures" ? styles.active : ""
              }
            >
              Signatures
            </Link>
          </li>
          <li>
            <Link
              to="/recipients"
              className={
                location.pathname === "/recipients" ? styles.active : ""
              }
            >
              Recipients
            </Link>
          </li>
          <li>
            <Link
              to="/documents"
              className={
                location.pathname === "/documents" ? styles.active : ""
              }
            >
              Documents
            </Link>
          </li>
          <li>
            <Link
              to="/statistics"
              className={
                location.pathname === "/statistics" ? styles.active : ""
              }
            >
              Statistics
            </Link>
          </li>
          <li>
            <Link
              to="/register-project"
              className={
                location.pathname === "/register-project" ? styles.active : ""
              }
            >
              New Project
            </Link>
          </li>
        </ul>
      </nav>

      {/* Render child route here */}
      <Outlet />
    </>
  );
};

export default Layout;
