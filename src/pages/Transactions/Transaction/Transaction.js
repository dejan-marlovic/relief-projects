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
  exchangeRates = [],
  currencies = [],
  visibleCols = [],
  isEven = false,
  fieldErrors = {}, // per-row field errors
  rowRef = null, // NEW: for scrolling the "new" row into view
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

  // error helpers
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

  // ===== Currency helpers =====
  const findCurrency = (currencyId) => {
    if (currencyId == null) return undefined;
    const numericId =
      typeof currencyId === "string" ? Number(currencyId) : currencyId;
    return currencies.find((c) => c.id === numericId);
  };

  const currencyLabelById = (currencyId) => {
    if (!currencyId) return "-";
    const cur = findCurrency(currencyId);
    return cur ? cur.name : currencyId;
  };

  const selectCurrency = (field) => (
    <>
      <select
        value={ev[field] ?? tx[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      >
        <option value="">Select currency</option>
        {currencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.description}
          </option>
        ))}
      </select>
      <FieldError name={field} />
    </>
  );

  // ===== FX helpers =====
  const formatRateLabel = (r) => {
    if (!r) return "-";

    const baseCur = findCurrency(r.baseCurrencyId);
    const quoteCur = findCurrency(r.quoteCurrencyId);

    const baseName = baseCur?.name || `CUR#${r.baseCurrencyId}`;
    const quoteName = quoteCur?.name || `CUR#${r.quoteCurrencyId}`;

    const rate = typeof r.rate === "number" ? r.rate : Number(r.rate);

    if (!Number.isFinite(rate)) {
      return `1 ${baseName} → ? ${quoteName}`;
    }

    return `1 ${baseName} → ${rate} ${quoteName}`;
  };

  const fxLabelByFxId = (fxId) => {
    if (!fxId) return "-";

    const numericId = typeof fxId === "string" ? Number(fxId) : fxId;

    const r = exchangeRates.find((er) => {
      const erId = typeof er.id === "string" ? Number(er.id) : er.id;
      return erId === numericId;
    });

    if (!r) return fxId;
    return formatRateLabel(r);
  };

  const selectFx = (field) => (
    <>
      <select
        value={ev[field] ?? tx[field] ?? ""}
        onChange={(e) => onChange(field, toNum(e.target.value))}
        onBlur={autoSave ? submit : undefined}
        className={inputClass(field)}
      >
        <option value="">Select FX</option>
        {exchangeRates.map((r) => (
          <option key={r.id} value={r.id}>
            {formatRateLabel(r)}
          </option>
        ))}
      </select>
      <FieldError name={field} />
    </>
  );

  const orgName = (id) =>
    organizations.find((o) => o.id === id)?.name || (id ?? "-");
  const projectName = (id) =>
    projects.find((p) => p.id === id)?.projectName || (id ?? "-");
  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.transactionStatusName || (id ?? "-");

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
    <div
      ref={rowRef || undefined}
      className={`${styles.row} ${styles.gridRow} ${
        isEven ? styles.zebraEven : ""
      } ${styles.hoverable}`}
    >
      {/* 0: Actions (sticky left) */}
      <Cell className={`${styles.stickyCol} ${styles.actionsCol} ${hc(0)}`}>
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

      {/* Data columns */}
      <Cell className={hc(1)}>
        {isEditing ? selectOrg("organizationId") : orgName(tx.organizationId)}
      </Cell>
      <Cell className={hc(2)}>
        {isEditing ? selectProject() : projectName(tx.projectId)}
      </Cell>
      <Cell className={hc(3)}>
        {isEditing
          ? selectOrg("financierOrganizationId")
          : orgName(tx.financierOrganizationId)}
      </Cell>
      <Cell className={hc(4)}>
        {isEditing ? selectStatus() : statusName(tx.transactionStatusId)}
      </Cell>

      <Cell className={hc(5)}>
        {isEditing
          ? inputNum("appliedForAmount", "0.01")
          : tx.appliedForAmount ?? "-"}
      </Cell>
      <Cell className={hc(6)}>
        {isEditing
          ? selectFx("appliedForExchangeRateId")
          : fxLabelByFxId(tx.appliedForExchangeRateId)}
      </Cell>

      <Cell className={hc(7)}>
        {isEditing
          ? inputNum("firstShareSEKAmount", "0.01")
          : tx.firstShareSEKAmount ?? "-"}
      </Cell>
      <Cell className={hc(8)}>
        {isEditing
          ? inputNum("firstShareAmount", "0.01")
          : tx.firstShareAmount ?? "-"}
      </Cell>

      <Cell className={hc(9)}>
        {isEditing
          ? inputNum("approvedAmount", "0.01")
          : tx.approvedAmount ?? "-"}
      </Cell>

      <Cell className={hc(10)}>
        {isEditing
          ? selectCurrency("approvedAmountCurrencyId")
          : currencyLabelById(tx.approvedAmountCurrencyId)}
      </Cell>

      <Cell className={hc(11)}>
        {isEditing
          ? selectFx("approvedAmountExchangeRateId")
          : fxLabelByFxId(tx.approvedAmountExchangeRateId)}
      </Cell>

      <Cell className={hc(12)}>
        {isEditing
          ? inputNum("secondShareAmountSEK", "0.01")
          : tx.secondShareAmountSEK ?? "-"}
      </Cell>
      <Cell className={hc(13)}>
        {isEditing
          ? inputNum("secondShareAmount", "0.01")
          : tx.secondShareAmount ?? "-"}
      </Cell>

      <Cell className={hc(14)}>
        {isEditing ? selectYesNo("ownContribution") : tx.ownContribution ?? "-"}
      </Cell>
      <Cell className={hc(15)}>
        {isEditing
          ? inputDate
          : tx.datePlanned
          ? new Date(tx.datePlanned).toLocaleString()
          : "-"}
      </Cell>

      <Cell className={hc(16)}>
        {isEditing ? selectYesNo("okStatus") : tx.okStatus ?? "-"}
      </Cell>
    </div>
  );
};

export default Transaction;
