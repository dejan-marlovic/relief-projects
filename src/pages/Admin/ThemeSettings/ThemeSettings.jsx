import React, { useMemo, useState } from "react";
import {
  FiCheck,
  FiDroplet,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../../config/api";
import { useBranding } from "../../../context/BrandingContext";
import { createAuthFetch, safeReadJson } from "../../../utils/http";
import { getAvailableThemes } from "../../../utils/theme";

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
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { colorTheme, customThemes, refreshBranding } = useBranding();

  const [showCreator, setShowCreator] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const themes = useMemo(
    () => getAvailableThemes(customThemes),
    [customThemes],
  );

  const customThemeCount = customThemes.length;
  const selectedTheme = colorTheme || "default";
  const isBusy = Boolean(busyAction);

  const readError = (data, fallback) =>
    data?.message || data?.detail || data?.error || fallback;

  const requestThemeChange = async (url, options, fallbackMessage) => {
    const response = await authFetch(url, options);
    const data = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(readError(data, fallbackMessage));
    }

    await refreshBranding();
    return data;
  };

  const handleThemeChange = async (themeId) => {
    if (isBusy || themeId === selectedTheme) return;

    setBusyAction(`select-${themeId}`);
    setActionError("");

    try {
      await requestThemeChange(
        `${BASE_URL}/api/branding/theme`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeId }),
        },
        "The selected theme could not be applied.",
      );
    } catch (error) {
      setActionError(
        error.message || "The selected theme could not be applied.",
      );
    } finally {
      setBusyAction("");
    }
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

  const handleSaveTheme = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    const isEditing = Boolean(editingThemeId);
    setBusyAction(isEditing ? `update-${editingThemeId}` : "create");
    setFormError("");
    setActionError("");

    try {
      await requestThemeChange(
        isEditing
          ? `${BASE_URL}/api/branding/themes/${encodeURIComponent(editingThemeId)}`
          : `${BASE_URL}/api/branding/themes`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        isEditing
          ? "The custom theme could not be updated."
          : "The custom theme could not be created.",
      );

      closeCreator();
    } catch (error) {
      setFormError(error.message || "The custom theme could not be saved.");
    } finally {
      setBusyAction("");
    }
  };

  const handleEditTheme = (theme) => {
    if (isBusy) return;

    setForm({ name: theme.name, ...theme.themeColors });
    setEditingThemeId(theme.id);
    setShowCreator(true);
    setFormError("");
    setActionError("");
  };

  const handleDeleteTheme = async (theme) => {
    if (isBusy) return;
    if (!window.confirm(`Delete the custom theme "${theme.name}"?`)) return;

    setBusyAction(`delete-${theme.id}`);
    setActionError("");

    try {
      await requestThemeChange(
        `${BASE_URL}/api/branding/themes/${encodeURIComponent(theme.id)}`,
        { method: "DELETE" },
        "The custom theme could not be deleted.",
      );

      if (editingThemeId === theme.id) closeCreator();
    } catch (error) {
      setActionError(
        error.message || "The custom theme could not be deleted.",
      );
    } finally {
      setBusyAction("");
    }
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
            Select a built-in theme or create a custom theme for the whole
            application. Changes apply to every user and device.
          </p>
        </div>
      </header>

      <div className={styles.content} aria-busy={isBusy}>
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
                setActionError("");
              }
            }}
            aria-expanded={showCreator}
            disabled={isBusy}
          >
            <FiPlus aria-hidden="true" />
            {showCreator ? "Close editor" : "Create custom theme"}
          </button>
        </div>

        {actionError && <div className={styles.formError}>{actionError}</div>}

        {showCreator && (
          <form className={styles.creator} onSubmit={handleSaveTheme}>
            <div className={styles.creatorHeader}>
              <div>
                <h3>
                  {editingThemeId ? "Edit custom theme" : "Create a custom theme"}
                </h3>
                <p>
                  Interaction shades and readable supporting colors are generated
                  automatically.
                </p>
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
                disabled={isBusy}
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
                      disabled={isBusy}
                    />
                    <code>{form[name].toUpperCase()}</code>
                  </span>
                </label>
              ))}
            </div>

            {formError && <div className={styles.formError}>{formError}</div>}

            <div className={styles.creatorActions}>
              <button
                type="submit"
                className={styles.saveThemeButton}
                disabled={isBusy}
              >
                <FiCheck aria-hidden="true" />
                {editingThemeId ? "Save theme changes" : "Save custom theme"}
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
                  disabled={isBusy}
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
                      disabled={isBusy}
                    >
                      <FiEdit2 aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.deleteThemeButton}
                      onClick={() => handleDeleteTheme(theme)}
                      aria-label={`Delete ${theme.name}`}
                      title="Delete custom theme"
                      disabled={isBusy}
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
            <strong>Server-managed setting:</strong> The selected theme and custom
            themes are shared by every user and device. Browser storage is used
            only as a startup cache.
          </div>

          {selectedTheme !== "default" && (
            <button
              type="button"
              className={styles.restoreButton}
              onClick={() => handleThemeChange("default")}
              disabled={isBusy}
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
