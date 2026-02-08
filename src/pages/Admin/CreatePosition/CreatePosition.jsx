import React, { useState, useMemo } from "react";
import { FiSave, FiX, FiBriefcase } from "react-icons/fi";
import styles from "./CreatePosition.module.scss";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/api";

//Calling setPositionName("abc") causes React to re-run the component function CreatePosition
const CreatePosition = () => {
  //setPositionName is a function React gives you to update positionName
  //useState(...) returns: [stateValue, setStateFunction]
  //After typing "Project Manager", it becomes: ["Project Manager", function setPositionName(...) { ... }]
  //You don’t call useState again manually — React keeps track of it across renders.
  const [positionName, setPositionName] = useState("");

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  //gives you a function you can call to change the current URL programmatically
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const validate = (name) => {
    const errors = {};
    //If name.trim() is empty → add error
    if (!name.trim()) errors.positionName = "Position name is required";
    return errors;
  };

  //Reset button handler
  const onResetClick = () => {
    setPositionName("");
    setFieldErrors({});
    setFormError("");
  };

  //hasError becomes true if fieldErrors.positionName has a message
  //inputClass becomes "textInput inputError" when invalid, otherwise "textInput"

  //Without useMemo, any calculated values are recalculated every render.
  //With useMemo, React recalculates only when the dependencies change.
  const inputClass = useMemo(() => {
    const hasError = Boolean(fieldErrors?.positionName);
    return `${styles.textInput} ${hasError ? styles.inputError : ""}`;
  }, [fieldErrors]);

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
  );

  // 🔐 Helper: fetch with auth + automatic 401 handling
  //Declares an async function (so you can use await inside it)
  //options = {}: default value — if caller doesn’t pass options, it becomes an empty object.
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("authToken");

    const mergedOptions = {
      //...options copies all original fetch options the caller provided (method, body, headers, etc.).
      //This is the object spread pattern (copying).
      //If the caller provides method, body, credentials, etc.,
      // you keep them without manually copying each property.
      ...options,

      //In an object literal, if the same key appears twice, the last one overrides the earlier one.
      //“Take everything from options…”
      //…but for headers, use my custom merged headers object.
      headers: {
        //if the caller provided headers, use them
        //otherwise use an empty object
        ...(options.headers || {}),
        //Conditionally adds an Authorization header:
        //Then you add Authorization if you have a token
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const res = await fetch(url, mergedOptions);

    //HTTP status code for Unauthorized
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      navigate("/login", { replace: true });
      throw new Error("Unauthorized - redirecting to login");
    }

    return res;
  };

  //Helper: safely parse text into JSON (returns null if empty/invalid)
  const safeParseJson = (text) => {
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const safeReadJson = async (res) => {
    if (!res) return null;
    if (res.status === 204) return null;

    //Reads body once as text (safe)
    const text = await res.text().catch(() => "");

    //if text is empty after trimming
    if (!text || !text.trim()) return null;

    return safeParseJson(text);
  };

  // Best-effort extraction of field errors from various backend formats
  const extractFieldErrors = (data) => {
    if (!data) return null;

    //Your backend returns fieldErrors in this shape:
    //{ message: "...", fieldErrors: { positionName: "..." } }
    if (data.fieldErrors && typeof data.fieldErrors === "object") {
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

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const errors = validate(positionName);

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      //Optional early check: if no token, go to login
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const payload = { positionName: positionName.trim() };

      //NOTE: This assumes BASE_URL is like "http://localhost:8080"
      //If BASE_URL already includes "/api", then remove the "/api" below.
      const res = await authFetch(`${BASE_URL}/api/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        //IMPORTANT BUG FIX:
        //Don't call res.text() twice. Read the body ONCE here:
        const bodyText = await res.text().catch(() => "");
        const data = safeParseJson(bodyText);

        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            bodyText ||
            "Failed to create position",
        );
        return;
      }

      const created = await safeReadJson(res);

      //Some APIs return id/positionId/position_id. We'll accept any of these.
      const createdId =
        created?.id ?? created?.positionId ?? created?.position_id;

      if (!createdId) {
        setFormError(
          "Position was created, but response did not include an id.",
        );
        return;
      }

      alert("Position was created successfully!");
      onResetClick();
      //Optional: navigate somewhere (list/details) after creation
      //navigate("/positions");
    } catch (err) {
      console.error(err);

      //If authFetch threw due to 401, it already navigated to /login.
      //This message is still safe for other errors (network, 500, etc.).
      setFormError(err?.message || "Unexpected error while creating position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.projectContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>
              <FiBriefcase style={{ position: "relative", top: 2 }} /> Create
              Position
            </h3>
            <p className={styles.pageSubtitle}>
              Add a new position to your master data list.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleCreate}
              disabled={loading}
            >
              <FiSave /> {loading ? "Creating..." : "Create"}
            </button>

            <button
              type="button"
              className={styles.deleteButton}
              onClick={onResetClick}
              disabled={loading}
            >
              <FiX /> Reset
            </button>
          </div>
        </div>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Core details</div>
            <div className={styles.cardMeta}>Required field</div>
          </div>

          <div className={styles.formGroup}>
            <label>Position Name</label>
            <input
              //we use computed variable not from styles
              className={inputClass}
              placeholder="e.g. Project Manager"
              //The <input> does not own its own value.
              //React state (positionName) is the single source of truth for what’s shown in the input.
              //So the input displays whatever positionName currently is.

              //Because the input uses value={positionName}, React re-renders and the input shows the new value.
              //This is the “controlled input” loop: type → state updates → UI updates.
              value={positionName}
              //This line connects typing to state updates
              onChange={(e) => {
                /*e.target is the <input> element.
                Updates your state with the latest text.
                */
                setPositionName(e.target.value);

                //functional state update form:
                setFieldErrors((prev) => ({ ...prev, positionName: "" }));
                setFormError("");
              }}
              disabled={loading}
            />

            {/*If there’s an error message, it renders it*/}
            {/*If it’s undefined, it renders nothing visible*/}
            <div className={styles.fieldError}>{fieldErrors.positionName}</div>

            {/*Optional debug for your own learning:
                Shows if ANY field errors exist.
                Remove later if you don’t need it. */}
            {/* <div>hasAnyFieldErrors: {String(hasAnyFieldErrors)}</div> */}
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleCreate}
            disabled={loading}
          >
            <FiSave /> {loading ? "Creating..." : "Create position"}
          </button>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={onResetClick}
            disabled={loading}
          >
            <FiX /> Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePosition;

/*
mergedOptions
{
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abc123",
  },
  body: JSON.stringify({ positionName: "Project Manager" }),
}
*/
