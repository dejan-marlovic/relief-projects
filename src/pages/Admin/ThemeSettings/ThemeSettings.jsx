import React, { useMemo, useState } from "react";
import {
  FiCheck,
  FiDroplet,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";

import {
  applyTheme,
  deleteCustomTheme,
  getAvailableThemes,
  getStoredTheme,
  saveCustomTheme,
  updateCustomTheme,
} from "../../../utils/theme";

import styles from "./ThemeSettings.module.scss";

const INITIAL_FORM = {
  name: "",
  primary: "#4a90e2",
  background: "#ffffff",
  surface: "#ffffff",
  text: "#111827",
  success: "#1f9d55",
  warning: "#f59e0b",
  danger: "#e74c3c",
};

const COLOR_FIELDS = [
  ["primary", "Primary color"],
  ["background", "Page background"],
  ["surface", "Cards and surfaces"],
  ["text", "Main text"],
  ["success", "Success"],
  ["warning", "Warning"],
  ["danger", "Danger"],
];

function ThemeSettings() {
  const [themes, setThemes] = useState(getAvailableThemes);
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme);
  const [showCreator, setShowCreator] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");

  const customThemeCount = useMemo(
    () => themes.filter((theme) => theme.custom).length,
    [themes],
  );

  const handleThemeChange = (themeId) => {
    setSelectedTheme(applyTheme(themeId));
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const closeCreator = () => {
    setShowCreator(false);
    setEditingThemeId(null);
    setForm(INITIAL_FORM);
    setFormError("");
  };

  const handleSaveTheme = (event) => {
    event.preventDefault();

    try {
      const savedTheme = editingThemeId
        ? updateCustomTheme(editingThemeId, form)
        : saveCustomTheme(form);

      setThemes(getAvailableThemes());

      if (!editingThemeId || selectedTheme === editingThemeId) {
        setSelectedTheme(applyTheme(savedTheme.id));
      }

      closeCreator();
    } catch (error) {
      setFormError(error.message || "The custom theme could not be saved.");
    }
  };

  const handleEditTheme = (theme) => {
    setForm({ name: theme.name, ...theme.themeColors });
    setEditingThemeId(theme.id);
    setShowCreator(true);
    setFormError("");
  };

  const handleDeleteTheme = (theme) => {
    if (!window.confirm(`Delete the custom theme “${theme.name}”?`)) return;

    const wasSelected = selectedTheme === theme.id;
    if (!deleteCustomTheme(theme.id)) {
      setFormError("The custom theme could not be deleted.");
      return;
    }

    setThemes(getAvailableThemes());
    if (wasSelected) setSelectedTheme("default");
    if (editingThemeId === theme.id) closeCreator();
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
            Select a built-in theme or create a custom theme for this browser.
            Changes are applied immediately.
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <p className={styles.customThemeCount}>
            {customThemeCount} custom {customThemeCount === 1 ? "theme" : "themes"}
          </p>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => {
              if (showCreator) {
                closeCreator();
              } else {
                setEditingThemeId(null);
                setForm(INITIAL_FORM);
                setShowCreator(true);
                setFormError("");
              }
            }}
            aria-expanded={showCreator}
          >
            <FiPlus aria-hidden="true" />
            {showCreator ? "Close editor" : "Create custom theme"}
          </button>
        </div>

        {showCreator && (
          <form className={styles.creator} onSubmit={handleSaveTheme}>
            <div className={styles.creatorHeader}>
              <div>
                <h3>
                  {editingThemeId ? "Edit custom theme" : "Create a custom theme"}
                </h3>
                <p>Interaction shades and readable supporting colors are generated automatically.</p>
              </div>
              <div className={styles.livePreview} aria-label="Theme color preview">
                {[form.primary, form.text, form.surface].map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            <label className={styles.nameField}>
              <span>Theme name</span>
              <input
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                maxLength={40}
                placeholder="For example: Ocean Blue"
                required
              />
            </label>

            <div className={styles.colorFields}>
              {COLOR_FIELDS.map(([name, label]) => (
                <label key={name} className={styles.colorField}>
                  <span>{label}</span>
                  <span className={styles.colorInputWrap}>
                    <input
                      type="color"
                      name={name}
                      value={form[name]}
                      onChange={handleFieldChange}
                      aria-label={label}
                    />
                    <code>{form[name].toUpperCase()}</code>
                  </span>
                </label>
              ))}
            </div>

            {formError && <div className={styles.formError}>{formError}</div>}

            <div className={styles.creatorActions}>
              <button type="submit" className={styles.saveThemeButton}>
                <FiCheck aria-hidden="true" />
                {editingThemeId ? "Save theme changes" : "Save and apply theme"}
              </button>
            </div>
          </form>
        )}

        <div
          className={styles.themeGrid}
          role="radiogroup"
          aria-label="Application color theme"
        >
          {themes.map((theme) => {
            const isSelected = selectedTheme === theme.id;

            return (
              <div key={theme.id} className={styles.themeCardWrap}>
                <button
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
                      {theme.colors.map((color, index) => (
                        <span
                          key={`${color}-${index}`}
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
                  <span className={styles.themeDescription}>{theme.description}</span>
                  <span className={styles.selectionStatus}>
                    {isSelected ? "Currently selected" : "Select theme"}
                  </span>
                </button>

                {theme.custom && (
                  <>
                    <button
                      type="button"
                      className={styles.editThemeButton}
                      onClick={() => handleEditTheme(theme)}
                      aria-label={`Edit ${theme.name}`}
                      title="Edit custom theme"
                    >
                      <FiEdit2 aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.deleteThemeButton}
                      onClick={() => handleDeleteTheme(theme)}
                      aria-label={`Delete ${theme.name}`}
                      title="Delete custom theme"
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <div className={styles.helpText}>
            <strong>Browser-local setting:</strong> Custom themes and the current
            selection are stored only in this browser until server-managed themes
            are implemented.
          </div>

          {selectedTheme !== "default" && (
            <button
              type="button"
              className={styles.restoreButton}
              onClick={() => handleThemeChange("default")}
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
