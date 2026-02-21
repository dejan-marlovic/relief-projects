import React, { useEffect, useState } from "react";
import { FiSave, FiX, FiUser, FiAlertCircle } from "react-icons/fi";
import styles from "./CreateEmployee.module.scss";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/api";

const CreateEmployee = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [positionId, setPositionId] = useState("");

  const [positions, setPositions] = useState([]);

  // ui state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // a helper that behaves like fetch, but injects auth + handles 401.
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("authToken");
    const hasToken = token && token !== "null" && token !== "undefined";

    const mergedOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        // Because this line comes after the previous header spread,
        // Authorization will win if someone tried to set Authorization earlier.
        ...(hasToken ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const res = await fetch(url, mergedOptions);

    // Checks unauthorized response
    if (res.status === 401) {
      // token is expired
      // Clears token so future requests don’t keep failing.
      localStorage.removeItem("authToken");
      // replace: true removes the current page from history, so back button won’t return to the
      // protected page
      navigate("/login", { replace: true });
      throw new Error("Unauthorized - redirecting to login");
    }
    return res;
  };

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
    // no content safe read json
    if (res.status === 204) return null;
    // if reading fails (network hiccup, stream already consumed, etc.),
    // don’t crash—just use an empty string instead.
    const text = await res.text().catch(() => "");
    return safeParseJson(text);
  };

  const extractFieldErrors = (data) => {
    if (!data) return null;

    // Note: arrays are also "object", so we exclude arrays here
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
        // try diffrent name for fields in array element, for example:
        /*
        {
            "errors": [
                { "field": "firstName", "message": "Required" }
            ]
        }
            backend A uses field

            backend B uses name

            backend C uses path
        */
        const field = e.field || e.name || e.property || e.path;
        const msg = e.defaultMessage || e.message || e.msg;
        // Every time an element e has both a field and a msg, this line runs:
        if (field && msg) fe[field] = msg;
      });
      // return it only if it got something
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

  const validate = (values) => {
    const errors = {};
    if (!values.firstName.trim()) errors.firstName = "First name is required";
    //do these state values exist / are they non-empty?
    if (!values.lastName.trim()) errors.lastName = "Last name is required";
    // positionId is a selected value, so checking falsy is enough
    if (!values.positionId) errors.positionId = "Position is required";
    return errors; // ✅ IMPORTANT: return the errors object
  };

  const onResetClick = () => {
    setFirstName("");
    setLastName("");
    setPositionId(""); // clears selection only

    // do NOT reset positions — that's the "loaded list" we keep
    // setPositions([]);  <-- don't do this

    setFieldErrors({}); // note: this should be an object, not []
    setFormError("");
  };

  const inputClass = (fieldName) => {
    // checks if field has errors in our fieldErrors state
    const hasError = Boolean(fieldErrors?.[fieldName]);
    return `${styles.textInput} ${hasError ? styles.hasError : ""}`;
  };

  useEffect(() => {
    const loadPostions = async () => {
      try {
        setLoading(true);
        setFormError("");

        const token = localStorage.getItem("authToken");
        if (!token) {
          // don’t add this navigation to the browser history—replace the current entry
          // If we didn’t use replace: true, the user could:
          /*
          get redirected to /login

          press the browser Back button

          land back on the protected page again (which might immediately redirect again, or briefly show
          */
          navigate("/login", { replace: true });
          // exit the function if there is no token
          return;
        }

        // ✅ endpoint spelling fix: positions
        const res = await authFetch(`${BASE_URL}/api/positions/active`, {
          headers: { "Content-Type": "application/json" },
        });

        const data = await safeReadJson(res);
        setPositions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setPositions([]);
        setFormError("Failed to load positions.");
      } finally {
        setLoading(false);
      }
    };

    // ✅ IMPORTANT: actually call the async loader
    loadPostions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    try {
      setFormError("");
      setFieldErrors({});
      const errors = validate({ firstName, lastName, positionId });
      //is keys array for errors full?
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        //adding banner message if we have errors
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        positionId: Number(positionId),
      };

      const res = await authFetch(`${BASE_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      //if we dont get ok status
      //extract field erros form backend
      if (!res.ok) {
        // ✅ Use safeReadJson here too so we don't have to hand-parse
        const data = await safeReadJson(res);

        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message || data?.detail || "Failed to create employee",
        );
        return;
      }

      const created = await safeReadJson(res);

      const createdId =
        created?.id ?? created?.employeeId ?? created?.employee_id;

      if (!createdId) {
        setFormError(
          "Employee was created, but response did not include an id.",
        );
        return;
      }

      alert("Employee was created successfully!");
      onResetClick();
    } catch (err) {
      console.error(err);
      setFormError(err?.message || "Unexpected error while creating employee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.projectContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            {/* ✅ className spelling fix */}
            <h3 className={styles.pageTitle}>
              {/* ✅ position spelling fix */}
              <FiUser style={{ position: "relative", top: 2 }} /> Create
              Employee
            </h3>
            <p className={styles.pageSubtitle}>
              Add an employee and assign a position.
            </p>
          </div>
        </div>

        {formError && (
          // ✅ icon is not a wrapper; it should be a sibling element
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Core Details</div>
            <div className={styles.cardMeta}>Required fields</div>
          </div>

          <div className={styles.formGroup}>
            <label>First name</label>
            <input
              // inputClass helper returns className + error className if there is an error for firsName filed
              className={inputClass("firstName")}
              // Makes it a controlled input.
              // The visible text in the input always comes from React state firstName.
              value={firstName}
              // Runs every time the user types.
              onChange={(e) => {
                // e is the change event, e.target is the input.
                setFirstName(e.target.value);
                // Updates state to the new text the user typed.
                // This keeps the input in sync with React state.
                // (prev) => ... is used so you don’t lose errors for other fields.
                setFieldErrors((prev) => ({ ...prev, firstName: "" }));
                setFormError("");
              }}
              // Disables the input when loading is true (e.g., while fetching positions or submitting).
              disabled={loading}
              placeholder="e.g Dejan"
            />
            <div className={styles.fieldError}>{fieldErrors.firstName}</div>
          </div>

          <div className={styles.formGroup}>
            <label>Last Name</label>
            <input
              className={inputClass("lastName")}
              value={lastName}
              // e is change event
              onChange={(e) => {
                // e.target is the element
                //// Updates state to the new text the user typed.
                setLastName(e.target.value);
                //// (prev) => ... is used so you don’t lose errors for other fields.
                // ✅ FIX: functional updater signature
                setFieldErrors((prev) => ({ ...prev, lastName: "" }));
                setFormError("");
              }}
              // Disables the input when loading is true (e.g., while fetching positions or submitting).
              disabled={loading}
              placeholder="e.g. Svensson"
            />
            <div className={styles.fieldError}>{fieldErrors.lastName}</div>
          </div>

          <div className={styles.formGroup}>
            <label>Position</label>
            <select
              // ✅ FIX: positionId spelling
              className={inputClass("positionId")}
              value={positionId}
              onChange={(e) => {
                // e.target is the <select> element
                // Update state to the newly selected option value (position id)
                setPositionId(e.target.value);

                // Functional updater: keep other field errors, clear only this field's error
                setFieldErrors((prev) => ({ ...prev, positionId: "" }));

                // Clear the general/top form error banner when the user makes a correction
                setFormError("");
              }}
              disabled={loading}
            >
              <option value="">Select position</option>
              {/*we define function map will use
              (p) => (...) is an arrow function

              Implicit return:

              (p) => (
                <option>...</option>
              )

             Explicit return, we need to write return

             (p) => {
              return <option>...</option>;
             }
              */}
              {positions.map((p) => {
                const id = p.id ?? p.positionId;
                // ✅ FIX: key prop name + robust id field
                return (
                  <option key={id} value={id}>
                    {p.positionName ?? p.name ?? `Position #${id}`}
                  </option>
                );
              })}
            </select>
            <div className={styles.fieldError}>{fieldErrors.positionId}</div>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.saveButton}
            disabled={loading}
            onClick={handleCreate}
          >
            {/* ✅ add content so button is visible */}
            <FiSave /> {loading ? "Creating..." : "Create employee"}
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

export default CreateEmployee;
