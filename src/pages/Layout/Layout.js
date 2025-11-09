// Import core React functionality and hooks
import React, { useContext } from "react";

// Import routing utilities:
// - Outlet: placeholder where child routes will render
// - Link: navigational element (like <a>, but client-side)
// - useLocation: lets us access the current route path
import { Outlet, Link, useLocation } from "react-router-dom";

// Import scoped CSS module styles
import styles from "./Layout.module.scss";

// Import context for accessing the selected project and project list
import { ProjectContext } from "../../context/ProjectContext";

// Define the main layout component that wraps the app UI and navigation
const Layout = () => {
  // 📍 useLocation gives access to the current URL path
  // We use it to highlight the active tab and hide the selector on certain routes
  const location = useLocation();

  // Destructure global state provided by ProjectContext
  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  // Event handler for when a user selects a different project from the dropdown
  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value); // Update context with selected project ID
  };

  // Boolean flag: used to hide the project selector only on the "Register Project" page
  const isRegisterPage = location.pathname === "/register-project";

  return (
    <>
      {/* App heading */}
      <h1>
        <strong>Relief Projects</strong>
      </h1>

      {/* Project selector section */}
      {/* It will be hidden on the register-project route using a conditional class */}
      <div
        className={`${styles.selectorContainer} ${
          isRegisterPage ? styles.hiddenSelector : ""
        }`}
      >
        <strong>Select a Project</strong>
        <br />
        <select
          value={selectedProjectId} // Currently selected project from context
          onChange={handleSelectChange} // Updates selected project in global context
          className={styles.selectInput} // Apply styles to the dropdown
        >
          {/* Map through all projects and display them as options */}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* 📌 Navigation menu with links to each app section */}
      <nav className={styles.nav}>
        <ul>
          {/* Each list item contains a Link that behaves like a <NavLink> but lighter */}
          {/* The Link does NOT reload the page — it navigates internally using the history API */}
          {/* We conditionally apply `styles.active` if the current path matches the link path */}
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
              Register New Project
            </Link>
          </li>
        </ul>
      </nav>

      {/* <Outlet /> is where child route components will be rendered */}
      {/* For example, if you navigate to /budgets, the Budgets component will be rendered here */}
      <Outlet />
    </>
  );
};

// Export Layout component so it can be used in the route configuration
export default Layout;
