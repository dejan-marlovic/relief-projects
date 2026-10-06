import React from "react";
import { paymentCurrency, paymentMoney } from "../../utils/outgoingPayments";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function RecipientReturnAuditDetails({ event }) {
  const context = event.recipientReturnContext;
  const documents = values => values?.length ? values.map(item => `${item.label || "Document"} (#${item.id})`).join(", ") : "None";
  return <div className={styles.details}><p>Money returned by recipient · Payment order #{event.parentPaymentOrderId ?? "Unknown"}</p>
    {!context ? <p>No return context recorded.</p> : context.version !== 1 ? <p>Unsupported return context format.</p> : <dl className={styles.context}>{[
      ["Original payment", context.originalPaymentId && `#${context.originalPaymentId}`], ["Return collection revision", context.returnsRevision], ["Amount returned", paymentMoney(context.amount)], ["Recorded currency", paymentCurrency(context.currency)], ["Date returned", context.returnedDate], ["Recipient organisation", context.organization ? `${context.organization.label || context.organization.name || "Unknown"} (#${context.organization.id})` : "Unknown"], ["Recipient", context.recipientId && `#${context.recipientId}`], ["Reference", context.externalReference || "Not set"], ["Operation", context.operation], ["Reason for actual return", context.reason], ["Change reason", context.changeReason], ["Replaces return", context.replacesReturnId && `#${context.replacesReturnId}`], ["Replacement return", context.replacementReturnId && `#${context.replacementReturnId}`], ["Evidence before", documents(context.documentsBefore)], ["Evidence after", documents(context.documentsAfter)],
    ].filter(([, value]) => value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
  </div>;
}
