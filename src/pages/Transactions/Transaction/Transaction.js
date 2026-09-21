import { fundingCurrencyLabel } from "../../../utils/transactionFunding";
import { budgetOptionLabel } from "../../../utils/budgetDisplay";
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
import FinancialDocuments from "../../../components/FinancialDocuments/FinancialDocuments";

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
  compact = false,
  saving = false,
  editingLocked = false,
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
  onAllocationMutationSuccess,
}) => {
  const ev = editedValues || {};
  const isCreate = (tx?.id ?? "") === "new";
  const autoSave = isEditing && !isCreate && !compact;

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const fieldLabels = { organizationId: "Organization", financierOrganizationId: "Financier", transactionStatusId: "Status", budgetId: "Budget", appliedForAmount: "Requested funding", approvedAmount: "Approved funding", ownContribution: "Own contribution", okStatus: "OK status", datePlanned: "Date planned" };
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
        disabled={saving}
        type="number"
        step={step}
        aria-label={fieldLabels[field]}
        value={ev[field] ?? tx[field] ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      />
      <FieldError name={field} />
    </>
  );

  const selectYesNo = (field) => (
    <>
      <select
        disabled={saving}
        aria-label={fieldLabels[field]}
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
        disabled={saving}
        aria-label={fieldLabels[field]}
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
        disabled={saving}
        aria-label={fieldLabels.transactionStatusId}
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
    return budgetOptionLabel(b);
  };

  const selectBudget = () => (
    <>
      <select
        disabled={saving}
        aria-label={fieldLabels.budgetId}
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
        disabled={saving}
        aria-label="Date planned"
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

  const hc = (i) => (!compact && !visibleCols[i] ? styles.hiddenCol : "");

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
                disabled={saving}
                onClick={submit}
                title="Save"
                aria-label="Save"
              >
                <FiSave />{compact && <span>Save</span>}
              </button>}

              <button
                type="button"
                className={styles.iconCircleBtn}
                disabled={saving}
                onClick={onCancel}
                title="Cancel"
                aria-label="Cancel"
              >
                <FiX />{compact && <span>Cancel</span>}
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              {!isCreate && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={selectionDisabled || saving || editingLocked}
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
                disabled={saving || editingLocked}
                title="Edit"
                aria-label="Edit"
              >
                <FiEdit />{compact && <span>Edit</span>}
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
                  disabled={isSubmittingLifecycle || saving || editingLocked}
                  title="Submit for approval"
                  aria-label={`Submit transaction ${tx.id} for approval`}
                >
                  <FiSend />{compact && <span>Submit</span>}
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
                    disabled={isReviewingLifecycle || saving || editingLocked}
                    title="Approve transaction"
                    aria-label={`Approve transaction ${tx.id}`}
                  >
                    <FiCheck />{compact && <span>Approve</span>}
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconCircleBtn} ${styles.returnBtn}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReturnLifecycle?.();
                    }}
                    disabled={isReviewingLifecycle || saving || editingLocked}
                    title="Return transaction"
                    aria-label={`Return transaction ${tx.id}`}
                  >
                    <FiCornerUpLeft />{compact && <span>Return</span>}
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
                  disabled={saving || editingLocked}
                  title={expanded ? "Hide allocations" : "Show allocations"}
                  aria-label={
                    expanded ? "Hide allocations" : "Show allocations"
                  }
                >
                  {expanded ? <FiChevronUp /> : <FiChevronDown />}{compact && <span>Allocations</span>}
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
                  disabled={saving || editingLocked}
                  title="Delete"
                  aria-label="Delete"
                >
                  <FiTrash2 />{compact && <span>Delete</span>}
                </button>
              )}
            </div>
          )}
        </Cell>

        {/* 1: Tx ID (read-only, never editable) */}
        <Cell className={hc(1)}>
          {compact && <span className={styles.fieldLabel}>Transaction</span>}
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
          {compact && <span className={styles.fieldLabel}>Organization</span>}
          {isEditing ? selectOrg("organizationId") : orgName(tx.organizationId)}
        </Cell>

        <Cell className={hc(3)}>
          {compact && <span className={styles.fieldLabel}>Project</span>}
          {projectName(ev.projectId ?? tx.projectId)}
        </Cell>

        <Cell className={hc(4)}>
          {compact && <span className={styles.fieldLabel}>Budget</span>}
          {isEditing ? selectBudget() : budgetName(tx.budgetId)}
        </Cell>

        <Cell className={hc(5)}>
          {compact && <span className={styles.fieldLabel}>Financier</span>}
          {isEditing
            ? selectOrg("financierOrganizationId")
            : orgName(tx.financierOrganizationId)}
        </Cell>

        <Cell className={hc(6)}>
          {compact && <span className={styles.fieldLabel}>Status</span>}
          {isEditing ? selectStatus() : statusName(tx.transactionStatusId)}
        </Cell>

        <Cell className={hc(7)}>
          {compact && <span className={styles.fieldLabel}>Requested funding</span>}
          {isEditing
            ? inputNum("appliedForAmount", "any")
            : (tx.appliedForAmount ?? "-")}
        </Cell>


        <Cell className={hc(8)}>
          {compact && <span className={styles.fieldLabel}>Approved funding</span>}
          {isEditing
            ? inputNum("approvedAmount", "any")
            : (tx.approvedAmount ?? "-")}
        </Cell>


        <Cell className={hc(9)}>
          {compact && <span className={styles.fieldLabel}>Own contribution</span>}
          {isEditing
            ? selectYesNo("ownContribution")
            : (tx.ownContribution ?? "-")}
        </Cell>

        <Cell className={hc(10)}>
          {compact && <span className={styles.fieldLabel}>Date planned</span>}
          {isEditing
            ? inputDate
            : tx.datePlanned
              ? new Date(tx.datePlanned).toLocaleString()
              : "-"}
        </Cell>

        <Cell className={hc(11)}>
          {compact && <span className={styles.fieldLabel}>OK status</span>}
          {isEditing ? selectYesNo("okStatus") : (tx.okStatus ?? "-")}
        </Cell>
      </div>

      <p className={styles.currencyNote}>Current budget currency: <strong>{isCreate ? "Follows selected budget" : fundingCurrencyLabel(tx.fundingCurrency)}</strong> · Current configuration, not verified historical denomination.</p>
      <RecordHistory entityType="TRANSACTION" entityId={tx.id} lifecycleStatus={lifecycleStatus} refreshKey={historyRefreshKey} />
      <FinancialDocuments entityType="TRANSACTION" entityId={tx.id} lifecycleStatus={lifecycleStatus} refreshKey={historyRefreshKey} editingLocked={isEditing} />
      {expanded && !isCreate && (
        <div className={styles.expandedPanel}>
          <TransactionAllocations
            onMutationSuccess={onAllocationMutationSuccess}
            txId={tx.id}
            refreshKey={historyRefreshKey}
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
