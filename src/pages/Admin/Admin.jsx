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
import CreateSector from "../Admin/CreateSector/CreateSector";

import CreateTransactionStatus from "../Admin/CreateTransactionStatus/CreateTransactionStatus";

import DeleteUser from "../Admin/DeleteUser/DeleteUser";
import UpdateUser from "../Admin/UpdateUser/UpdateUser";
import RestoreUser from "../Admin/RestoreUser/RestoreUser";

import RegisterProject from "../RegisterProject/RegisterProject";

const Admin = () => {
  const [createEntity, setCreateEntity] = useState("position");
  const [deleteEntity, setDeleteEntity] = useState("");
  const [updateEntity, setUpdateEntity] = useState("");
  const [restoreEntity, setRestoreEntity] = useState("");

  const SelectedComponent = useMemo(() => {
    if (deleteEntity === "user") return DeleteUser;
    if (updateEntity === "user") return UpdateUser;
    if (restoreEntity === "user") return RestoreUser;

    switch (createEntity) {
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

      case "sector":
        return CreateSector;

      case "transactionStatus":
        return CreateTransactionStatus;

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
  }, [createEntity, deleteEntity, updateEntity, restoreEntity]);

  const clearOtherActions = (action) => {
    if (action !== "delete") setDeleteEntity("");
    if (action !== "update") setUpdateEntity("");
    if (action !== "restore") setRestoreEntity("");
  };

  const handleCreateChange = (e) => {
    setCreateEntity(e.target.value);
    clearOtherActions("create");
  };

  const handleDeleteChange = (e) => {
    setDeleteEntity(e.target.value);
    clearOtherActions("delete");
  };

  const handleUpdateChange = (e) => {
    setUpdateEntity(e.target.value);
    clearOtherActions("update");
  };

  const handleRestoreChange = (e) => {
    setRestoreEntity(e.target.value);
    clearOtherActions("restore");
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.selectorCard}>
        <div className={styles.selectorRow}>
          <div className={styles.selectorText}>
            <div className={styles.selectorTitle}>Admin</div>
            <div className={styles.selectorSubtitle}>
              Choose what you want to create, delete, update or restore.
            </div>
          </div>

          <div className={styles.selectorControl}>
            <label
              className={styles.selectorLabel}
              htmlFor="adminCreateEntitySelect"
            >
              Create entity
            </label>
            <select
              id="adminCreateEntitySelect"
              className={styles.selectInput}
              value={createEntity}
              onChange={handleCreateChange}
            >
              <option value="position">Position (master data)</option>
              <option value="currency">Currency (master data)</option>
              <option value="exchangeRate">Exchange Rate (master data)</option>
              <option value="costType">Cost Type (master data)</option>
              <option value="cost">Cost (master data)</option>
              <option value="projectType">Project Type (master data)</option>
              <option value="sector">Sector (master data)</option>
              <option value="transactionStatus">
                Transaction Status (master data)
              </option>
              <option value="projectStatus">
                Project Status (master data)
              </option>
              <option value="organizationStatus">
                Organization Status (master data)
              </option>
              <option value="address">Address (master data)</option>
              <option value="organization">Organization</option>
              <option value="project">Project</option>
              <option value="employee">Employee</option>
              <option value="user">User (login)</option>
            </select>

            <label
              className={styles.selectorLabel}
              htmlFor="adminDeleteEntitySelect"
            >
              Delete entity
            </label>
            <select
              id="adminDeleteEntitySelect"
              className={styles.selectInput}
              value={deleteEntity}
              onChange={handleDeleteChange}
            >
              <option value="">Select entity to delete</option>
              <option value="user">User (login)</option>
            </select>

            <label
              className={styles.selectorLabel}
              htmlFor="adminUpdateEntitySelect"
            >
              Update entity
            </label>
            <select
              id="adminUpdateEntitySelect"
              className={styles.selectInput}
              value={updateEntity}
              onChange={handleUpdateChange}
            >
              <option value="">Select entity to update</option>
              <option value="user">User (login)</option>
            </select>

            <label
              className={styles.selectorLabel}
              htmlFor="adminRestoreEntitySelect"
            >
              Restore entity
            </label>
            <select
              id="adminRestoreEntitySelect"
              className={styles.selectInput}
              value={restoreEntity}
              onChange={handleRestoreChange}
            >
              <option value="">Select entity to restore</option>
              <option value="user">User (login)</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <SelectedComponent
          key={deleteEntity || updateEntity || restoreEntity || createEntity}
        />
      </div>
    </div>
  );
};

export default Admin;
