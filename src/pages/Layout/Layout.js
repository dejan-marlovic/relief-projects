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
    localStorage.removeItem("selectedProjectId");
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) navigate("/login");
  }, [navigate]);

  const isRegisterPage = location.pathname === "/register-project";
  const isStatisticsPage = location.pathname === "/statistics";
  const isOperationalGuidePage = location.pathname === "/operational-guide";

  // ✅ hide selector where project context is not needed
  const hideSelector =
    isRegisterPage || isStatisticsPage || isOperationalGuidePage;

  const isActive = (path) => location.pathname === path;

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
              >
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
          >
            <FiLogOut />
          </button>
        </div>
      </header>

      <nav className={styles.nav}>
        <ul className={styles.tabList}>
          {[
            ["/project", "Project"],
            ["/budgets", "Budgets"],
            ["/transactions", "Transactions"],
            ["/payments", "Payments"],
            ["/signatures", "Signatures"],
            ["/recipients", "Recipients"],
            ["/organizations", "Related Organizations"],
            ["/documents", "Documents"],
            ["/statistics", "Statistics"],
            ["/register-project", "New Project"],

            // ✅ NEW (last tab)
            ["/operational-guide", "Operational Guide"],
          ].map(([path, label]) => (
            <li key={path} className={styles.tabItem}>
              <Link
                to={path}
                className={`${styles.tabLink} ${
                  isActive(path) ? styles.active : ""
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
