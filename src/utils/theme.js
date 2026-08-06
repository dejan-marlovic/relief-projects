export const THEME_STORAGE_KEY = "relief-projects-color-theme";
export const CUSTOM_THEMES_STORAGE_KEY = "relief-projects-custom-themes";

const MAX_CUSTOM_THEMES = 12;
const MAX_THEME_NAME_LENGTH = 40;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export const THEMES = [
  {
    id: "default",
    name: "Relief Blue",
    description: "The current default blue appearance.",
    colors: ["#4a90e2", "#286aa8", "#eaf3fd"],
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "A calm green theme with natural tones.",
    colors: ["#16866f", "#0d5749", "#e8f7f3"],
  },
  {
    id: "purple",
    name: "Royal Purple",
    description: "A distinctive purple theme with soft highlights.",
    colors: ["#7656c9", "#52389b", "#f1edfb"],
  },
  {
    id: "rose",
    name: "Warm Rose",
    description: "A warmer theme with rose and burgundy tones.",
    colors: ["#c4516c", "#92364c", "#fceef2"],
  },
];

const CUSTOM_COLOR_KEYS = [
  "primary",
  "background",
  "surface",
  "text",
  "success",
  "warning",
  "danger",
];

const CUSTOM_VARIABLE_NAMES = [
  "--color-primary",
  "--color-primary-hover",
  "--color-primary-dark",
  "--color-primary-soft",
  "--color-primary-soft-hover",
  "--color-primary-soft-active",
  "--color-primary-border",
  "--color-primary-border-strong",
  "--color-primary-focus",
  "--color-text",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-text-disabled",
  "--color-text-on-primary",
  "--color-text-strong",
  "--color-text-neutral",
  "--color-background",
  "--color-surface",
  "--color-surface-secondary",
  "--color-surface-muted",
  "--color-surface-hover",
  "--color-surface-striped",
  "--color-surface-tint",
  "--color-border",
  "--color-border-soft",
  "--color-border-subtle",
  "--color-divider",
  "--color-border-muted",
  "--color-border-pale",
  "--color-danger",
  "--color-danger-dark",
  "--color-danger-text",
  "--color-danger-soft",
  "--color-danger-border",
  "--color-danger-focus",
  "--color-danger-soft-strong",
  "--color-danger-border-strong",
  "--color-danger-soft-alt",
  "--color-success",
  "--color-success-dark",
  "--color-success-soft",
  "--color-success-border",
  "--color-warning",
  "--color-warning-dark",
  "--color-warning-soft",
  "--color-warning-border",
  "--color-warning-soft-alt",
  "--color-warning-border-alt",
];

const normalizeHex = (value) =>
  typeof value === "string" && HEX_COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : null;

const hexToRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;

const mix = (first, second, secondWeight) => {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const weight = Math.max(0, Math.min(1, secondWeight));

  return rgbToHex({
    r: a.r * (1 - weight) + b.r * weight,
    g: a.g * (1 - weight) + b.g * weight,
    b: a.b * (1 - weight) + b.b * weight,
  });
};

const alpha = (hex, opacity) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const readableText = (background) => {
  const { r, g, b } = hexToRgb(background);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#111827" : "#ffffff";
};

const normalizeCustomTheme = (value) => {
  if (!value || typeof value !== "object") return null;

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (!/^custom-[a-z0-9-]+$/i.test(id)) return null;
  if (!name || name.length > MAX_THEME_NAME_LENGTH) return null;

  const themeColors = {};
  for (const key of CUSTOM_COLOR_KEYS) {
    const color = normalizeHex(value.themeColors?.[key]);
    if (!color) return null;
    themeColors[key] = color;
  }

  return {
    id,
    name,
    description: "Custom browser theme.",
    custom: true,
    themeColors,
    colors: [themeColors.primary, themeColors.text, themeColors.surface],
  };
};

