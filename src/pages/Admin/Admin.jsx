import React, { useEffect, useMemo, useState } from "react";
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
import UpdatePosition from "../Admin/UpdatePosition/UpdatePosition";
import UpdateEmployee from "../Admin/UpdateEmployee/UpdateEmployee";
import UpdateCurrency from "../Admin/UpdateCurrency/UpdateCurrency";
import UpdateExchangeRate from "../Admin/UpdateExchangeRate/UpdateExchangeRate";
import UpdateCostType from "../Admin/UpdateCostType/UpdateCostType";
import UpdateCost from "../Admin/UpdateCost/UpdateCost";
import UpdateProjectType from "../Admin/UpdateProjectType/UpdateProjectType";
import UpdateSector from "../Admin/UpdateSector/UpdateSector";
import UpdateTransactionStatus from "../Admin/UpdateTransactionStatus/UpdateTransactionStatus";
import UpdateSignatureStatus from "../Admin/UpdateSignatureStatus/UpdateSignatureStatus";
import UpdateSignature from "../Admin/UpdateSignature/UpdateSignature";
import UpdateRecipient from "../Admin/UpdateRecipient/UpdateRecipient";
import UpdateProjectStatus from "../Admin/UpdateProjectStatus/UpdateProjectStatus";
import UpdateOrganizationStatus from "../Admin/UpdateOrganizationStatus/UpdateOrganizationStatus";
import UpdateAddress from "../Admin/UpdateAddress/UpdateAddress";
import UpdateOrganization from "../Admin/UpdateOrganization/UpdateOrganization";
import UpdateProject from "../Admin/UpdateProject/UpdateProject";
import UpdateBudget from "../Admin/UpdateBudget/UpdateBudget";
import UpdateDocument from "../Admin/UpdateDocument/UpdateDocument";
import UpdateBankDetail from "../Admin/UpdateBankDetail/UpdateBankDetail";
import UpdateTransaction from "../Admin/UpdateTransaction/UpdateTransaction";
import UpdatePaymentOrder from "../Admin/UpdatePaymentOrder/UpdatePaymentOrder";

import RestoreUser from "../Admin/RestoreUser/RestoreUser";
import RestorePosition from "../Admin/RestorePosition/RestorePosition";
import RestoreCurrency from "../Admin/RestoreCurrency/RestoreCurrency";
import RestoreExchangeRate from "../Admin/RestoreExchangeRate/RestoreExchangeRate";
import RestoreCostType from "../Admin/RestoreCostType/RestoreCostType";
import RestoreCost from "../Admin/RestoreCost/RestoreCost";
import RestoreProjectType from "../Admin/RestoreProjectType/RestoreProjectType";
import RestoreSector from "../Admin/RestoreSector/RestoreSector";
import RestoreTransactionStatus from "../Admin/RestoreTransactionStatus/RestoreTransactionStatus";
import RestoreSignatureStatus from "../Admin/RestoreSignatureStatus/RestoreSignatureStatus";
import RestoreSignature from "../Admin/RestoreSignature/RestoreSignature";
import RestoreRecipient from "../Admin/RestoreRecipient/RestoreRecipient";
import RestoreProjectStatus from "../Admin/RestoreProjectStatus/RestoreProjectStatus";
import RestoreOrganizationStatus from "../Admin/RestoreOrganizationStatus/RestoreOrganizationStatus";
import RestoreAddress from "../Admin/RestoreAddress/RestoreAddress";
import RestoreOrganization from "../Admin/RestoreOrganization/RestoreOrganization";
import RestoreProject from "../Admin/RestoreProject/RestoreProject";
import RestoreBudget from "../Admin/RestoreBudget/RestoreBudget";
import RestoreDocument from "../Admin/RestoreDocument/RestoreDocument";
import RestoreBankDetail from "../Admin/RestoreBankDetail/RestoreBankDetail";
import RestoreTransaction from "../Admin/RestoreTransaction/RestoreTransaction";
import RestorePaymentOrder from "../Admin/RestorePaymentOrder/RestorePaymentOrder";
import RestoreEmployee from "../Admin/RestoreEmployee/RestoreEmployee";
import UserRoleManagement from "./UserRoleManagement/UserRoleManagement";

import RegisterProject from "../RegisterProject/RegisterProject";
import LogoSettings from "./LogoSettings/LogoSettings";
import ThemeSettings from "./ThemeSettings/ThemeSettings";

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

