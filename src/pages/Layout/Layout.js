// Import React core and hooks
import React, { useContext } from "react";

// Import routing tools for navigation and current location highlighting
import { Outlet, Link, useLocation } from "react-router-dom";

// Import styling
import styles from "./Layout.module.scss";

// Import the ProjectContext to access project list and selected project ID
import { ProjectContext } from "../../context/ProjectContext"; // Adjust path if needed

// Define the Layout component that wraps the whole app UI
const Layout = () => {
  // Use location hook to highlight the active tab
  const location = useLocation();

  // Destructure context values: full project list, selected project ID, and the setter
  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  // Handle project selection changes
  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  return (
    <>
      {/* Page title */}
      <h1>
        <strong>Relief Projects</strong>
      </h1>

      {/* Project Selector - now persistent across all tabs */}
      <div className={styles.selectorContainer}>
        <strong>Select a Project</strong>
        <br />
        <select
          value={selectedProjectId}
          onChange={handleSelectChange}
          className={styles.selectInput}
        >
          {/* Render project options */}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation bar for different tabs */}
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
        </ul>
      </nav>

      {/* Renders the selected route's component */}
      <Outlet />
    </>
  );
};

// Export Layout component
export default Layout;
