import React, { useState } from "react";
import { FiCheck, FiDroplet, FiRefreshCw } from "react-icons/fi";

import { THEMES, applyTheme, getStoredTheme } from "../../../utils/theme";

import styles from "./ThemeSettings.module.scss";

function ThemeSettings() {
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme);

  const handleThemeChange = (themeId) => {
    const appliedTheme = applyTheme(themeId);
    setSelectedTheme(appliedTheme);
  };

  const handleRestoreDefault = () => {
    handleThemeChange("default");
  };

  return (
    <section className={styles.themeSettings}>
      <header className={styles.pageHeader}>
        <div className={styles.headerIcon} aria-hidden="true">
          <FiDroplet />
        </div>

        <div className={styles.pageHeaderText}>
          <h2 className={styles.pageTitle}>Application color theme</h2>

          <p className={styles.pageSubtitle}>
            Select the primary color used throughout the application. Changes
            are applied immediately.
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div
          className={styles.themeGrid}
          role="radiogroup"
          aria-label="Application color theme"
        >
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                className={`${styles.themeCard} ${
                  isSelected ? styles.themeCardSelected : ""
                }`}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleThemeChange(theme.id)}
              >
                <span className={styles.themeCardTop}>
                  <span className={styles.colorPreview} aria-hidden="true">
                    {theme.colors.map((color) => (
                      <span
                        key={color}
                        className={styles.colorCircle}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>

                  <span
                    className={`${styles.checkmark} ${
                      isSelected ? styles.checkmarkSelected : ""
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <FiCheck />}
                  </span>
                </span>

                <span className={styles.themeName}>{theme.name}</span>

                <span className={styles.themeDescription}>
                  {theme.description}
                </span>

                <span className={styles.selectionStatus}>
                  {isSelected ? "Currently selected" : "Select theme"}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          <div className={styles.helpText}>
            <strong>Testing note:</strong> The Project page and shared controls
            have been migrated to the new color variables. Other pages will
            retain their existing colors until their SCSS files are migrated.
          </div>

          {selectedTheme !== "default" && (
            <button
              type="button"
              className={styles.restoreButton}
              onClick={handleRestoreDefault}
            >
              <FiRefreshCw aria-hidden="true" />
              Restore default theme
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ThemeSettings;
