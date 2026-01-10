// src/pages/Organizations/Organization/Organization.jsx
import React, { useState } from "react";
import styles from "./Organization.module.scss";
import {
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import BankDetails from "./BankDetails";
import AddressDetails from "./AddressDetails";

const Cell = ({ children, className }) => (
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

const Organization = ({
  link, // { id, projectId, organizationId, organizationStatusId }
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  organizations = [], // [{id, name}]
  projects = [],
  statuses = [], // [{id, organizationStatusName}]
  visibleCols = [],
  isEven = false,
  fieldErrors = {},
}) => {
  const ev = editedValues || {};
  const isCreate = (link?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate;

  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showAddressDetails, setShowAddressDetails] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

  const getFieldError = (name) => fieldErrors?.[name];
  const hasError = (name) => Boolean(getFieldError(name));
  const inputClass = (name) =>
    `${styles.input} ${hasError(name) ? styles.inputError : ""}`;

  const FieldError = ({ name }) =>
    hasError(name) ? (
      <div className={styles.fieldError}>{getFieldError(name)}</div>
    ) : null;

  const selectOrg = () => (
    <>
      <select
        value={ev.organizationId ?? link.organizationId ?? ""}
        onChange={(e) => onChange("organizationId", toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("organizationId")}
      >
        <option value="">Select organization</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <FieldError name="organizationId" />
    </>
  );

  const selectStatus = () => (
    <>
      <select
        value={ev.organizationStatusId ?? link.organizationStatusId ?? ""}
        onChange={(e) =>
          onChange("organizationStatusId", toNum(e.target.value))
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("organizationStatusId")}
      >
        <option value="">Select status</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.organizationStatusName}
          </option>
        ))}
      </select>
      <FieldError name="organizationStatusId" />
    </>
  );

  const orgName = (id) =>
    organizations.find((o) => o.id === id)?.name || (id ?? "-");

  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.organizationStatusName || (id ?? "-");

  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  return (
    <>
      <div
        className={`${styles.row} ${styles.gridRow} ${
          isEven ? styles.zebraEven : ""
        } ${styles.hoverable}`}
      >
        {/* 0: Actions */}
        <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
          {isEditing ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconCircleBtn}
                onClick={submit}
                title="Save"
                aria-label="Save"
              >
                <FiSave />
              </button>
              <button
                type="button"
                className={styles.dangerIconBtn}
                onClick={onCancel}
                title="Cancel"
                aria-label="Cancel"
              >
                <FiX />
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconCircleBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit"
                aria-label="Edit"
              >
                <FiEdit />
              </button>

              <button
                type="button"
                className={styles.dangerIconBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(link.id);
                }}
                title="Delete"
                aria-label="Delete"
              >
                <FiTrash2 />
              </button>

              {/* toggle address details */}
              {link.organizationId && (
                <button
                  type="button"
                  className={`${styles.iconCircleBtn} ${
                    showAddressDetails ? styles.iconCircleBtnActive : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAddressDetails((v) => !v);
                  }}
                  title={
                    showAddressDetails
                      ? "Hide address details"
                      : "Show address details"
                  }
                  aria-label={
                    showAddressDetails
                      ? "Hide address details"
                      : "Show address details"
                  }
                >
                  {showAddressDetails ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              )}

              {/* toggle bank details */}
              {link.organizationId && (
                <button
                  type="button"
                  className={`${styles.iconCircleBtn} ${
                    showBankDetails ? styles.iconCircleBtnActive : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowBankDetails((v) => !v);
                  }}
                  title={
                    showBankDetails ? "Hide bank details" : "Show bank details"
                  }
                  aria-label={
                    showBankDetails ? "Hide bank details" : "Show bank details"
                  }
                >
                  {showBankDetails ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              )}
            </div>
          )}
        </Cell>

        {/* 1: Organization */}
        <Cell className={hc(1)}>
          {isEditing ? selectOrg() : orgName(link.organizationId)}
        </Cell>

        {/* 2: Status */}
        <Cell className={hc(2)}>
          {isEditing ? selectStatus() : statusName(link.organizationStatusId)}
        </Cell>
      </div>

      {/* Inline address details panel */}
      {showAddressDetails && link.organizationId && (
        <div className={styles.detailsWrapperRow}>
          <AddressDetails organizationId={link.organizationId} />
        </div>
      )}

      {/* Inline bank details panel */}
      {showBankDetails && link.organizationId && (
        <div className={styles.detailsWrapperRow}>
          <BankDetails organizationId={link.organizationId} />
        </div>
      )}
    </>
  );
};

export default Organization;
