// Prefer env var, fall back to local dev backend
export const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// Assets (images/docs) come from the frontend origin by default
export const ASSETS_URL = process.env.REACT_APP_ASSETS_BASE_URL || "";
