import React, { useContext } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import styles from "./Layout.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

const Layout = () => {
  const location = useLocation();
  const { projects, selectedProjectId, setSelectedProjectId } =
    useContext(ProjectContext);

  const handleSelectChange = (e) => {
    const newValue = e.target.value;
    console.log(
      "Layout.js: handleSelectChange: new value =",
      newValue,
      "selectedProjectId =",
      selectedProjectId
    );
    setSelectedProjectId(newValue);
  };

  console.log("Layout.js: Rendering, selectedProjectId:", selectedProjectId);

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
      <Outlet />
    </>
  );
};

export default Layout;
