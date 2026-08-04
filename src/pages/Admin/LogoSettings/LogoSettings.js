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

const ASSETS = {
  logo: {
    endpoint: "logo",
    label: "logo",
    maxSize: 2 * 1024 * 1024,
    accept: ".png,.jpg,.jpeg,image/png,image/jpeg",
    types: ["image/png", "image/jpeg"],
  },
  favicon: {
    endpoint: "favicon",
    label: "favicon",
    maxSize: 512 * 1024,
    accept: ".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon",
    types: ["image/png", "image/x-icon", "image/vnd.microsoft.icon"],
  },
};

function LogoSettings() {
  const navigate = useNavigate();
  const authFetch = createAuthFetch(navigate);

  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const { logoUrl, faviconUrl, customLogo, customFavicon, refreshBranding } =
    useBranding();

  const [busyAsset, setBusyAsset] = useState(null);
  const [dragAsset, setDragAsset] = useState(null);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const clearFeedback = () => {
    setFeedback({
      type: "",
      message: "",
    });
  };

  const getInputRef = (asset) =>
    asset === "logo" ? logoInputRef : faviconInputRef;

  const validateFile = (asset, file) => {
    const config = ASSETS[asset];

    if (!file) {
      return `Please select a ${config.label} file.`;
    }

    const isIco =
      asset === "favicon" && file.name.toLowerCase().endsWith(".ico");

    if (!config.types.includes(file.type) && !isIco) {
      return asset === "logo"
        ? "Please select a PNG, JPG, or JPEG image."
        : "Please select a PNG or ICO favicon.";
    }

    if (file.size > config.maxSize) {
      return asset === "logo"
        ? "The logo must be smaller than 2 MB."
        : "The favicon must be smaller than 512 KB.";
    }

    return null;
  };

  const uploadAsset = async (asset, file) => {
    clearFeedback();

    const validationError = validateFile(asset, file);

    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setBusyAsset(asset);

    try {
      const response = await authFetch(
        `${BASE_URL}/api/branding/${ASSETS[asset].endpoint}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            `The ${ASSETS[asset].label} could not be uploaded.`,
        );
      }

      await refreshBranding();

      setFeedback({
        type: "success",
        message: `The application ${ASSETS[asset].label} was updated successfully.`,
      });
    } catch (uploadError) {
      setFeedback({
        type: "error",
        message:
          uploadError.message ||
          `The ${ASSETS[asset].label} could not be uploaded.`,
      });
    } finally {
      setBusyAsset(null);

      const inputRef = getInputRef(asset);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const restoreAsset = async (asset) => {
    clearFeedback();
    setBusyAsset(asset);

    try {
      const response = await authFetch(
        `${BASE_URL}/api/branding/${ASSETS[asset].endpoint}`,
        {
          method: "DELETE",
        },
      );

      const data = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            `The default ${ASSETS[asset].label} could not be restored.`,
        );
      }

      await refreshBranding();

      setFeedback({
        type: "success",
        message: `The default ${ASSETS[asset].label} was restored.`,
      });
    } catch (restoreError) {
      setFeedback({
        type: "error",
        message:
          restoreError.message ||
          `The default ${ASSETS[asset].label} could not be restored.`,
      });
    } finally {
      setBusyAsset(null);
    }
  };

  const handleFileInput = (asset, event) => {
    const file = event.target.files?.[0];

    if (file) {
      uploadAsset(asset, file);
    }
  };

  const handleDrop = (asset, event) => {
    event.preventDefault();
    setDragAsset(null);

    if (busyAsset) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (file) {
      uploadAsset(asset, file);
    }
  };

  const handleDragOver = (asset, event) => {
    event.preventDefault();

    if (!busyAsset) {
      setDragAsset(asset);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragAsset(null);
  };

  const openFilePicker = (asset) => {
    if (!busyAsset) {
      getInputRef(asset).current?.click();
    }
  };

  const handlePickerKeyDown = (asset, event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker(asset);
    }
  };

  const renderUploader = (asset) => {
    const config = ASSETS[asset];
    const isBusy = busyAsset === asset;

    return (
      <>
        <div
          className={`${styles.dropzone} ${
            dragAsset === asset ? styles.dropzoneActive : ""
          } ${busyAsset ? styles.dropzoneDisabled : ""}`}
          onClick={() => openFilePicker(asset)}
          onKeyDown={(event) => handlePickerKeyDown(asset, event)}
          onDrop={(event) => handleDrop(asset, event)}
          onDragOver={(event) => handleDragOver(asset, event)}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={busyAsset ? -1 : 0}
          aria-disabled={Boolean(busyAsset)}
        >
          <div className={styles.dropzoneIconWrap}>
            <FiUploadCloud className={styles.dropzoneIcon} aria-hidden="true" />
          </div>

          <div className={styles.dropzoneText}>
            {isBusy ? (
              <>
                <strong>Uploading {config.label}...</strong>

                <span>Please wait while the file is saved.</span>
              </>
            ) : (
              <>
                <strong>Drag and drop your {config.label} here</strong>

                <span>or click to select a file</span>
              </>
            )}

            <span className={styles.dropzoneHint}>
              {asset === "logo"
                ? "PNG or JPG, maximum 2 MB"
                : "PNG or ICO, maximum 512 KB"}
            </span>
          </div>
        </div>

        <input
          ref={getInputRef(asset)}
          type="file"
          accept={config.accept}
          className={styles.fileInput}
          disabled={Boolean(busyAsset)}
          onChange={(event) => handleFileInput(asset, event)}
        />
      </>
    );
  };

  return (
    <section className={styles.logoSettings}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <h2 className={styles.pageTitle}>Application branding</h2>

          <p className={styles.pageSubtitle}>
            Manage the application logo and browser favicon.
          </p>
        </div>
      </header>

      <div className={styles.assetSection}>
        <div className={styles.assetSectionHeader}>
          <div>
            <h3 className={styles.assetSectionTitle}>Application logo</h3>

            <p className={styles.assetSectionSubtitle}>
              Displayed on the login page and in the application header.
            </p>
          </div>
        </div>

        <div className={styles.settingsGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>Current logo</h4>

              <span className={styles.statusBadge}>
                <FiImage aria-hidden="true" />

                {customLogo ? "Custom" : "Default"}
              </span>
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

            {customLogo && (
              <button
                type="button"
                className={styles.restoreButton}
                disabled={Boolean(busyAsset)}
                onClick={() => restoreAsset("logo")}
              >
                <FiRefreshCw aria-hidden="true" />
                Restore default logo
              </button>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h4 className={styles.cardTitle}>Upload a new logo</h4>

                <p className={styles.cardSubtitle}>
                  Recommended size: 600 x 300 pixels.
                </p>
              </div>
            </div>

            {renderUploader("logo")}
          </article>
        </div>
      </div>

      <div className={styles.assetDivider} />

      <div className={styles.assetSection}>
        <div className={styles.assetSectionHeader}>
          <div>
            <h3 className={styles.assetSectionTitle}>Browser favicon</h3>

            <p className={styles.assetSectionSubtitle}>
              Displayed in browser tabs, bookmarks, and browser history.
            </p>
          </div>
        </div>

        <div className={styles.settingsGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h4 className={styles.cardTitle}>Current favicon</h4>

              <span className={styles.statusBadge}>
                <FiImage aria-hidden="true" />

                {customFavicon ? "Custom" : "Default"}
              </span>
            </div>

            <div className={`${styles.preview} ${styles.faviconPreview}`}>
              <img
                src={faviconUrl}
                alt="Current browser favicon"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/favicon.ico";
                }}
              />
            </div>

            {customFavicon && (
              <button
                type="button"
                className={styles.restoreButton}
                disabled={Boolean(busyAsset)}
                onClick={() => restoreAsset("favicon")}
              >
                <FiRefreshCw aria-hidden="true" />
                Restore default favicon
              </button>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h4 className={styles.cardTitle}>Upload a new favicon</h4>

                <p className={styles.cardSubtitle}>
                  Use a square PNG or ICO file. Recommended: 32 x 32 or 64 x 64
                  pixels.
                </p>
              </div>
            </div>

            {renderUploader("favicon")}
          </article>
        </div>
      </div>

      {feedback.message && (
        <div
          className={`${styles.feedback} ${
            feedback.type === "error" ? styles.error : styles.success
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.type === "error" ? (
            <FiAlertCircle aria-hidden="true" />
          ) : (
            <FiCheckCircle aria-hidden="true" />
          )}

          <span>{feedback.message}</span>
        </div>
      )}
    </section>
  );
}

export default LogoSettings;
