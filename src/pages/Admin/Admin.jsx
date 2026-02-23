import React, { useMemo, useState } from "react";
import styles from "./Admin.module.scss";

import CreatePosition from "../Admin/CreatePosition/CreatePosition";
import CreateEmployee from "../Admin/CreateEmployee/CreateEmployee";
import CreateUser from "../Admin/CreateUser/CreateUser";
import RegisterProject from "../RegisterProject/RegisterProject";

const Admin = () => {
  // Which "create screen" is currently selected
  const [entity, setEntity] = useState("position");

  // Choose which component to render
  const SelectedComponent = useMemo(() => {
    switch (entity) {
      case "project":
        return RegisterProject;
      case "employee":
        return CreateEmployee;
      case "user":
        return CreateUser;
      case "position":
      default:
        return CreatePosition;
    }
  }, [entity]);

  return (
    <div className={styles.adminContainer}>
      {/* Selector bar */}
      <div className={styles.selectorCard}>
        <div className={styles.selectorRow}>
          <div className={styles.selectorText}>
            <div className={styles.selectorTitle}>Admin</div>
            <div className={styles.selectorSubtitle}>
              Choose what you want to create.
            </div>
          </div>

          <div className={styles.selectorControl}>
            <label className={styles.selectorLabel} htmlFor="adminEntitySelect">
              Create entity
            </label>
            <select
              id="adminEntitySelect"
              className={styles.selectInput}
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
            >
              <option value="position">Position (master data)</option>
              <option value="project">Project</option>
              <option value="employee">Employee</option>
              <option value="user">User (login)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Render the chosen create form */}
      <div className={styles.content}>
        {/* key forces a clean remount when switching (resets form state) */}
        <SelectedComponent key={entity} />
      </div>
    </div>
  );
};

export default Admin;
