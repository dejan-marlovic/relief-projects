import React, { useContext, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Layout.module.scss";
import { ProjectContext } from "../../context/ProjectContext";
import { FiLogOut, FiLayers } from "react-icons/fi";
import { useBranding } from "../../context/BrandingContext";
import { useAuth } from "../../context/AuthContext";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoUrl } = useBranding();
  const { clearAuth, hasRole, hasAnyRole } = useAuth();

  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  const selectedProject = projects?.find(
    (project) => String(project.id) === String(selectedProjectId)
  );
  const projectTabLabel =
    selectedProject?.projectName || selectedProject?.name || "Project";

  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  const handleLogout = () => {
    clearAuth();
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
  const isAboutPage = location.pathname === "/about";
  const usesInternalTableScroll = [
    "/transactions",
    "/payments",
    "/signatures",
    "/recipients",
    "/organizations",
  ].includes(location.pathname);

  // ✅ NEW: Admin page is global (no project context needed)
  const isAdminPage = location.pathname.startsWith("/admin");

  // ✅ hide selector where project context is not needed
  const hideSelector =
    isRegisterPage ||
    isStatisticsPage ||
    isOperationalGuidePage ||
    isAboutPage ||
    isAdminPage;

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`${styles.layoutShell} ${
        usesInternalTableScroll ? styles.fixedTableViewport : ""
      }`}
    >
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
              src={logoUrl}
              alt="Relief Projects logo"
              className={styles.logo}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/logo.png";
              }}
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
            ["/project", projectTabLabel],
            ["/budgets", "Budgets"],
            ["/transactions", "Transactions"],
            ["/payments", "Payments"],
            ["/signatures", "Signatures"],
            ["/recipients", "Recipients"],
            ["/organizations", "Organizations"],
            ["/documents", "Documents"],
            ["/statistics", "Statistics"],
            ["/register-project", "New Project"],

            // ✅ Existing
            ["/operational-guide", "Guide"],

            // ✅ Existing
            ["/about", "About"],

            // ✅ NEW: Admin (placeholder)
            ["/admin", "Admin"],
          ]
            .filter(([path]) => {
              if (path === "/admin") return hasRole("ADMIN");
              if (path === "/register-project") {
                return hasAnyRole("ADMIN", "PROJECT_MANAGER");
              }
              return true;
            })
            .map(([path, label]) => {
            const isAdminTab = path === "/admin";
            const isProjectTab = path === "/project";

            return (
              <li key={path} className={styles.tabItem}>
                <Link
                  to={path}
                  className={`${styles.tabLink} ${
                    isActive(path) ? styles.active : ""
                  } ${isAdminTab ? styles.adminTab : ""} ${
                    isProjectTab ? styles.projectTab : ""
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
            })}
        </ul>
      </nav>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
