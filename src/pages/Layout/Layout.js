import React, { useContext, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Layout.module.scss";
import { ProjectContext } from "../../context/ProjectContext";
import { FiLogOut, FiLayers } from "react-icons/fi";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) navigate("/login");
  }, [navigate]);

  const isRegisterPage = location.pathname === "/register-project";
  const isStatisticsPage = location.pathname === "/statistics";
  const hideSelector = isRegisterPage || isStatisticsPage;

  return (
    <div className={styles.layoutShell}>
      <header className={styles.headerBar}>
        <div className={styles.headerTitleBlock}>
          <div className={styles.brandRow}>
            <FiLayers className={styles.brandIcon} />
            <h1 className={styles.headerTitle}>
              <span className={styles.headerTitleAccent}>Relief</span> Projects
            </h1>
          </div>
          <p className={styles.headerSubtitle}>
            Manage budgets, transactions & beneficiaries in one place
          </p>
        </div>

        <div className={styles.headerRight}>
          {!hideSelector && (
            <div className={styles.selectorInline}>
              <span className={styles.selectorLabel}>Project</span>
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
          )}

          <div className={styles.logoWrap}>
            <img
              src="/images/logo/logo.png"
              alt="Relief Projects logo"
              className={styles.logo}
            />
          </div>

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
      </header>

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

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
