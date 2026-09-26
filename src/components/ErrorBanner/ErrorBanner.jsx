import React, { useEffect, useRef } from "react";
import { FiAlertCircle, FiX } from "react-icons/fi";

import styles from "./ErrorBanner.module.scss";

const ErrorBanner = ({ message, onDismiss, className = "" }) => {
  const bannerRef = useRef(null);

  useEffect(() => {
    if (!message || typeof bannerRef.current?.scrollIntoView !== "function") {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    bannerRef.current.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={bannerRef}
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
