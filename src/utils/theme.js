export const THEME_STORAGE_KEY = "relief-projects-color-theme";

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

export const isSupportedTheme = (theme) =>
  THEMES.some((availableTheme) => availableTheme.id === theme);

export const getStoredTheme = () => {
  if (typeof window === "undefined") {
    return "default";
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isSupportedTheme(storedTheme) ? storedTheme : "default";
  } catch {
    return "default";
  }
};

export const applyTheme = (theme) => {
  const safeTheme = isSupportedTheme(theme) ? theme : "default";

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", safeTheme);
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    } catch {
      // The theme still works for the current session if storage is unavailable.
    }
  }

  return safeTheme;
};
