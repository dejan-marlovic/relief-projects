import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUploadCloud } from "react-icons/fi";

import { BASE_URL } from "../../../config/api";
import { useBranding } from "../../../context/BrandingContext";
import { createAuthFetch, safeReadJson } from "../../../utils/http";

import styles from "./LogoSettings.module.scss";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

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
      return "The logo must be smaller than 2 MB.";
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

      setMessage("The logo was updated for all users and devices.");
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
    <section className={styles.container}>
      <div className={styles.heading}>
        <h2>Application logo</h2>

        <p>
          Upload the logo displayed in the application header and on the login
          page.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.previewPanel}>
          <span className={styles.previewLabel}>Current logo</span>

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

          <span className={styles.logoStatus}>
            {customLogo ? "Custom logo" : "Default logo"}
          </span>
        </div>

        <div className={styles.instructions}>
          <h3>Recommended format</h3>

          <ul>
            <li>
              Use a PNG image with a transparent background for the best result.
            </li>

            <li>JPG and JPEG images are also supported.</li>

            <li>Use a horizontal logo with approximately a 2:1 ratio.</li>

            <li>Recommended resolution: 600 × 300 pixels.</li>

            <li>Minimum recommended resolution: 200 × 100 pixels.</li>

            <li>Maximum file size: 2 MB.</li>

            <li>Avoid unnecessary empty space around the logo.</li>
          </ul>

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
            <FiUploadCloud className={styles.dropzoneIcon} aria-hidden="true" />

            <div className={styles.dropzoneText}>
              {saving ? (
                <strong>Uploading logo…</strong>
              ) : (
                <>
                  <strong>Drag & drop</strong>
                  <span>or click to select a logo</span>
                </>
              )}

              <span className={styles.dropzoneHint}>
                PNG or JPG · maximum 2 MB
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

          {customLogo && (
            <div className={styles.restoreArea}>
              <button
                type="button"
                className={styles.restoreButton}
                disabled={saving}
                onClick={handleRestoreDefault}
              >
                Restore default logo
              </button>
            </div>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default LogoSettings;
