import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiImage,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";

import { BASE_URL } from "../../../config/api";
import { useBranding } from "../../../context/BrandingContext";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

import styles from "./LogoSettings.module.scss";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = ["image/png", "image/jpeg"];

function LogoSettings() {
  const navigate = useNavigate();
  const authFetch = createAuthFetch(navigate);
  const fileInputRef = useRef(null);

  const { logoUrl, customLogo, refreshBranding } = useBranding();

  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const resetMessages = () => {
    setError("");
    setMessage("");
  };

  const validateLogo = (file) => {
    if (!file) {
      return "Please select a logo image.";
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Please select a PNG, JPG, or JPEG image.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "The logo must be smaller than 4 MB.";
    }

    return null;
  };

  const uploadLogo = async (file) => {
    resetMessages();

    const validationError = validateLogo(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setSaving(true);

    try {
      const response = await authFetch(`${BASE_URL}/api/branding/logo`, {
        method: "POST",
        body: formData,
      });

      const data = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message || data?.detail || "The logo could not be uploaded.",
        );
      }

      await refreshBranding();

      setMessage("The application logo was updated successfully.");
    } catch (uploadError) {
      setError(uploadError.message || "The logo could not be uploaded.");
    } finally {
      setSaving(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      uploadLogo(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    if (saving) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (file) {
      uploadLogo(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    if (!saving) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const openFilePicker = () => {
    if (!saving) {
      fileInputRef.current?.click();
    }
  };

  const handlePickerKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleRestoreDefault = async () => {
    resetMessages();
    setSaving(true);

    try {
      const response = await authFetch(`${BASE_URL}/api/branding/logo`, {
        method: "DELETE",
      });

      const data = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            "The default logo could not be restored.",
        );
      }

      await refreshBranding();

      setMessage("The default Relief Projects logo was restored.");
    } catch (restoreError) {
      setError(
        restoreError.message || "The default logo could not be restored.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.logoSettings}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <h2 className={styles.pageTitle}>Application logo</h2>

          <p className={styles.pageSubtitle}>
            Manage the logo displayed in the application header and on the login
            page.
          </p>
        </div>

        <div
          className={`${styles.statusBadge} ${
            customLogo ? styles.statusBadgeCustom : styles.statusBadgeDefault
          }`}
        >
          <FiImage aria-hidden="true" />

          <span>{customLogo ? "Custom logo" : "Default logo"}</span>
        </div>
      </header>

      <div className={styles.settingsGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Current logo</h3>

              <p className={styles.cardSubtitle}>
                Preview of the logo currently visible to users.
              </p>
            </div>
          </div>

          <div className={styles.preview}>
            <img
              src={logoUrl}
              alt="Current application logo"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/logo.png";
              }}
            />
          </div>

          <div className={styles.previewFooter}>
            <span
              className={`${styles.logoIndicator} ${
                customLogo
                  ? styles.logoIndicatorCustom
                  : styles.logoIndicatorDefault
              }`}
            />

            <span>
              {customLogo
                ? "A custom logo is currently active."
                : "The original Relief Projects logo is active."}
            </span>
          </div>

          {customLogo && (
            <button
              type="button"
              className={styles.restoreButton}
              disabled={saving}
              onClick={handleRestoreDefault}
            >
              <FiRefreshCw aria-hidden="true" />

              <span>{saving ? "Please wait..." : "Restore default logo"}</span>
            </button>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Upload a new logo</h3>

              <p className={styles.cardSubtitle}>
                The new logo will be used for all users and devices.
              </p>
            </div>
          </div>

          <div
            className={`${styles.dropzone} ${
              dragActive ? styles.dropzoneActive : ""
            } ${saving ? styles.dropzoneDisabled : ""}`}
            onClick={openFilePicker}
            onKeyDown={handlePickerKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={saving ? -1 : 0}
            aria-disabled={saving}
            aria-label="Select or drop an application logo"
          >
            <div className={styles.dropzoneIconWrap}>
              <FiUploadCloud
                className={styles.dropzoneIcon}
                aria-hidden="true"
              />
            </div>

            <div className={styles.dropzoneText}>
              {saving ? (
                <>
                  <strong>Uploading logo...</strong>

                  <span>Please wait while the new logo is saved.</span>
                </>
              ) : (
                <>
                  <strong>Drag and drop your logo here</strong>

                  <span>or click anywhere in this area to select a file</span>
                </>
              )}

              <span className={styles.dropzoneHint}>
                PNG or JPG, maximum 4 MB
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className={styles.fileInput}
            disabled={saving}
            onChange={handleFileInput}
          />

          <div className={styles.formatGuide}>
            <h4 className={styles.formatGuideTitle}>Recommended format</h4>

            <div className={styles.requirementGrid}>
              <div className={styles.requirement}>
                <span className={styles.requirementLabel}>File type</span>

                <span className={styles.requirementValue}>
                  Transparent PNG preferred
                </span>
              </div>

              <div className={styles.requirement}>
                <span className={styles.requirementLabel}>
                  Recommended size
                </span>

                <span className={styles.requirementValue}>
                  600 x 300 pixels
                </span>
              </div>

              <div className={styles.requirement}>
                <span className={styles.requirementLabel}>Shape</span>

                <span className={styles.requirementValue}>
                  Horizontal, approximately 2:1
                </span>
              </div>

              <div className={styles.requirement}>
                <span className={styles.requirementLabel}>
                  Maximum file size
                </span>

                <span className={styles.requirementValue}>4 MB</span>
              </div>
            </div>

            <p className={styles.formatNote}>
              For the clearest result, avoid unnecessary empty space around the
              logo.
            </p>
          </div>

          {error && (
            <div className={`${styles.feedback} ${styles.error}`} role="alert">
              <FiAlertCircle
                className={styles.feedbackIcon}
                aria-hidden="true"
              />

              <span>{error}</span>
            </div>
          )}

          {message && (
            <div
              className={`${styles.feedback} ${styles.success}`}
              role="status"
            >
              <FiCheckCircle
                className={styles.feedbackIcon}
                aria-hidden="true"
              />

              <span>{message}</span>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default LogoSettings;
