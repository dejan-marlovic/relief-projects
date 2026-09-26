import React from "react";
import { receiptMoney, receiptCurrency } from "../../utils/fundingReceipts";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function FundingReceiptAuditDetails({ event }) {
  const context = event.fundingReceiptContext;
  const documents = values => values?.length ? values.map(item => `${item.label || "Document"} (#${item.id})`).join(", ") : "None";
  return <div className={styles.details}>
    <p>Transaction #{event.parentTransactionId ?? "Unknown"}</p>
    {!context ? <p>No receipt context recorded.</p> : context.version !== 1 ? <p>Receipt context uses an unsupported format.</p> : <dl className={styles.context}>
      {[["Amount received", receiptMoney(context.amount)], ["Recorded currency", receiptCurrency(context.currency)], ["Arrival date", context.receivedDate], ["Financier", context.financier ? `${context.financier.label} (#${context.financier.id})` : "Unknown"], ["Reference", context.externalReference || "Not set"], ["Operation", context.operation?.replaceAll("_", " ")], ["Reason", context.reason], ["Replaces receipt", context.replacesReceiptId && `#${context.replacesReceiptId}`], ["Replacement receipt", context.replacementReceiptId && `#${context.replacementReceiptId}`], ["Evidence before", documents(context.documentsBefore)], ["Evidence after", documents(context.documentsAfter)]].filter(([, value]) => value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>}
  </div>;
}
