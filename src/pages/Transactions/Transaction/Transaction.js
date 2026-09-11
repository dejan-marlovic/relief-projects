import React from "react";
import styles from "./Transaction.module.scss";
import {
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiSend,
  FiCheck,
  FiCornerUpLeft,
} from "react-icons/fi";
import TransactionAllocations from "./TransactionAllocations/TransactionAllocations";
import RecordHistory from "../../../components/RecordHistory/RecordHistory";

const yesNo = ["Yes", "No"];

function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
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
  isSelected = false,
  onSelectChange,
  selectionDisabled = false,
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
  canEdit = false,
  canDelete = false,
  canManageAllocations = false,
  canSubmitLifecycle = false,
  onSubmitLifecycle,
  isSubmittingLifecycle = false,
  canReviewLifecycle = false,
  onApproveLifecycle,
  onReturnLifecycle,
  isReviewingLifecycle = false,
  historyRefreshKey = 0,
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
    projects.find((p) => String(p.id) === String(id))?.projectName || (id ?? "-");
  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.transactionStatusName || (id ?? "-");
  const budgetName = (id) =>
    budgets.find((b) => b.id === id)
      ? budgetLabel(budgets.find((b) => b.id === id))
      : (id ?? "-");

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

  const txIdLabel = isCreate ? "(new)" : tx?.id != null ? `TX#${tx.id}` : "-";
  const lifecycleStatus = tx?.lifecycleStatus || "DRAFT";
  const showSubmitLifecycle =
    !isCreate &&
    canSubmitLifecycle &&
    ["DRAFT", "RETURNED"].includes(lifecycleStatus);
  const showReviewLifecycle =
    !isCreate && canReviewLifecycle && lifecycleStatus === "SUBMITTED";

  return (
    <>
      <div
        ref={rowRef || undefined}
        className={`${styles.row} ${styles.gridRow} ${
          isEven ? styles.zebraEven : ""
        } ${styles.hoverable}`}
      >
        {/* 0: Actions */}
        <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
          {isEditing ? (
            <div className={styles.actions}>
              {canEdit && <button
                type="button"
                className={styles.iconCircleBtn}
                onClick={submit}
                title="Save"
                aria-label="Save"
              >
                <FiSave />
              </button>}

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
              {!isCreate && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={selectionDisabled}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelectChange?.(tx.id, e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title="Select transaction"
                  aria-label={`Select transaction ${tx.id}`}
                  className={styles.rowCheckbox}
                />
              )}

              {canEdit && <button
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
              </button>}

              {showSubmitLifecycle && (
                <button
                  type="button"
                  className={`${styles.iconCircleBtn} ${styles.submitBtn}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSubmitLifecycle?.();
                  }}
                  disabled={isSubmittingLifecycle}
                  title="Submit for approval"
                  aria-label={`Submit transaction ${tx.id} for approval`}
                >
                  <FiSend />
                </button>
              )}

              {showReviewLifecycle && (
                <>
                  <button
                    type="button"
                    className={`${styles.iconCircleBtn} ${styles.approveBtn}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onApproveLifecycle?.();
                    }}
                    disabled={isReviewingLifecycle}
                    title="Approve transaction"
                    aria-label={`Approve transaction ${tx.id}`}
                  >
                    <FiCheck />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconCircleBtn} ${styles.returnBtn}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReturnLifecycle?.();
                    }}
                    disabled={isReviewingLifecycle}
                    title="Return transaction"
                    aria-label={`Return transaction ${tx.id}`}
                  >
                    <FiCornerUpLeft />
                  </button>
                </>
              )}

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

              {canDelete && !isCreate && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnDanger} ${styles.iconOnlyBtn}`}
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
              )}
            </div>
          )}
        </Cell>

        {/* 1: Tx ID (read-only, never editable) */}
        <Cell className={hc(1)}>
          <div className={styles.txIdentity}>
            <span>{txIdLabel}</span>
            {!isCreate && (
              <span
                className={`${styles.statusBadge} ${styles[`status${lifecycleStatus}`] || ""}`}
                aria-label={`Transaction lifecycle status: ${lifecycleStatus}`}
              >
                {lifecycleStatus}
              </span>
            )}
          </div>
        </Cell>

        {/* 2..: rest */}
        <Cell className={hc(2)}>
          {isEditing ? selectOrg("organizationId") : orgName(tx.organizationId)}
        </Cell>

        <Cell className={hc(3)}>
          {projectName(ev.projectId ?? tx.projectId)}
        </Cell>

        <Cell className={hc(4)}>
          {isEditing ? selectBudget() : budgetName(tx.budgetId)}
        </Cell>

        <Cell className={hc(5)}>
          {isEditing
            ? selectOrg("financierOrganizationId")
            : orgName(tx.financierOrganizationId)}
        </Cell>

        <Cell className={hc(6)}>
          {isEditing ? selectStatus() : statusName(tx.transactionStatusId)}
        </Cell>

        <Cell className={hc(7)}>
          {isEditing
            ? inputNum("appliedForAmount", "1")
            : (tx.appliedForAmount ?? "-")}
        </Cell>

        <Cell className={hc(8)}>
          {isEditing
            ? inputNum("firstShareAmount", "0.01")
            : (tx.firstShareAmount ?? "-")}
        </Cell>

        <Cell className={hc(9)}>
          {isEditing
            ? inputNum("approvedAmount", "1")
            : (tx.approvedAmount ?? "-")}
        </Cell>

        <Cell className={hc(10)}>
          {isEditing
            ? inputNum("secondShareAmount", "0.01")
            : (tx.secondShareAmount ?? "-")}
        </Cell>

        <Cell className={hc(11)}>
          {isEditing
            ? selectYesNo("ownContribution")
            : (tx.ownContribution ?? "-")}
        </Cell>

        <Cell className={hc(12)}>
          {isEditing
            ? inputDate
            : tx.datePlanned
              ? new Date(tx.datePlanned).toLocaleString()
              : "-"}
        </Cell>

        <Cell className={hc(13)}>
          {isEditing ? selectYesNo("okStatus") : (tx.okStatus ?? "-")}
        </Cell>
      </div>

      <RecordHistory entityType="TRANSACTION" entityId={tx.id} lifecycleStatus={lifecycleStatus} refreshKey={historyRefreshKey} />
      {expanded && !isCreate && (
        <div className={styles.expandedPanel}>
          <TransactionAllocations
            txId={tx.id}
            costDetailOptions={costDetailOptions}
            budgetOptions={budgets}
            canManage={canManageAllocations}
          />
        </div>
      )}
    </>
  );
};

export default Transaction;
