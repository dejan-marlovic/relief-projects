// src/utils/http.js

/**
 * createAuthFetch(navigate)
 *
 * Factory that returns an "auth-aware" fetch function.
 * Why a factory?
 * - It lets us "capture" navigate() once (closure) and reuse it in every request.
 * - We keep fetch usage nice and consistent across the app.
 *
 * What the returned authFetch does:
 * - Automatically injects: Authorization: Bearer <token> (if token exists)
 * - If the server responds with 401, it clears the token and redirects to /login
 *
 * Usage:
 *   const authFetch = createAuthFetch(navigate);
 *   const res = await authFetch(`${BASE_URL}/api/...`, { method: "POST", ... });
 */
export const createAuthFetch = (navigate) => {
  /**
   * Returned function:
   * - url: the endpoint you want to call
   * - options: the standard fetch "RequestInit" options object
   *
   * NOTE: options = {}
   * - We default to an empty object so callers can do: authFetch(url)
   * - Without a default, options could be undefined and spreading it (...options)
   *   would throw an error.
   */
  return async (url, options = {}) => {
    // Read token from localStorage (returns string or null)
    const token = localStorage.getItem("authToken");

    /**
     * hasToken checks that token is:
     * - not null
     * - not the literal string "null"
     * - not the literal string "undefined"
     *
     * (Sometimes bugs or earlier code can accidentally store those strings.)
     */
    const hasToken = token && token !== "null" && token !== "undefined";

    /**
     * Merge (combine) the caller's options with our auth behavior.
     *
     * We use object spread "..." to copy properties.
     * Important rule: if the same key exists multiple times,
     * the LAST one wins (overrides earlier ones).
     *
     * Example:
     *   const options = { method: "POST", headers: { "Content-Type": "application/json" } }
     *   mergedOptions will keep method/body/etc AND add Authorization header.
     */
    const mergedOptions = {
      /**
       * Spread the caller options first:
       * - keeps method, body, signal, credentials, etc.
       * - example keys: method, body, signal, credentials, mode, cache, redirect...
       */
      ...options,

      /**
       * Then we override/define "headers" explicitly to safely merge them.
       * We do NOT just set headers blindly because we want to preserve
       * any headers the caller passed in.
       */
      headers: {
        /**
         * Keep any caller-provided headers.
         *
         * Why (options.headers || {}) ?
         * - options.headers might be undefined (caller passed no headers)
         * - spreading undefined would crash, so we fall back to {}
         *
         * Also: this pattern assumes headers is a plain object.
         * If you pass a Headers instance (new Headers()), this spread won't
         * preserve it correctly. Most React apps pass plain objects, which is fine.
         */
        ...(options.headers || {}),

        /**
         * Conditionally add Authorization header if we have a token.
         *
         * We use conditional spread:
         * - if hasToken is true -> spread { Authorization: "Bearer <token>" }
         * - if hasToken is false -> spread {} (nothing)
         *
         * Because this spread comes AFTER caller headers, our Authorization
         * overrides any Authorization the caller tried to set (last wins).
         * This is usually desirable to keep auth consistent.
         */
        ...(hasToken ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    // Perform the real fetch call using our merged options.
    const res = await fetch(url, mergedOptions);

    /**
     * Centralized 401 handling.
     * 401 usually means:
     * - missing token
     * - expired token
     * - invalid token
     * - user no longer has access
     */
    if (res.status === 401) {
      // Remove token so we don't keep sending a broken/expired token
      localStorage.removeItem("authToken");

      /**
       * Redirect to login.
       * replace: true means:
       * - replace current history entry instead of adding a new one
       * - prevents back-button from returning to the protected page
       */
      navigate("/login", { replace: true });

      /**
       * Throw so calling code stops its normal flow.
       * Without throwing, code might continue and try to parse JSON,
       * update UI state, etc., even though the user is being redirected.
       */
      throw new Error("Unauthorized - redirecting to login");
    }

    // If not 401, return the Response object so caller can do res.json(), res.text(), etc.
    return res;
  };
};

/**
 * Safe JSON parsing:
 * - Returns null for empty strings
 * - Returns null for invalid JSON
 */
export const safeParseJson = (text) => {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Safe response reader:
 * - Returns null for 204
 * - Reads text first, then parses safely
 * - 204 is the HTTP status “No Content.”
 */
export const safeReadJson = async (res) => {
  if (!res) return null;
  if (res.status === 204) return null;

  const text = await res.text().catch(() => "");
  return safeParseJson(text);
};

/**
 * Extract field errors from various backend shapes.
 * Supports:
 * - { fieldErrors: { firstName: "...", ... } }
 * - { errors: [ { field|name|path, message|defaultMessage }, ... ] }
 * - { violations: [ { field|propertyPath, message }, ... ] }
 */
export const extractFieldErrors = (data) => {
  if (!data) return null;

  if (
    data.fieldErrors &&
    !Array.isArray(data.fieldErrors) &&
    typeof data.fieldErrors === "object"
  ) {
    return data.fieldErrors;
  }

  if (Array.isArray(data.errors)) {
    const fe = {};
    data.errors.forEach((e) => {
      const field = e.field || e.name || e.property || e.path;
      const msg = e.defaultMessage || e.message || e.msg;
      if (field && msg) fe[field] = msg;
    });
    return Object.keys(fe).length ? fe : null;
  }

  if (Array.isArray(data.violations)) {
    const fe = {};
    data.violations.forEach((v) => {
      const field = v.field || v.propertyPath || v.path;
      const msg = v.message;
      if (field && msg) fe[field] = msg;
    });
    return Object.keys(fe).length ? fe : null;
  }

  return null;
};

/**
 * FYI: Common fetch options you might pass in "options" (RequestInit):
 *
 * - method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | ...
 * - headers: { "Content-Type": "application/json", ... }
 * - body: string | FormData | Blob | etc.
 * - credentials: "omit" | "same-origin" | "include"   (cookies / sessions)
 * - signal: AbortController().signal                  (cancel requests)
 * - mode: "cors" | "no-cors" | "same-origin"          (CORS behavior)
 * - cache: "default" | "no-store" | "reload" | ...
 * - redirect: "follow" | "error" | "manual"
 * - referrerPolicy: "no-referrer" | ...
 * - keepalive: boolean (allow during page unload; small payloads)
 */
