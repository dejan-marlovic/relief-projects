import React from "react";
import styles from "./AuditFieldChanges.module.scss";
const labels = {
  organizationId: "Organization", budgetId: "Budget",
  financierOrganizationId: "Financier organization", transactionStatusId: "Business status",
  appliedForAmount: "Applied-for amount", firstShareAmount: "First-share amount",
  approvedAmount: "Approved amount", ownContribution: "Own contribution",
  secondShareAmount: "Second-share amount", datePlanned: "Planned date/time", okStatus: "OK status",
  budgetDescription: "Description", budgetPreparationDate: "Preparation date/time",
  totalAmount: "Budget total", projectId: "Project", localCurrencyId: "Local currency",
  localExchangeRateToGbpId: "Local-to-GBP exchange rate",
  reportingExchangeRateSekId: "SEK reporting exchange rate", reportingExchangeRateEurId: "EUR reporting exchange rate",
};
export const formatFieldValue = (value, type) => {
  if (value == null) return "Not set";
  if (value === "") return "Empty text";
  if (type === "REFERENCE" && typeof value === "object") {
    return value.label ? `${value.label}${value.id != null ? ` (ID ${value.id})` : ""}` : value.id != null ? `ID ${value.id}` : "Not set";
  }
  // Preserve decimal precision and local date/time without timezone conversion.
  if (typeof value === "string") return type === "LOCAL_DATETIME" ? value.replace("T", " ") : value;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};
export default function AuditFieldChanges({ event }) {
  if (event.action !== "UPDATE") return null;
  if (event.fieldChangesVersion != null && event.fieldChangesVersion !== 1) return <p>Field changes use an unsupported format (version {String(event.fieldChangesVersion)}).</p>;
  const changes = Array.isArray(event.fieldChanges) ? event.fieldChanges.filter((change) => change && typeof change === "object") : [];
  if (!changes.length) return <p>No field changes recorded.</p>;
  return <dl className={styles.changes} aria-label="Updated fields">
    {changes.map((change, index) => <div className={styles.change} key={`${change.field}-${index}`}>
      <dt>{labels[change.field] || change.field || "Unknown field"}</dt>
      <dd><span className={styles.label}>Before</span><span className={styles.value}>{formatFieldValue(change.oldValue, change.type)}</span></dd>
      <dd><span className={styles.label}>After</span><span className={styles.value}>{formatFieldValue(change.newValue, change.type)}</span></dd>
    </div>)}
  </dl>;
}
