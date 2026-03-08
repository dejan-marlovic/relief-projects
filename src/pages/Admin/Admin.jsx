// src/components/Admin/Admin.jsx

import React, { useMemo, useState } from "react";
import styles from "./Admin.module.scss";

import CreatePosition from "../Admin/CreatePosition/CreatePosition";
import CreateEmployee from "../Admin/CreateEmployee/CreateEmployee";
import CreateUser from "../Admin/CreateUser/CreateUser";

import CreateCurrency from "../Admin/CreateCurrency/CreateCurrency";
import CreateExchangeRate from "../Admin/CreateExchangeRate/CreateExchangeRate";

import CreateCostType from "../Admin/CreateCostType/CreateCostType";
import CreateCost from "../Admin/CreateCost/CreateCost";

import CreateProjectStatus from "../Admin/CreateProjectStatus/CreateProjectStatus";
import CreateOrganizationStatus from "../Admin/CreateOrganizationStatus/CreateOrganizationStatus";
import CreateAddress from "../Admin/CreateAddress/CreateAddress";

import CreateOrganization from "../Admin/CreateOrganization/CreateOrganization";
import CreateProjectType from "../Admin/CreateProjectType/CreateProjectType";
import CreateSector from "../Admin/CreateSector/CreateSector"; // ✅ NEW

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

      case "currency":
        return CreateCurrency;
      case "exchangeRate":
        return CreateExchangeRate;

      case "costType":
        return CreateCostType;
      case "cost":
        return CreateCost;

      case "projectType":
        return CreateProjectType;

      case "sector": // ✅ NEW
        return CreateSector;

      case "projectStatus":
        return CreateProjectStatus;

      case "organizationStatus":
        return CreateOrganizationStatus;

      case "address":
        return CreateAddress;

      case "organization":
        return CreateOrganization;

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
              {/* Master data */}
              <option value="position">Position (master data)</option>
              <option value="currency">Currency (master data)</option>
              <option value="exchangeRate">Exchange Rate (master data)</option>
              <option value="costType">Cost Type (master data)</option>
              <option value="cost">Cost (master data)</option>
              <option value="projectType">Project Type (master data)</option>
              <option value="sector">Sector (master data)</option>{" "}
              {/* ✅ NEW */}
              <option value="projectStatus">
                Project Status (master data)
              </option>
              <option value="organizationStatus">
                Organization Status (master data)
              </option>
              <option value="address">Address (master data)</option>
              {/* Core entities */}
              <option value="organization">Organization</option>
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
