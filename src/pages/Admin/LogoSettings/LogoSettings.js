import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const resetMessages = () => {
    setError("");
    setMessage("");
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    resetMessages();

    const file = event.target.files?.[0];

    if (!file) {
      clearSelection();
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please select a PNG, JPG, or JPEG image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The logo must be smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    resetMessages();

    if (!selectedFile) {
      setError("Please select a logo first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setSaving(true);

    try {
      const response = await authFetch(`${BASE_URL}/api/branding/logo`, {
        method: "POST",
        body: formData,
      });

      const data = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(data?.message || "The logo could not be uploaded.");
      }

      clearSelection();
      await refreshBranding();

      setMessage("The logo was updated for all users and devices.");
    } catch (uploadError) {
      setError(uploadError.message || "The logo could not be uploaded.");
    } finally {
      setSaving(false);
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
          data?.message || "The default logo could not be restored.",
        );
      }

      clearSelection();
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
          <span className={styles.previewLabel}>
            {previewUrl ? "New logo preview" : "Current logo"}
          </span>

          <div className={styles.preview}>
            <img
              src={previewUrl || logoUrl}
              alt="Application logo preview"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/logo.png";
              }}
            />
          </div>

          <span className={styles.logoStatus}>
            {previewUrl
              ? "Not uploaded yet"
              : customLogo
                ? "Custom logo"
                : "Default logo"}
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

          <div className={styles.actions}>
            <label className={styles.selectButton}>
              Select logo
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                disabled={saving}
                onChange={handleFileChange}
              />
            </label>

            <button
              type="button"
              className={styles.uploadButton}
              disabled={!selectedFile || saving}
              onClick={handleUpload}
            >
              {saving ? "Saving..." : "Upload logo"}
            </button>

            <button
              type="button"
              className={styles.restoreButton}
              disabled={saving}
              onClick={handleRestoreDefault}
            >
              Restore default
            </button>
          </div>

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
