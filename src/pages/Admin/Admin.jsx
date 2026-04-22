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
import CreateSignatureStatus from "../Admin/CreateSignatureStatus/CreateSignatureStatus";
import CreateSignature from "../Admin/CreateSignature/CreateSignature";
import CreateRecipient from "../Admin/CreateRecipient/CreateRecipient";
import CreateBudget from "../Admin/CreateBudget/CreateBudget";
import CreateDocument from "../Admin/CreateDocument/CreateDocument";
import CreateBankDetail from "../Admin/CreateBankDetail/CreateBankDetail";
import CreateTransaction from "../Admin/CreateTransaction/CreateTransaction";
import CreatePaymentOrder from "../Admin/CreatePaymentOrder/CreatePaymentOrder";

import DeleteUser from "../Admin/DeleteUser/DeleteUser";
import DeletePosition from "../Admin/DeletePosition/DeletePosition";
import DeleteEmployee from "../Admin/DeleteEmployee/DeleteEmployee";
import DeleteCurrency from "../Admin/DeleteCurrency/DeleteCurrency";
import DeleteExchangeRate from "../Admin/DeleteExchangeRate/DeleteExchangeRate";
import DeleteCostType from "../Admin/DeleteCostType/DeleteCostType";
import DeleteCost from "../Admin/DeleteCost/DeleteCost";
import DeleteProjectType from "../Admin/DeleteProjectType/DeleteProjectType";
import DeleteSector from "../Admin/DeleteSector/DeleteSector";
import DeleteTransactionStatus from "../Admin/DeleteTransactionStatus/DeleteTransactionStatus";
import DeleteSignatureStatus from "../Admin/DeleteSignatureStatus/DeleteSignatureStatus";
import DeleteSignature from "../Admin/DeleteSignature/DeleteSignature";
import DeleteRecipient from "../Admin/DeleteRecipient/DeleteRecipient";
import DeleteProjectStatus from "../Admin/DeleteProjectStatus/DeleteProjectStatus";
import DeleteOrganizationStatus from "../Admin/DeleteOrganizationStatus/DeleteOrganizationStatus";
import DeleteAddress from "../Admin/DeleteAddress/DeleteAddress";
import DeleteOrganization from "../Admin/DeleteOrganization/DeleteOrganization";
import DeleteProject from "../Admin/DeleteProject/DeleteProject";
import DeleteBudget from "../Admin/DeleteBudget/DeleteBudget";
import DeleteDocument from "../Admin/DeleteDocument/DeleteDocument";
import DeleteBankDetail from "../Admin/DeleteBankDetail/DeleteBankDetail";
import DeleteTransaction from "../Admin/DeleteTransaction/DeleteTransaction";
import DeletePaymentOrder from "../Admin/DeletePaymentOrder/DeletePaymentOrder";

import UpdateUser from "../Admin/UpdateUser/UpdateUser";
import RestoreUser from "../Admin/RestoreUser/RestoreUser";

import RegisterProject from "../RegisterProject/RegisterProject";

const ENTITY_OPTIONS = [
  { value: "position", label: "Position (master data)" },
  { value: "currency", label: "Currency (master data)" },
  { value: "exchangeRate", label: "Exchange Rate (master data)" },
  { value: "costType", label: "Cost Type (master data)" },
  { value: "cost", label: "Cost (master data)" },
  { value: "projectType", label: "Project Type (master data)" },
  { value: "sector", label: "Sector (master data)" },
  { value: "transactionStatus", label: "Transaction Status (master data)" },
  { value: "signatureStatus", label: "Signature Status (master data)" },
  { value: "signature", label: "Signature" },
  { value: "recipient", label: "Recipient" },
  { value: "projectStatus", label: "Project Status (master data)" },
  { value: "organizationStatus", label: "Organization Status (master data)" },
  { value: "address", label: "Address (master data)" },
  { value: "organization", label: "Organization" },
  { value: "project", label: "Project" },
  { value: "budget", label: "Budget" },
  { value: "document", label: "Document" },
  { value: "bankDetail", label: "Bank Detail" },
  { value: "transaction", label: "Transaction" },
  { value: "paymentOrder", label: "Payment Order" },
  { value: "employee", label: "Employee" },
  { value: "user", label: "User (login)" },
];

