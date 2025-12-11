// Import core React functionality and hooks
import React, { useContext, useEffect } from "react";

// Import routing utilities
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";

// Import scoped CSS module styles
import styles from "./Layout.module.scss";

// Import context for accessing the selected project and project list
import { ProjectContext } from "../../context/ProjectContext";

// Logout icon
import { FiLogOut } from "react-icons/fi";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  const handleLogout = () => {
    // Remove token and redirect to login
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  // 🔐 Simple auth guard: if there's no token, go to /login
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const isRegisterPage = location.pathname === "/register-project";
  const isStatisticsPage = location.pathname === "/statistics";
  const hideSelector = isRegisterPage || isStatisticsPage;

  return (
    <>
      {/* Header row: title + logo card + logout icon (top-right) */}
      <div className={styles.headerBar}>
        <div className={styles.headerTitleBlock}>
          <h1 className={styles.headerTitle}>
            <span className={styles.headerTitleAccent}>Relief</span> Projects
          </h1>
          <p className={styles.headerSubtitle}>
            Manage budgets, transactions & beneficiaries in one place
          </p>
        </div>

        <div className={styles.logoWrap}>
          <img
            src="/images/logo/logo.png"
            alt="Relief Projects logo"
            className={styles.logo}
          />
        </div>

        {/* Logout icon in the top-right corner */}
        <button
          type="button"
          className={styles.logoutIcon}
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <FiLogOut />
        </button>
      </div>

      {/* Project selector row (hidden on register + statistics) */}
      <div className={styles.selectorBar}>
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
              to="/organizations"
              className={
                location.pathname === "/organizations" ? styles.active : ""
              }
            >
              Related Organizations
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