const UPDATE_ENTITY_VALUES = new Set([
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

const RESTORE_ENTITY_VALUES = new Set([
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

const Admin = () => {
  const [action, setAction] = useState("create");

  // One shared entity state for all actions.
  // Example: if you select "Project", it stays "Project" when switching
  // between Create, Delete, Update, and Restore.
  const [selectedEntity, setSelectedEntity] = useState("position");

  // Text shown in the searchable lookup field.
  const [entitySearch, setEntitySearch] = useState("Position (master data)");

  // Controls the custom dropdown menu.
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);

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

  const selectedEntityOption = useMemo(() => {
    return (
      entityOptionsForAction.find(
        (option) => option.value === selectedEntity,
      ) ||
      entityOptionsForAction[0] ||
      null
    );
  }, [entityOptionsForAction, selectedEntity]);

  const filteredEntityOptions = useMemo(() => {
    const query = entitySearch.trim().toLowerCase();

    if (!query) {
      return entityOptionsForAction;
    }

    return entityOptionsForAction.filter((option) => {
      const label = option.label.toLowerCase();
      const value = option.value.toLowerCase();

      return label.includes(query) || value.includes(query);
    });
  }, [entityOptionsForAction, entitySearch]);

  useEffect(() => {
    if (!selectedEntityOption) return;

    const existsInCurrentAction = entityOptionsForAction.some(
      (option) => option.value === selectedEntity,
    );

    if (!existsInCurrentAction && entityOptionsForAction.length > 0) {
      setSelectedEntity(entityOptionsForAction[0].value);
      setEntitySearch(entityOptionsForAction[0].label);
      return;
    }

    if (!entityMenuOpen) {
      setEntitySearch(selectedEntityOption.label);
    }
  }, [
    action,
    selectedEntity,
    selectedEntityOption,
    entityOptionsForAction,
    entityMenuOpen,
  ]);

  const SelectedComponent = useMemo(() => {
    if (action === "delete") {
      switch (selectedEntity) {
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
      switch (selectedEntity) {
        case "position":
          return UpdatePosition;
        case "employee":
          return UpdateEmployee;
        case "currency":
          return UpdateCurrency;
        case "exchangeRate":
          return UpdateExchangeRate;
        case "costType":
          return UpdateCostType;
        case "cost":
          return UpdateCost;
        case "projectType":
          return UpdateProjectType;
        case "sector":
          return UpdateSector;
        case "transactionStatus":
          return UpdateTransactionStatus;
        case "signatureStatus":
          return UpdateSignatureStatus;
        case "signature":
          return UpdateSignature;
        case "recipient":
          return UpdateRecipient;
        case "projectStatus":
          return UpdateProjectStatus;
        case "organizationStatus":
          return UpdateOrganizationStatus;
        case "address":
          return UpdateAddress;
        case "organization":
          return UpdateOrganization;
        case "project":
          return UpdateProject;
        case "budget":
          return UpdateBudget;
        case "document":
          return UpdateDocument;
        case "bankDetail":
          return UpdateBankDetail;
        case "transaction":
          return UpdateTransaction;
        case "paymentOrder":
          return UpdatePaymentOrder;
        case "user":
          return UpdateUser;
        default:
          return UpdatePosition;
      }
    }

    if (action === "restore") {
      switch (selectedEntity) {
        case "position":
          return RestorePosition;
        case "currency":
          return RestoreCurrency;
        case "exchangeRate":
          return RestoreExchangeRate;
        case "costType":
          return RestoreCostType;
        case "cost":
          return RestoreCost;
        case "projectType":
          return RestoreProjectType;
        case "sector":
          return RestoreSector;
        case "transactionStatus":
          return RestoreTransactionStatus;
        case "signatureStatus":
          return RestoreSignatureStatus;
        case "signature":
          return RestoreSignature;
        case "recipient":
          return RestoreRecipient;
        case "projectStatus":
          return RestoreProjectStatus;
        case "organizationStatus":
          return RestoreOrganizationStatus;
        case "address":
          return RestoreAddress;
        case "organization":
          return RestoreOrganization;
        case "project":
          return RestoreProject;
        case "budget":
          return RestoreBudget;
        case "document":
          return RestoreDocument;
        case "bankDetail":
          return RestoreBankDetail;
        case "transaction":
          return RestoreTransaction;
        case "paymentOrder":
          return RestorePaymentOrder;
        case "employee":
          return RestoreEmployee;
        case "user":
        default:
          return RestoreUser;
      }
    }

    switch (selectedEntity) {
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
  }, [action, selectedEntity]);

  const handleActionChange = (e) => {
    setAction(e.target.value);
    setEntityMenuOpen(false);
  };

  const handleEntityLookupFocus = () => {
    setEntityMenuOpen(true);
    setEntitySearch("");
  };

  const handleEntityLookupChange = (e) => {
    setEntitySearch(e.target.value);
    setEntityMenuOpen(true);
  };

  const handleEntityLookupBlur = () => {
    window.setTimeout(() => {
      setEntityMenuOpen(false);

      const normalizedValue = entitySearch.trim().toLowerCase();

      if (!normalizedValue) {
        if (selectedEntityOption) {
          setEntitySearch(selectedEntityOption.label);
        }
        return;
      }

      const exactMatch = entityOptionsForAction.find(
        (option) =>
          option.label.toLowerCase() === normalizedValue ||
          option.value.toLowerCase() === normalizedValue,
      );

      if (exactMatch) {
        setSelectedEntity(exactMatch.value);
        setEntitySearch(exactMatch.label);
        return;
      }

      const partialMatch = entityOptionsForAction.find((option) => {
        const label = option.label.toLowerCase();
        const value = option.value.toLowerCase();

        return (
          label.includes(normalizedValue) || value.includes(normalizedValue)
        );
      });

      if (partialMatch) {
        setSelectedEntity(partialMatch.value);
        setEntitySearch(partialMatch.label);
        return;
      }

      if (selectedEntityOption) {
        setEntitySearch(selectedEntityOption.label);
      }
    }, 150);
  };

  const handleEntityOptionSelect = (option) => {
    setSelectedEntity(option.value);
    setEntitySearch(option.label);
    setEntityMenuOpen(false);
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.selectorCard}>
        <div className={styles.selectorRow}>
          <div className={styles.selectorText}>
            <div className={styles.selectorTitle}>Admin</div>

            <div className={styles.selectorSubtitle}>
              Manage application settings and system data.
            </div>
          </div>
        </div>
      </div>

      <section
        className={styles.content}
        aria-labelledby="application-settings-heading"
      >
        <h2 id="application-settings-heading">Application settings</h2>

        <ThemeSettings />

        <LogoSettings />
      </section>

      <section
        className={styles.content}
        aria-labelledby="user-access-heading"
      >
        <h2 id="user-access-heading">User access</h2>
        <UserRoleManagement />
      </section>

      <section
        className={styles.content}
        aria-labelledby="data-management-heading"
      >
        <h2 id="data-management-heading">Data management</h2>

        <div className={styles.selectorCard}>
          <div className={styles.selectorRow}>
            <div className={styles.selectorText}>
              <div className={styles.selectorTitle}>Manage system data</div>

              <div className={styles.selectorSubtitle}>
                Choose an action first, then search or choose an entity.
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
                  htmlFor="adminEntityLookup"
                >
                  {action === "create" && "Create entity:"}
                  {action === "delete" && "Delete entity:"}
                  {action === "update" && "Update entity:"}
                  {action === "restore" && "Restore entity:"}
                </label>

                <div className={styles.entityLookupWrap}>
                  <input
                    id="adminEntityLookup"
                    className={styles.selectInput}
                    value={entitySearch}
                    onFocus={handleEntityLookupFocus}
                    onChange={handleEntityLookupChange}
                    onBlur={handleEntityLookupBlur}
                    placeholder="Type to search entity..."
                    autoComplete="off"
                  />

                  {entityMenuOpen && (
                    <div className={styles.entityLookupMenu}>
                      {filteredEntityOptions.length > 0 ? (
                        filteredEntityOptions.map((option) => (
                          <button
                            key={`${action}-${option.value}`}
                            type="button"
                            className={`${styles.entityLookupOption} ${
                              option.value === selectedEntity
                                ? styles.entityLookupOptionActive
                                : ""
                            }`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleEntityOptionSelect(option);
                            }}
                          >
                            {option.label}
                          </button>
                        ))
                      ) : (
                        <div className={styles.entityLookupEmpty}>
                          No matching entity
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <SelectedComponent key={`${action}-${selectedEntity}`} />
      </section>
    </div>
  );
};

export default Admin;
