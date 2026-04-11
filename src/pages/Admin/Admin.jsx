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
import DeletePosition from "../Admin/DeletePosition/DeletePosition";
import DeleteEmployee from "../Admin/DeleteEmployee/DeleteEmployee";

import UpdateUser from "../Admin/UpdateUser/UpdateUser";
import RestoreUser from "../Admin/RestoreUser/RestoreUser";

import RegisterProject from "../RegisterProject/RegisterProject";

const Admin = () => {
  const [action, setAction] = useState("create");

  const [createEntity, setCreateEntity] = useState("position");
  const [deleteEntity, setDeleteEntity] = useState("user");
  const [updateEntity, setUpdateEntity] = useState("user");
  const [restoreEntity, setRestoreEntity] = useState("user");

  const SelectedComponent = useMemo(() => {
    if (action === "delete") {
      switch (deleteEntity) {
        case "position":
          return DeletePosition;
        case "employee":
          return DeleteEmployee;
        case "user":
        default:
          return DeleteUser;
      }
    }

    if (action === "update") {
      switch (updateEntity) {
        case "user":
        default:
          return UpdateUser;
      }
    }

    if (action === "restore") {
      switch (restoreEntity) {
        case "user":
        default:
          return RestoreUser;
      }
    }

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
  }, [action, createEntity, deleteEntity, updateEntity, restoreEntity]);

  const handleActionChange = (e) => {
    setAction(e.target.value);
  };

  const currentEntityValue =
    action === "create"
      ? createEntity
      : action === "delete"
        ? deleteEntity
        : action === "update"
          ? updateEntity
          : restoreEntity;

  const handleEntityChange = (e) => {
    const { value } = e.target;

    if (action === "create") setCreateEntity(value);
    if (action === "delete") setDeleteEntity(value);
    if (action === "update") setUpdateEntity(value);
    if (action === "restore") setRestoreEntity(value);
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.selectorCard}>
        <div className={styles.selectorRow}>
          <div className={styles.selectorText}>
            <div className={styles.selectorTitle}>Admin</div>
            <div className={styles.selectorSubtitle}>
              Choose an action first, then choose an entity.
            </div>
          </div>

          <div className={styles.selectorControl}>
            <div className={styles.toolbarRow}>
              <div className={styles.actionCard}>
                <span className={styles.selectorLabel}>Action:</span>

                <div className={styles.actionOptions}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="adminAction"
                      value="create"
                      checked={action === "create"}
                      onChange={handleActionChange}
                    />
                    <span>Create</span>
                  </label>

                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="adminAction"
                      value="delete"
                      checked={action === "delete"}
                      onChange={handleActionChange}
                    />
                    <span>Delete</span>
                  </label>

                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="adminAction"
                      value="update"
                      checked={action === "update"}
                      onChange={handleActionChange}
                    />
                    <span>Update</span>
                  </label>

                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="adminAction"
                      value="restore"
                      checked={action === "restore"}
                      onChange={handleActionChange}
                    />
                    <span>Restore</span>
                  </label>
                </div>
              </div>

              <label
                className={styles.selectorLabel}
                htmlFor="adminEntitySelect"
              >
                {action === "create" && "Create entity:"}
                {action === "delete" && "Delete entity:"}
                {action === "update" && "Update entity:"}
                {action === "restore" && "Restore entity:"}
              </label>

              <select
                id="adminEntitySelect"
                className={styles.selectInput}
                value={currentEntityValue}
                onChange={handleEntityChange}
              >
                {action === "create" && (
                  <>
                    <option value="position">Position (master data)</option>
                    <option value="currency">Currency (master data)</option>
                    <option value="exchangeRate">
                      Exchange Rate (master data)
                    </option>
                    <option value="costType">Cost Type (master data)</option>
                    <option value="cost">Cost (master data)</option>
                    <option value="projectType">
                      Project Type (master data)
                    </option>
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
                  </>
                )}

                {action === "delete" && (
                  <>
                    <option value="position">Position (master data)</option>
                    <option value="employee">Employee</option>
                    <option value="user">User (login)</option>
                  </>
                )}

                {(action === "update" || action === "restore") && (
                  <option value="user">User (login)</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <SelectedComponent
          key={`${action}-${createEntity}-${deleteEntity}-${updateEntity}-${restoreEntity}`}
        />
      </div>
    </div>
  );
};

export default Admin;
