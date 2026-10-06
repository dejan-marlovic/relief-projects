import React from "react";
import { receiptCurrency, receiptMoney } from "../../utils/fundingReceipts";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function FundingReturnAuditDetails({ event }) {
  const context = event.fundingReturnContext;
  const documents = values => values?.length ? values.map(item => `${item.label || "Document"} (#${item.id})`).join(", ") : "None";
  return <div className={styles.details}><p>Money returned to financier · Transaction #{event.parentTransactionId ?? "Unknown"}</p>
    {!context ? <p>No return context recorded.</p> : context.version !== 1 ? <p>Unsupported return context format.</p> : <dl className={styles.context}>{[
      ["Original receipt", context.originalReceiptId && `#${context.originalReceiptId}`], ["Return collection revision", context.returnsRevision], ["Amount returned", receiptMoney(context.amount)], ["Recorded currency", receiptCurrency(context.currency)], ["Date returned", context.returnedDate], ["Financier", context.financier ? `${context.financier.label || context.financier.name || "Unknown"} (#${context.financier.id})` : "Unknown"], ["Reference", context.externalReference || "Not set"], ["Operation", context.operation], ["Reason for actual return", context.reason], ["Change reason", context.changeReason], ["Replaces return", context.replacesReturnId && `#${context.replacesReturnId}`], ["Replacement return", context.replacementReturnId && `#${context.replacementReturnId}`], ["Evidence before", documents(context.documentsBefore)], ["Evidence after", documents(context.documentsAfter)],
    ].filter(([, value]) => value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
  </div>;
}
