import React from "react";
import styles from "./Transaction.module.scss";
import {
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import TransactionAllocations from "./TransactionAllocations/TransactionAllocations";

const yesNo = ["Yes", "No"];

function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const Cell = ({ children, className }) => (
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

const Transaction = ({
  tx,
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  organizations = [],
  projects = [],
  statuses = [],
  budgets = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {},
  rowRef = null,

  // allocations
  expanded = false,
  onToggleAllocations,
  costDetailOptions = [],
}) => {
  const ev = editedValues || {};
  const isCreate = (tx?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate;

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

  const inputNum = (field, step = "1") => (
    <>
      <input
        type="number"
        step={step}
        value={ev[field] ?? tx[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      />
      <FieldError name={field} />
    </>
  );

  const selectYesNo = (field) => (
    <>
      <select
        value={ev[field] ?? tx[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      >
        <option value="">Select</option>
        {yesNo.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <FieldError name={field} />
    </>
  );

  const selectOrg = (field) => (
    <>
      <select
        value={ev[field] ?? tx[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      >
        <option value="">Select organization</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <FieldError name={field} />
    </>
  );

  const selectProject = () => (
    <>
      <select
        value={ev.projectId ?? tx.projectId ?? ""}
        onChange={(e) => onChange("projectId", toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("projectId")}
      >
        <option value="">Select project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.projectName}
          </option>
        ))}
      </select>
      <FieldError name="projectId" />
    </>
  );

  const selectStatus = () => (
    <>
      <select
        value={ev.transactionStatusId ?? tx.transactionStatusId ?? ""}
        onChange={(e) => onChange("transactionStatusId", toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("transactionStatusId")}
      >
        <option value="">Select status</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.transactionStatusName}
          </option>
        ))}
      </select>
      <FieldError name="transactionStatusId" />
    </>
  );

  const budgetLabel = (b) => {
    if (!b) return "-";
    const desc = b.budgetDescription || b.description || "";
    return desc ? `${b.id} — ${desc}` : String(b.id);
  };

  const selectBudget = () => (
    <>
      <select
        value={ev.budgetId ?? tx.budgetId ?? ""}
        onChange={(e) => onChange("budgetId", toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass("budgetId")}
      >
        <option value="">Select budget</option>
        {budgets.map((b) => (
          <option key={b.id} value={b.id}>
            {budgetLabel(b)}
          </option>
        ))}
      </select>
      <FieldError name="budgetId" />
    </>
  );

  const orgName = (id) =>
    organizations.find((o) => o.id === id)?.name || (id ?? "-");
  const projectName = (id) =>
    projects.find((p) => p.id === id)?.projectName || (id ?? "-");
  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.transactionStatusName || (id ?? "-");
  const budgetName = (id) =>
    budgets.find((b) => b.id === id)
      ? budgetLabel(budgets.find((b) => b.id === id))
      : id ?? "-";

  const inputDate = (
    <>
      <input
        type="datetime-local"
        value={toDateTimeLocal(ev.datePlanned ?? tx.datePlanned)}
        onChange={(e) =>
          onChange("datePlanned", new Date(e.target.value).toISOString())
        }
        onBlur={autoSave ? submit : undefined}
        className={inputClass("datePlanned")}
      />
      <FieldError name="datePlanned" />
    </>
  );

  const hc = (i) => (!visibleCols[i] ? styles.hiddenCol : "");

  return (
    <>
      <div
        ref={rowRef || undefined}
        className={`${styles.row} ${styles.gridRow} ${
          isEven ? styles.zebraEven : ""
        } ${styles.hoverable}`}
      >
        {/* Actions */}
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
                className={styles.iconCircleBtn}
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

              {!isCreate && (
                <button
                  type="button"
                  className={styles.iconCircleBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleAllocations?.();
                  }}
                  title={expanded ? "Hide allocations" : "Show allocations"}
                  aria-label={
                    expanded ? "Hide allocations" : "Show allocations"
                  }
                >
                  {expanded ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              )}

              <button
                type="button"
                className={styles.dangerIconBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(tx.id);
                }}
                title="Delete"
                aria-label="Delete"
              >
                <FiTrash2 />
              </button>
            </div>
          )}
        </Cell>

        <Cell className={hc(1)}>
          {isEditing ? selectOrg("organizationId") : orgName(tx.organizationId)}
        </Cell>
        <Cell className={hc(2)}>
          {isEditing ? selectProject() : projectName(tx.projectId)}
        </Cell>

        {/* ✅ NEW */}
        <Cell className={hc(3)}>
          {isEditing ? selectBudget() : budgetName(tx.budgetId)}
        </Cell>

        <Cell className={hc(4)}>
          {isEditing
            ? selectOrg("financierOrganizationId")
            : orgName(tx.financierOrganizationId)}
        </Cell>
        <Cell className={hc(5)}>
          {isEditing ? selectStatus() : statusName(tx.transactionStatusId)}
        </Cell>

        <Cell className={hc(6)}>
          {isEditing
            ? inputNum("appliedForAmount", "1")
            : tx.appliedForAmount ?? "-"}
        </Cell>

        <Cell className={hc(7)}>
          {isEditing
            ? inputNum("firstShareAmount", "0.01")
            : tx.firstShareAmount ?? "-"}
        </Cell>

        <Cell className={hc(8)}>
          {isEditing
            ? inputNum("approvedAmount", "1")
            : tx.approvedAmount ?? "-"}
        </Cell>

        <Cell className={hc(9)}>
          {isEditing
            ? inputNum("secondShareAmount", "0.01")
            : tx.secondShareAmount ?? "-"}
        </Cell>

        <Cell className={hc(10)}>
          {isEditing
            ? selectYesNo("ownContribution")
            : tx.ownContribution ?? "-"}
        </Cell>

        <Cell className={hc(11)}>
          {isEditing
            ? inputDate
            : tx.datePlanned
            ? new Date(tx.datePlanned).toLocaleString()
            : "-"}
        </Cell>

        <Cell className={hc(12)}>
          {isEditing ? selectYesNo("okStatus") : tx.okStatus ?? "-"}
        </Cell>
      </div>

      {expanded && !isCreate && (
        <div className={styles.expandedPanel}>
          <TransactionAllocations
            txId={tx.id}
            costDetailOptions={costDetailOptions}
            budgetOptions={budgets} // ✅ add this
          />
        </div>
      )}
    </>
  );
};

export default Transaction;