const CREATE_ENTITY_VALUES = new Set([
  "position",
  "currency",
  "exchangeRate",
  "costType",
  "cost",
  "projectType",
  "sector",
  "transactionStatus",
  "signatureStatus",
  "signature",
  "recipient",
  "projectStatus",
  "organizationStatus",
  "address",
  "organization",
  "project",
  "budget",
  "document",
  "bankDetail",
  "transaction",
  "paymentOrder",
  "employee",
  "user",
]);

const DELETE_ENTITY_VALUES = new Set([
  "position",
  "currency",
  "exchangeRate",
  "costType",
  "cost",
  "projectType",
  "sector",
  "transactionStatus",
  "signatureStatus",
  "signature",
  "recipient",
  "projectStatus",
  "organizationStatus",
  "address",
  "organization",
  "project",
  "budget",
  "document",
  "bankDetail",
  "transaction",
  "paymentOrder",
  "employee",
  "user",
]);

const UPDATE_ENTITY_VALUES = new Set(["user"]);
const RESTORE_ENTITY_VALUES = new Set(["user"]);

const Admin = () => {
  const [action, setAction] = useState("create");

  const [createEntity, setCreateEntity] = useState("position");
  const [deleteEntity, setDeleteEntity] = useState("position");
  const [updateEntity, setUpdateEntity] = useState("user");
  const [restoreEntity, setRestoreEntity] = useState("user");

  const entityOptionsForAction = useMemo(() => {
    if (action === "create") {
      return ENTITY_OPTIONS.filter((option) =>
        CREATE_ENTITY_VALUES.has(option.value),
      );
    }

    if (action === "delete") {
      return ENTITY_OPTIONS.filter((option) =>
        DELETE_ENTITY_VALUES.has(option.value),
      );
    }

    if (action === "update") {
      return ENTITY_OPTIONS.filter((option) =>
        UPDATE_ENTITY_VALUES.has(option.value),
      );
    }

    return ENTITY_OPTIONS.filter((option) =>
      RESTORE_ENTITY_VALUES.has(option.value),
    );
  }, [action]);

  const SelectedComponent = useMemo(() => {
    if (action === "delete") {
      switch (deleteEntity) {
        case "position":
          return DeletePosition;
        case "employee":
          return DeleteEmployee;
        case "currency":
          return DeleteCurrency;
        case "exchangeRate":
          return DeleteExchangeRate;
        case "costType":
          return DeleteCostType;
        case "cost":
          return DeleteCost;
        case "projectType":
          return DeleteProjectType;
        case "sector":
          return DeleteSector;
        case "transactionStatus":
          return DeleteTransactionStatus;
        case "signatureStatus":
          return DeleteSignatureStatus;
        case "signature":
          return DeleteSignature;
        case "recipient":
          return DeleteRecipient;
        case "projectStatus":
          return DeleteProjectStatus;
        case "organizationStatus":
          return DeleteOrganizationStatus;
        case "address":
          return DeleteAddress;
        case "organization":
          return DeleteOrganization;
        case "project":
          return DeleteProject;
        case "budget":
          return DeleteBudget;
        case "document":
          return DeleteDocument;
        case "bankDetail":
          return DeleteBankDetail;
        case "transaction":
          return DeleteTransaction;
        case "paymentOrder":
          return DeletePaymentOrder;
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
      case "signatureStatus":
        return CreateSignatureStatus;
      case "signature":
        return CreateSignature;
      case "recipient":
        return CreateRecipient;
      case "projectStatus":
        return CreateProjectStatus;
      case "organizationStatus":
        return CreateOrganizationStatus;
      case "address":
        return CreateAddress;
      case "organization":
        return CreateOrganization;
      case "budget":
        return CreateBudget;
      case "document":
        return CreateDocument;
      case "bankDetail":
        return CreateBankDetail;
      case "transaction":
        return CreateTransaction;
      case "paymentOrder":
        return CreatePaymentOrder;
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
                {entityOptionsForAction.map((option) => (
                  <option
                    key={`${action}-${option.value}`}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
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