export const getCustomThemes = () => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(parsed)) return [];

    return parsed
      .slice(0, MAX_CUSTOM_THEMES)
      .map(normalizeCustomTheme)
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const getAvailableThemes = () => [...THEMES, ...getCustomThemes()];

const findTheme = (themeId) =>
  getAvailableThemes().find((theme) => theme.id === themeId);

export const isSupportedTheme = (themeId) => Boolean(findTheme(themeId));

const clearCustomVariables = () => {
  if (typeof document === "undefined") return;

  CUSTOM_VARIABLE_NAMES.forEach((property) =>
    document.documentElement.style.removeProperty(property),
  );
};

const buildCustomVariables = ({
  primary,
  background,
  surface,
  text,
  success,
  warning,
  danger,
}) => ({
  "--color-primary": primary,
  "--color-primary-hover": mix(primary, "#000000", 0.16),
  "--color-primary-dark": mix(primary, "#000000", 0.28),
  "--color-primary-soft": alpha(primary, 0.05),
  "--color-primary-soft-hover": alpha(primary, 0.1),
  "--color-primary-soft-active": alpha(primary, 0.14),
  "--color-primary-border": alpha(primary, 0.22),
  "--color-primary-border-strong": alpha(primary, 0.55),
  "--color-primary-focus": alpha(primary, 0.18),

  "--color-text": text,
  "--color-text-secondary": mix(text, background, 0.22),
  "--color-text-muted": mix(text, background, 0.44),
  "--color-text-disabled": alpha(text, 0.55),
  "--color-text-on-primary": readableText(primary),
  "--color-text-strong": mix(text, "#000000", 0.06),
  "--color-text-neutral": mix(text, background, 0.36),

  "--color-background": background,
  "--color-surface": surface,
  "--color-surface-secondary": mix(surface, text, 0.025),
  "--color-surface-muted": mix(surface, text, 0.04),
  "--color-surface-hover": mix(surface, primary, 0.055),
  "--color-surface-striped": mix(surface, text, 0.02),
  "--color-surface-tint": mix(surface, primary, 0.025),

  "--color-border": alpha(text, 0.18),
  "--color-border-soft": alpha(text, 0.12),
  "--color-border-subtle": alpha(text, 0.06),
  "--color-divider": mix(surface, text, 0.07),
  "--color-border-muted": mix(surface, text, 0.18),
  "--color-border-pale": mix(surface, text, 0.08),

  "--color-danger": danger,
  "--color-danger-dark": mix(danger, "#000000", 0.25),
  "--color-danger-text": mix(danger, "#000000", 0.32),
  "--color-danger-soft": alpha(danger, 0.08),
  "--color-danger-border": alpha(danger, 0.25),
  "--color-danger-focus": alpha(danger, 0.18),
  "--color-danger-soft-strong": mix(surface, danger, 0.13),
  "--color-danger-border-strong": mix(surface, danger, 0.34),
  "--color-danger-soft-alt": mix(surface, danger, 0.07),

  "--color-success": success,
  "--color-success-dark": mix(success, "#000000", 0.28),
  "--color-success-soft": mix(surface, success, 0.1),
  "--color-success-border": mix(surface, success, 0.31),

  "--color-warning": warning,
  "--color-warning-dark": mix(warning, "#000000", 0.38),
  "--color-warning-soft": mix(surface, warning, 0.09),
  "--color-warning-border": mix(surface, warning, 0.3),
  "--color-warning-soft-alt": mix(surface, warning, 0.07),
  "--color-warning-border-alt": mix(surface, warning, 0.26),
});

export const getStoredTheme = () => {
  if (typeof window === "undefined") return "default";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isSupportedTheme(storedTheme) ? storedTheme : "default";
  } catch {
    return "default";
  }
};

