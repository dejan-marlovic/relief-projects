import React from "react";
import styles from "./Transaction.module.scss";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

const yesNo = ["Yes", "No"];

function toDateTimeLocal(iso) {
  if (!iso) return "";
  // ensure we strip Z and seconds to match datetime-local
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

const Transaction = ({
  tx,
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  };

  const ev = editedValues || {};

  return (
    <div className={styles.row}>
      {/* Left block: IDs */}
      <div className={styles.block}>
        <div className={styles.field}>
          <label>Organization</label>
          {isEditing ? (
            <input
              type="number"
              value={ev.organizationId ?? tx.organizationId ?? ""}
              onChange={(e) =>
                onChange("organizationId", Number(e.target.value))
              }
              onBlur={handleSubmit}
            />
          ) : (
            <span>{tx.organizationId ?? "-"}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>Project</label>
          {isEditing ? (
            <input
              type="number"
              value={ev.projectId ?? tx.projectId ?? ""}
              onChange={(e) => onChange("projectId", Number(e.target.value))}
              onBlur={handleSubmit}
            />
          ) : (
            <span>{tx.projectId ?? "-"}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>Financier Org</label>
          {isEditing ? (
            <input
              type="number"
              value={
                ev.financierOrganizationId ?? tx.financierOrganizationId ?? ""
              }
              onChange={(e) =>
                onChange("financierOrganizationId", Number(e.target.value))
              }
              onBlur={handleSubmit}
            />
          ) : (
            <span>{tx.financierOrganizationId ?? "-"}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>Status Id</label>
          {isEditing ? (
            <input
              type="number"
              value={ev.transactionStatusId ?? tx.transactionStatusId ?? ""}
              onChange={(e) =>
                onChange("transactionStatusId", Number(e.target.value))
              }
              onBlur={handleSubmit}
            />
          ) : (
            <span>{tx.transactionStatusId ?? "-"}</span>
          )}
        </div>
      </div>

      {/* Middle block: Amounts */}
      <div className={styles.block}>
        <div className={styles.inlinePair}>
          <div className={styles.field}>
            <label>Applied Amount</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={ev.appliedForAmount ?? tx.appliedForAmount ?? ""}
                onChange={(e) =>
                  onChange("appliedForAmount", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.appliedForAmount ?? "-"}</span>
            )}
          </div>
          <div className={styles.field}>
            <label>Applied FX Id</label>
            {isEditing ? (
              <input
                type="number"
                value={
                  ev.appliedForExchangeRateId ??
                  tx.appliedForExchangeRateId ??
                  ""
                }
                onChange={(e) =>
                  onChange("appliedForExchangeRateId", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.appliedForExchangeRateId ?? "-"}</span>
            )}
          </div>
        </div>

        <div className={styles.inlinePair}>
          <div className={styles.field}>
            <label>1st Share (SEK)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={ev.firstShareSEKAmount ?? tx.firstShareSEKAmount ?? ""}
                onChange={(e) =>
                  onChange("firstShareSEKAmount", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.firstShareSEKAmount ?? "-"}</span>
            )}
          </div>
          <div className={styles.field}>
            <label>1st Share (Orig)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={ev.firstShareAmount ?? tx.firstShareAmount ?? ""}
                onChange={(e) =>
                  onChange("firstShareAmount", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.firstShareAmount ?? "-"}</span>
            )}
          </div>
        </div>

        <div className={styles.inlinePair}>
          <div className={styles.field}>
            <label>Approved Amount</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={ev.approvedAmount ?? tx.approvedAmount ?? ""}
                onChange={(e) =>
                  onChange("approvedAmount", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.approvedAmount ?? "-"}</span>
            )}
          </div>
          <div className={styles.field}>
            <label>Approved Curr Id</label>
            {isEditing ? (
              <input
                type="number"
                value={
                  ev.approvedAmountCurrencyId ??
                  tx.approvedAmountCurrencyId ??
                  ""
                }
                onChange={(e) =>
                  onChange("approvedAmountCurrencyId", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.approvedAmountCurrencyId ?? "-"}</span>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label>Approved FX Id</label>
          {isEditing ? (
            <input
              type="number"
              value={
                ev.approvedAmountExchangeRateId ??
                tx.approvedAmountExchangeRateId ??
                ""
              }
              onChange={(e) =>
                onChange("approvedAmountExchangeRateId", Number(e.target.value))
              }
              onBlur={handleSubmit}
            />
          ) : (
            <span>{tx.approvedAmountExchangeRateId ?? "-"}</span>
          )}
        </div>

        <div className={styles.inlinePair}>
          <div className={styles.field}>
            <label>2nd Share (SEK)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={ev.secondShareAmountSEK ?? tx.secondShareAmountSEK ?? ""}
                onChange={(e) =>
                  onChange("secondShareAmountSEK", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.secondShareAmountSEK ?? "-"}</span>
            )}
          </div>
          <div className={styles.field}>
            <label>2nd Share (Orig)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={ev.secondShareAmount ?? tx.secondShareAmount ?? ""}
                onChange={(e) =>
                  onChange("secondShareAmount", Number(e.target.value))
                }
                onBlur={handleSubmit}
              />
            ) : (
              <span>{tx.secondShareAmount ?? "-"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right block: flags & date */}
      <div className={styles.block}>
        <div className={styles.field}>
          <label>Own Contribution</label>
          {isEditing ? (
            <select
              value={ev.ownContribution ?? tx.ownContribution ?? ""}
              onChange={(e) => onChange("ownContribution", e.target.value)}
              onBlur={handleSubmit}
            >
              <option value="">Select</option>
              {yesNo.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <span>{tx.ownContribution ?? "-"}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>Date Planned</label>
          {isEditing ? (
            <input
              type="datetime-local"
              value={toDateTimeLocal(ev.datePlanned ?? tx.datePlanned)}
              onChange={(e) =>
                onChange("datePlanned", new Date(e.target.value).toISOString())
              }
              onBlur={handleSubmit}
            />
          ) : (
            <span>
              {tx.datePlanned ? new Date(tx.datePlanned).toLocaleString() : "-"}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label>OK Status</label>
          {isEditing ? (
            <select
              value={ev.okStatus ?? tx.okStatus ?? ""}
              onChange={(e) => onChange("okStatus", e.target.value)}
              onBlur={handleSubmit}
            >
              <option value="">Select</option>
              {yesNo.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <span>{tx.okStatus ?? "-"}</span>
          )}
        </div>

        <div className={styles.actions}>
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleSubmit}
                title="Save"
              >
                <FiSave />
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.danger}`}
                onClick={handleCancel}
                title="Cancel"
              >
                <FiX />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
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
                type="button"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transaction;
