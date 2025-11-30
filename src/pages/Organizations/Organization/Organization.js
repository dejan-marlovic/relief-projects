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
  projects = [], // [{id, projectName}]
  statuses = [], // [{id, organizationStatusName}]
  visibleCols = [],
  isEven = false,
}) => {
  const ev = editedValues || {};
  const isCreate = (link?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate;

  const [showBankDetails, setShowBankDetails] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

  const selectProject = () => (
    <select
      value={ev.projectId ?? link.projectId ?? ""}
      onChange={(e) => onChange("projectId", toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.projectName}
        </option>
      ))}
    </select>
  );

  const selectOrg = () => (
    <select
      value={ev.organizationId ?? link.organizationId ?? ""}
      onChange={(e) => onChange("organizationId", toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select organization</option>
      {organizations.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );

  const selectStatus = () => (
    <select
      value={ev.organizationStatusId ?? link.organizationStatusId ?? ""}
      onChange={(e) => onChange("organizationStatusId", toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select status</option>
      {statuses.map((s) => (
        <option key={s.id} value={s.id}>
          {s.organizationStatusName}
        </option>
      ))}
    </select>
  );

  const projectName = (id) =>
    projects.find((p) => p.id === id)?.projectName || (id ?? "-");

  const orgName = (id) =>
    organizations.find((o) => o.id === id)?.name || (id ?? "-");

  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.organizationStatusName || (id ?? "-");

  // helper to apply hidden class when column is collapsed to 0px
  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  return (
    <>
      {/* main row */}
      <div
        className={`${styles.row} ${styles.gridRow} ${
          isEven ? styles.zebraEven : ""
        } ${styles.hoverable}`}
      >
        {/* 0: Actions (sticky left) */}
        <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
          {isEditing ? (
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={submit}
                title="Save"
              >
                <FiSave />
              </button>
              <button
                className={`${styles.actionBtn} ${styles.danger}`}
                onClick={onCancel}
                title="Cancel"
              >
                <FiX />
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit"
              >
                <FiEdit />
              </button>
              <button
                className={`${styles.actionBtn} ${styles.danger}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(link.id);
                }}
                title="Delete"
              >
                <FiTrash2 />
              </button>

              {/* toggle bank details, only if org selected */}
              {link.organizationId && (
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowBankDetails((v) => !v);
                  }}
                  title="Toggle bank details"
                >
                  {showBankDetails ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              )}
            </div>
          )}
        </Cell>

        {/* 1..3 normal columns */}
        <Cell className={hc(1)}>
          {isEditing ? selectProject() : projectName(link.projectId)}
        </Cell>
        <Cell className={hc(2)}>
          {isEditing ? selectOrg() : orgName(link.organizationId)}
        </Cell>
        <Cell className={hc(3)}>
          {isEditing ? selectStatus() : statusName(link.organizationStatusId)}
        </Cell>
      </div>

      {/* inline bank details panel */}
      {showBankDetails && link.organizationId && (
        <div className={styles.bankDetailsWrapperRow}>
          <BankDetails organizationId={link.organizationId} />
        </div>
      )}
    </>
  );
};

export default Organization;