export const applyTheme = (themeId) => {
  const theme = findTheme(themeId) || THEMES[0];

  if (typeof document !== "undefined") {
    clearCustomVariables();
    document.documentElement.setAttribute(
      "data-theme",
      theme.custom ? "custom" : theme.id,
    );

    if (theme.custom) {
      Object.entries(buildCustomVariables(theme.themeColors)).forEach(
        ([property, value]) =>
          document.documentElement.style.setProperty(property, value),
      );
    }
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {
      // The theme still works for the current session if storage is unavailable.
    }
  }

  return theme.id;
};

export const saveCustomTheme = ({ name, ...themeColors }) => {
  const safeName = typeof name === "string" ? name.trim() : "";

  if (!safeName) throw new Error("Enter a theme name.");
  if (safeName.length > MAX_THEME_NAME_LENGTH) {
    throw new Error(`Theme names can contain at most ${MAX_THEME_NAME_LENGTH} characters.`);
  }

  const existingThemes = getCustomThemes();
  if (existingThemes.length >= MAX_CUSTOM_THEMES) {
    throw new Error(`You can save up to ${MAX_CUSTOM_THEMES} custom themes.`);
  }

  if (
    getAvailableThemes().some(
      (theme) => theme.name.toLowerCase() === safeName.toLowerCase(),
    )
  ) {
    throw new Error("A theme with that name already exists.");
  }

  const normalizedColors = {};
  for (const key of CUSTOM_COLOR_KEYS) {
    const color = normalizeHex(themeColors[key]);
    if (!color) throw new Error("Choose a valid color for every field.");
    normalizedColors[key] = color;
  }

  const newTheme = normalizeCustomTheme({
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: safeName,
    themeColors: normalizedColors,
  });

  try {
    window.localStorage.setItem(
      CUSTOM_THEMES_STORAGE_KEY,
      JSON.stringify([...existingThemes, newTheme]),
    );
  } catch {
    throw new Error("The custom theme could not be saved in this browser.");
  }

  return newTheme;
};

export const updateCustomTheme = (themeId, { name, ...themeColors }) => {
  const existingThemes = getCustomThemes();
  const themeIndex = existingThemes.findIndex((theme) => theme.id === themeId);

  if (themeIndex < 0) throw new Error("The custom theme could not be found.");

  const safeName = typeof name === "string" ? name.trim() : "";
  if (!safeName) throw new Error("Enter a theme name.");
  if (safeName.length > MAX_THEME_NAME_LENGTH) {
    throw new Error(
      `Theme names can contain at most ${MAX_THEME_NAME_LENGTH} characters.`,
    );
  }

  if (
    getAvailableThemes().some(
      (theme) =>
        theme.id !== themeId &&
        theme.name.toLowerCase() === safeName.toLowerCase(),
    )
  ) {
    throw new Error("A theme with that name already exists.");
  }

  const normalizedColors = {};
  for (const key of CUSTOM_COLOR_KEYS) {
    const color = normalizeHex(themeColors[key]);
    if (!color) throw new Error("Choose a valid color for every field.");
    normalizedColors[key] = color;
  }

  const updatedTheme = normalizeCustomTheme({
    id: themeId,
    name: safeName,
    themeColors: normalizedColors,
  });

  const updatedThemes = [...existingThemes];
  updatedThemes[themeIndex] = updatedTheme;

  try {
    window.localStorage.setItem(
      CUSTOM_THEMES_STORAGE_KEY,
      JSON.stringify(updatedThemes),
    );
  } catch {
    throw new Error("The custom theme could not be updated in this browser.");
  }

  return updatedTheme;
};

export const deleteCustomTheme = (themeId) => {
  let selectedThemeId = "default";
  try {
    selectedThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage failure is handled below.
  }

  const remainingThemes = getCustomThemes().filter(
    (theme) => theme.id !== themeId,
  );

  try {
    window.localStorage.setItem(
      CUSTOM_THEMES_STORAGE_KEY,
      JSON.stringify(remainingThemes),
    );
  } catch {
    return false;
  }

  if (selectedThemeId === themeId) applyTheme("default");
  return true;
};
