import React from "react";
import styles from "./Transaction.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const yesNo = ["Yes", "No"];

function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const Cell = ({ children }) => <div className={styles.cell}>{children}</div>;

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
  exchangeRates = [],
  currencies = [],
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

  const inputNum = (field, step = "1") => (
    <input
      type="number"
      step={step}
      value={ev[field] ?? tx[field] ?? ""}
      onChange={(e) => onChange(field, toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    />
  );

  const selectYesNo = (field) => (
    <select
      value={ev[field] ?? tx[field] ?? ""}
      onChange={(e) => onChange(field, e.target.value)}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select</option>
      {yesNo.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );

  const selectOrg = (field) => (
    <select
      value={ev[field] ?? tx[field] ?? ""}
      onChange={(e) => onChange(field, toNum(e.target.value))}
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

  const selectProject = () => (
    <select
      value={ev.projectId ?? tx.projectId ?? ""}
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

  const selectStatus = () => (
    <select
      value={ev.transactionStatusId ?? tx.transactionStatusId ?? ""}
      onChange={(e) => onChange("transactionStatusId", toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select status</option>
      {statuses.map((s) => (
        <option key={s.id} value={s.id}>
          {s.transactionStatusName}
        </option>
      ))}
    </select>
  );

  // Currency helpers
  const findCurrency = (currencyId) =>
    currencies.find((c) => c.id === currencyId);

  const fxLabelByFxId = (fxId) => {
    if (!fxId) return "-";
    const r = exchangeRates.find((er) => er.id === fxId);
    if (!r) return fxId;
    const cur = findCurrency(r.currencyId);
    const code = cur?.name || `CUR#${r.currencyId}`;
    const rate =
      typeof r.exchangeRate === "number"
        ? r.exchangeRate
        : Number(r.exchangeRate);
    return `${code} @ ${rate}`;
  };

  const selectFx = (field) => (
    <select
      value={ev[field] ?? tx[field] ?? ""}
      onChange={(e) => onChange(field, toNum(e.target.value))}
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    >
      <option value="">Select FX</option>
      {exchangeRates.map((r) => {
        const cur = findCurrency(r.currencyId);
        const code = cur?.name || `CUR#${r.currencyId}`;
        const rate =
          typeof r.exchangeRate === "number"
            ? r.exchangeRate
            : Number(r.exchangeRate);
        return (
          <option key={r.id} value={r.id}>
            {code} @ {rate}
          </option>
        );
      })}
    </select>
  );

  const orgName = (id) =>
    organizations.find((o) => o.id === id)?.name || (id ?? "-");
  const projectName = (id) =>
    projects.find((p) => p.id === id)?.projectName || (id ?? "-");
  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.transactionStatusName || (id ?? "-");

  const inputDate = (
    <input
      type="datetime-local"
      value={toDateTimeLocal(ev.datePlanned ?? tx.datePlanned)}
      onChange={(e) =>
        onChange("datePlanned", new Date(e.target.value).toISOString())
      }
      onBlur={autoSave ? submit : undefined}
      className={styles.input}
    />
  );

  return (
    <div className={`${styles.row} ${styles.gridRow}`}>
      <Cell>
        {isEditing ? selectOrg("organizationId") : orgName(tx.organizationId)}
      </Cell>

      <Cell>{isEditing ? selectProject() : projectName(tx.projectId)}</Cell>

      <Cell>
        {isEditing
          ? selectOrg("financierOrganizationId")
          : orgName(tx.financierOrganizationId)}
      </Cell>

      <Cell>
        {isEditing ? selectStatus() : statusName(tx.transactionStatusId)}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("appliedForAmount", "0.01")
          : tx.appliedForAmount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? selectFx("appliedForExchangeRateId")
          : fxLabelByFxId(tx.appliedForExchangeRateId)}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("firstShareSEKAmount", "0.01")
          : tx.firstShareSEKAmount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("firstShareAmount", "0.01")
          : tx.firstShareAmount ?? "-"}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("approvedAmount", "0.01")
          : tx.approvedAmount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("approvedAmountCurrencyId")
          : tx.approvedAmountCurrencyId ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? selectFx("approvedAmountExchangeRateId")
          : fxLabelByFxId(tx.approvedAmountExchangeRateId)}
      </Cell>

      <Cell>
        {isEditing
          ? inputNum("secondShareAmountSEK", "0.01")
          : tx.secondShareAmountSEK ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("secondShareAmount", "0.01")
          : tx.secondShareAmount ?? "-"}
      </Cell>

      <Cell>
        {isEditing ? selectYesNo("ownContribution") : tx.ownContribution ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputDate
          : tx.datePlanned
          ? new Date(tx.datePlanned).toLocaleString()
          : "-"}
      </Cell>
      <Cell>{isEditing ? selectYesNo("okStatus") : tx.okStatus ?? "-"}</Cell>

      <Cell>
        {isEditing ? (
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={submit} title="Save">
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
                onDelete(tx.id);
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>
    </div>
  );
};

export default Transaction;
