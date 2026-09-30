import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Layout.module.scss";
import { ProjectContext } from "../../context/ProjectContext";
import { FiLogOut, FiLayers, FiInfo } from "react-icons/fi";
import { useBranding } from "../../context/BrandingContext";
import { useAuth } from "../../context/AuthContext";
import { UnsavedChangesContext } from "../../context/UnsavedChangesContext";

import useMediaQuery from "../../hooks/useMediaQuery";
import NavigationGroup from "./NavigationGroup";

const Layout = () => {
  const isPhone = useMediaQuery("(max-width: 700px)");
  const [openGroup, setOpenGroup] = useState(null);
  const closeGroup = useCallback(() => setOpenGroup(null), []);
  const location = useLocation();
  const navigate = useNavigate();
  const { logoUrl } = useBranding();
  const { clearAuth, hasRole, hasAnyRole } = useAuth();
  const [unsavedChangeKeys, setUnsavedChangeKeys] = useState(() => new Set());
  const hasUnsavedChanges = unsavedChangeKeys.size > 0;

  const setUnsavedChange = useCallback((key, isUnsaved) => {
    setUnsavedChangeKeys((current) => {
      const alreadyTracked = current.has(key);
      if (alreadyTracked === isUnsaved) return current;
      const next = new Set(current);
      if (isUnsaved) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const confirmDiscardUnsavedChanges = useCallback(
    () =>
      !hasUnsavedChanges ||
      window.confirm(
        "You have unsaved changes. Leave this page without saving them?",
      ),
    [hasUnsavedChanges],
  );

  const unsavedChangesContextValue = useMemo(
    () => ({
      setUnsavedChange,
      hasUnsavedChanges,
      confirmDiscardUnsavedChanges,
    }),
    [confirmDiscardUnsavedChanges, hasUnsavedChanges, setUnsavedChange],
  );

  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  const selectedProject = projects?.find(
    (project) => String(project.id) === String(selectedProjectId)
  );
  const projectTabLabel =
    selectedProject?.projectName || selectedProject?.name || "Project";

  const handleSelectChange = (e) => {
    if (
      String(e.target.value) !== String(selectedProjectId) &&
      !confirmDiscardUnsavedChanges()
    ) {
      return;
    }
    setSelectedProjectId(e.target.value);
  };

  const handleLogout = () => {
    if (!confirmDiscardUnsavedChanges()) return;
    clearAuth();
    localStorage.removeItem("selectedProjectId");
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

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

  const isActive = (path) => location.pathname === path || (path === "/project" && location.pathname === "/") ||
    (path === "/admin" && location.pathname.startsWith("/admin/"));

  const navigationItems = [
    ["/project", projectTabLabel],
    ["/budgets", "Budgets"],
    ["/transactions", "Transactions"],
    ["/payments", "Payments"],
    ["/signatures", "Signatures"],
    ["/recipients", "Recipients"],
    ["/organizations", "Organizations"],
    ["/documents", "Documents"],
    ["/follow-ups", "Follow-ups"],
    ["/risks", "Risks"],
    ["/results", "Results"],
    ["/statistics", "Statistics"],
    ["/register-project", "New Project"],
    ["/operational-guide", "Guide"],
    ["/about", "About"],
    ["/admin", "Admin"],
  ].filter(([path]) => {
    if (path === "/admin") return hasRole("ADMIN");
    if (path === "/register-project") return hasAnyRole("ADMIN", "PROJECT_MANAGER");
    return true;
  });

  const currentPage = navigationItems.find(([path]) => isActive(path))?.[0] || "";

  const categories = [
    { label: "Finance", paths: ["/budgets", "/transactions", "/payments", "/signatures", "/recipients"] },
    // Future findings/lessons and travel belong here when their routes are implemented.
    { label: "Project work", paths: ["/documents", "/follow-ups", "/risks", "/results", "/organizations"] },
    { label: "Overview", paths: ["/statistics"] },
    { label: "Help", paths: ["/operational-guide", "/about"] },
  ].map(group => ({ ...group, items: navigationItems.filter(([path]) => group.paths.includes(path)) }));

  useEffect(() => { setOpenGroup(null); }, [location.pathname, isPhone]);

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

        <aside className={styles.projectContextNote} aria-label="Project context">
          <FiInfo aria-hidden="true" />
          <div>
            <strong>{selectedProject ? "Your selected project" : "Project context"}</strong>
            <p>
              Most tabs show data for your selected project, including budgets,
              transactions and payment orders. {hideSelector
                ? "Use the Project selector on a project page to switch projects. This page is not filtered by that selection."
                : "Use the Project selector to switch projects."}
            </p>
          </div>
        </aside>

        <div className={styles.headerRight}>
          {!hideSelector && (
            <div className={styles.selectorInline}>
              <label htmlFor="layout-project" className={styles.selectorLabel}>Project</label>
              <select
                id="layout-project"
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

          <button
            type="button"
            className={styles.logoutIcon}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <FiLogOut />
          </button>
        </div>
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
      </header>

      <nav className={styles.nav} aria-label="Main navigation">
        {isPhone ? (
          <div className={styles.pagePicker}>
            <label htmlFor="layout-page" className={styles.selectorLabel}>Current page</label>
            <select
              id="layout-page"
              className={styles.selectInput}
              value={currentPage}
              onChange={(event) => {
                const nextPage = event.target.value;
                if (nextPage !== currentPage && confirmDiscardUnsavedChanges()) navigate(nextPage);
              }}
            >
              {!currentPage && <option value="" disabled>Select page</option>}
              <option value="/project">{projectTabLabel}</option>
              {hasAnyRole("ADMIN", "PROJECT_MANAGER") && <option value="/register-project">New Project</option>}
              {categories.map(group => <optgroup key={group.label} label={group.label}>{group.items.map(([path, label]) => <option key={path} value={path}>{label}</option>)}</optgroup>)}
              {hasRole("ADMIN") && <option value="/admin">Admin</option>}
            </select>
          </div>
        ) : (
        <ul className={styles.tabList}>
          {navigationItems.filter(([path]) => path === "/project").map(([path, label]) => {
            const isAdminTab = path === "/admin";
            const isProjectTab = path === "/project";

            return (
              <li key={path} className={styles.tabItem}>
                <Link
                  to={path}
                  aria-current={isActive(path) ? "page" : undefined}
                  title={isProjectTab ? `${label} — Currently selected project. Most tabs show data for this project.` : undefined}
                  aria-label={isProjectTab ? label : undefined}
                  onClick={(event) => {
                    if (
                      !isActive(path) &&
                      !confirmDiscardUnsavedChanges()
                    ) {
                      event.preventDefault();
                    }
                  }}
                  className={`${styles.tabLink} ${
                    isActive(path) ? styles.active : ""
                  } ${isAdminTab ? styles.adminTab : ""} ${
                    isProjectTab ? styles.projectTab : ""
                  }`}
                >
                  {isProjectTab ? (
                    <>
                      <span className={styles.projectTabName}>{label}</span>
                      <span className={styles.projectTabSubtitle}>Selected project</span>
                    </>
                  ) : label}
                </Link>
              </li>
            );
            })}
          {categories.map(group => <NavigationGroup key={group.label} {...group} isActive={isActive} open={openGroup === group.label} onToggle={() => setOpenGroup(current => current === group.label ? null : group.label)} onClose={closeGroup} confirmNavigation={confirmDiscardUnsavedChanges} />)}
          {hasAnyRole("ADMIN", "PROJECT_MANAGER") && <li className={styles.tabItem}><Link to="/register-project" className={`${styles.tabLink} ${isActive("/register-project") ? styles.active : ""}`} aria-current={isActive("/register-project") ? "page" : undefined} onClick={event => { if (!isActive("/register-project") && !confirmDiscardUnsavedChanges()) event.preventDefault(); }}>New Project</Link></li>}
          {hasRole("ADMIN") && <li className={styles.tabItem}><Link to="/admin" className={`${styles.tabLink} ${styles.adminTab} ${isActive("/admin") ? styles.active : ""}`} aria-current={isActive("/admin") ? "page" : undefined} onClick={event => { if (!isActive("/admin") && !confirmDiscardUnsavedChanges()) event.preventDefault(); }}>Admin</Link></li>}
        </ul>
        )}
      </nav>

      <main className={styles.content}>
        <UnsavedChangesContext.Provider value={unsavedChangesContextValue}>
          <Outlet />
        </UnsavedChangesContext.Provider>
      </main>
    </div>
  );
};

export default Layout;
