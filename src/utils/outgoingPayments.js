/* global BigInt */
import { decimalUnits } from "./transactionFunding";

export const paymentAmountError = value => {
  const units = decimalUnits(value, 6);
  return units == null || units <= BigInt(0) || units > BigInt("9999999999999999999999999")
    ? "Enter a positive amount with at most 19 integer digits and 6 decimal places. No rounding is performed." : "";
};
export const paymentMoney = value => value == null ? "Unavailable" : String(value);
export const paymentCurrency = currency => currency ? `${currency.name || currency.label || "Currency"} (#${currency.id})` : "Currency unavailable";
export const paymentStatus = value => ({ NO_PAYMENTS: "No payments", ALL_PAYMENTS_VOIDED: "All payments voided", PARTIALLY_PAID: "Partially paid", RECIPIENT_FULLY_PAID: "Recipient fully paid", OVER_PAID: "Over paid", COMPARISON_UNAVAILABLE: "Comparison unavailable" }[value] || value || "Unavailable");
export const stockholmToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Persist only an in-flight command in this browser tab, so a lost response can
// be retried after navigation/reload with its original key, body and revision.
export const paymentCommandStore = (userId, paymentOrderId) => {
  const key = `outgoing-payment-command:${userId}:${paymentOrderId}`;
  return {
    read() { try { return JSON.parse(sessionStorage.getItem(key)) || null; } catch { return null; } },
    save(command) { sessionStorage.setItem(key, JSON.stringify(command)); },
    clear() { sessionStorage.removeItem(key); },
  };
};
