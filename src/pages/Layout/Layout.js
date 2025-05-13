import React, { useContext, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import styles from "./Layout.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

const Layout = () => {
  const location = useLocation();
  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  // Ensure selectedProjectId is valid when projects change
  useEffect(() => {
    if (
      projects.length > 0 &&
      !projects.some((p) => p.id === selectedProjectId)
    ) {
      console.log(
        "Layout.js: selectedProjectId is invalid, resetting to first project or null"
      );
      setSelectedProjectId(projects[0]?.id || null);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  const handleSelectChange = (e) => {
    const newValue = e.target.value ? parseInt(e.target.value, 10) : null;
    console.log(
      "Layout.js: handleSelectChange: new value =",
      newValue,
      "selectedProjectId =",
      selectedProjectId
    );
    setSelectedProjectId(newValue);
  };

  console.log(
    "Layout.js: Rendering, selectedProjectId:",
    selectedProjectId,
    "projects:",
    projects
  );

  const isRegisterPage = location.pathname === "/register-project";
  return (
    <>
      <h1>
        <strong>Relief Projects</strong>
      </h1>
      <div
        className={`${styles.selectorContainer} ${
          isRegisterPage ? styles.hiddenSelector : ""
        }`}
      >
        <strong>Select a Project</strong>
        <br />
        <select
          value={selectedProjectId ?? ""}
          onChange={handleSelectChange}
          className={styles.selectInput}
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </select>
      </div>
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
              to="/register-project"
              className={
                location.pathname === "/register-project" ? styles.active : ""
              }
            >
              Register Project
            </Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </>
  );
};

export default Layout;
