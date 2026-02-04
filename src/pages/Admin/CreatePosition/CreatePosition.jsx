import React, { useState } from "react";
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

  const validate = (name) => {
    const errors = {};
    //If name.trim() is empty → add error
    if (!name.trim()) errors.positionName = "Position name is required";
    return errors;
  };

  const onCreateClick = () => {
    setFormError("");
    setFieldErrors({});

    const errors = validate(positionName);
    if (Object.keys(errors).length) {
      //changed state so we can change class if it contains errors
      setFieldErrors(errors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
  };

  const onResetClick = () => {
    setPositionName("");
    setFieldErrors({});
    setFormError("");
  };

  //hasError becomes true if fieldErrors.positionName has a message
  const hasError = Boolean(fieldErrors.positionName);
  //inputClass becomes "textInput inputError" when invalid, otherwise "textInput"
  const inputClass = `${styles.textInput} ${hasError ? styles.inputError : ""}`;

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
      //If the caller already set headers (like "Content-Type": "application/json"), you preserve them
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
              onClick={onCreateClick}
            >
              <FiSave /> Create
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={onResetClick}
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
            />

            {/*If there’s an error message, it renders it*/}
            {/*If it’s undefined, it renders nothing visible*/}
            <div className={styles.fieldError}>{fieldErrors.positionName}</div>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={onCreateClick}
          >
            <FiSave /> Create position
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={onResetClick}
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
