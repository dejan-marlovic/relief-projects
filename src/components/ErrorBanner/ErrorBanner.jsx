import React from "react";
import { FiAlertCircle, FiX } from "react-icons/fi";

import styles from "./ErrorBanner.module.scss";

const ErrorBanner = ({ message, onDismiss, className = "" }) => {
  if (!message) return null;

  return (
    <div
      className={`${styles.banner} ${className}`.trim()}
      role="alert"
      aria-live="polite"
    >
      <FiAlertCircle className={styles.icon} aria-hidden="true" />
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onDismiss}
          aria-label="Dismiss error message"
          title="Dismiss"
        >
          <FiX aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
