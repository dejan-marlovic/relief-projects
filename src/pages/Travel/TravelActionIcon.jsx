import React from "react";
import { FiSend, FiCheck, FiCornerUpLeft } from "react-icons/fi";

export function approvalStyle(action, styles) {
  return action === "submit" ? styles.submitButton : action === "approve" ? styles.approveButton : ["return", "withdraw-approval"].includes(action) ? styles.returnButton : undefined;
}
export default function TravelActionIcon({ action }) {
  const Icon = action === "submit" ? FiSend : action === "approve" ? FiCheck : ["return", "withdraw-approval"].includes(action) ? FiCornerUpLeft : null;
  return Icon ? <Icon aria-hidden="true" /> : null;
}
