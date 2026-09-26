/* global BigInt */
import { decimalUnits } from "./transactionFunding";

export const receiptAmountError = value => {
  const units = decimalUnits(value, 3);
  return units == null || units <= BigInt(0) || units > BigInt("9999999999999999999999")
    ? "Enter a positive amount with at most 19 integer digits and 3 decimal places. No rounding is performed." : "";
};
export const receiptMoney = value => value == null ? "Unavailable" : String(value);
export const receiptCurrency = currency => currency ? `${currency.name || currency.label || "Currency"} (#${currency.id})` : "Currency unavailable";
export const receiptStatus = value => ({ NO_RECEIPTS: "No receipts", ALL_RECEIPTS_VOIDED: "All receipts voided", PARTIALLY_RECEIVED: "Partially received", FULLY_RECEIVED: "Fully received", OVER_RECEIVED: "Over received", COMPARISON_UNAVAILABLE: "Comparison unavailable" }[value] || value || "Unavailable");
export const stockholmToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Persist only an in-flight command in this browser tab, so a lost response can
// be retried after navigation/reload with its original key, body and revision.
export const receiptCommandStore = (userId, transactionId) => {
  const key = `funding-receipt-command:${userId}:${transactionId}`;
  return {
    read() { try { return JSON.parse(sessionStorage.getItem(key)) || null; } catch { return null; } },
    save(command) { sessionStorage.setItem(key, JSON.stringify(command)); },
    clear() { sessionStorage.removeItem(key); },
  };
};
