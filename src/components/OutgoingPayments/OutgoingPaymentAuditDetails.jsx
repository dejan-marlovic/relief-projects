import React from "react";
import { paymentMoney, paymentCurrency } from "../../utils/outgoingPayments";
import styles from "../LineAuditDetails/LineAuditDetails.module.scss";

export default function OutgoingPaymentAuditDetails({ event }) {
  const context = event.outgoingPaymentContext;
  const documents = values => values?.length ? values.map(item => `${item.label || "Document"} (#${item.id})`).join(", ") : "None";
  return <div className={styles.details}>
    <p>Payment order #{event.parentPaymentOrderId ?? "Unknown"}</p>
    {!context ? <p>No payment context recorded.</p> : context.version !== 1 ? <p>Payment context uses an unsupported format.</p> : <dl className={styles.context}>
      {[["Amount paid", paymentMoney(context.amount)], ["Recipient", context.recipientId && `#${context.recipientId}`], ["Recipient commitments", paymentMoney(context.recipientCommitment)], ["Order commitments", paymentMoney(context.orderCommitment)], ["Recorded currency", paymentCurrency(context.currency)], ["Payment date", context.paidDate], ["Recipient organization", context.organization ? `${context.organization.label} (#${context.organization.id})` : "Unknown"], ["Reference", context.externalReference || "Not set"], ["Operation", context.operation?.replaceAll("_", " ")], ["Reason", context.reason], ["Replaces payment", context.replacesPaymentId && `#${context.replacesPaymentId}`], ["Replacement payment", context.replacementPaymentId && `#${context.replacementPaymentId}`], ["Evidence before", documents(context.documentsBefore)], ["Evidence after", documents(context.documentsAfter)]].filter(([, value]) => value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>}
    {context?.denominationMeaning === "INTERPRETATION_ADOPTED_NOW_NOT_HISTORICALLY_VERIFIED" && <p>Commitment denomination adopted at recording time; not historically verified.</p>}
  </div>;
}
