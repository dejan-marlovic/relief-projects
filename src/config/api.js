// src/config/api.js

// In CRA dev (npm start), use relative URLs so package.json "proxy" can work.
// In production builds (Docker/AWS), set REACT_APP_API_BASE_URL to your backend URL.
const isDev = process.env.NODE_ENV === "development";

// If env var is set, use it. Otherwise:
// - dev: use "" so calls become "/api/..."
// - prod: also "" (means same-origin; useful if you later put /api behind the same domain)
export const BASE_URL = process.env.REACT_APP_API_BASE_URL || (isDev ? "" : "");

// Assets (images/docs) default to same origin as the frontend.
// If later you move assets to S3/CloudFront, set REACT_APP_ASSETS_BASE_URL.
export const ASSETS_URL = process.env.REACT_APP_ASSETS_BASE_URL || "";
