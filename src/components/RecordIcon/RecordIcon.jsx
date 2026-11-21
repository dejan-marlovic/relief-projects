import React from "react";
import { FiLink, FiCheckSquare, FiBriefcase, FiUsers, FiUser, FiCreditCard, FiMapPin, FiBarChart2, FiDollarSign, FiFileText, FiBookOpen, FiClipboard, FiLayers, FiEdit3, FiArrowDownRight, FiExternalLink, FiX } from "react-icons/fi";
import styles from "./RecordIcon.module.scss";

const icons = { link: FiLink, followUp: FiCheckSquare, project: FiBriefcase, organization: FiUsers,
  person: FiUser, bank: FiCreditCard, address: FiMapPin, indicator: FiBarChart2,
  budget: FiDollarSign, transaction: FiDollarSign, payment: FiCreditCard, document: FiFileText,
  finding: FiClipboard, lesson: FiBookOpen, travel: FiMapPin, report: FiClipboard,
  memo: FiEdit3, record: FiLayers, open: FiArrowDownRight, external: FiExternalLink, close: FiX };

// Decorative identity: the adjacent text remains the accessible name and source of meaning.
export default function RecordIcon({ type = "record" }) {
  const Icon = icons[type] || icons.record;
  return <span className={styles.icon} aria-hidden="true"><Icon focusable="false" /></span>;
}
