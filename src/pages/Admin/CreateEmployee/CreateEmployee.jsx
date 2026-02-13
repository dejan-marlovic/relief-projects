import React, { useState } from "react";
import styles from "./CreateEmployee.module.scss";
import { useNavigate } from "react-router-dom";

const CreateEmployee = () => {
  const navigate = useNavigate();

  const [firstName, setFirstname] = useState("");
  const [lastName, setLastName] = useState("");
  const [positionId, setPositionId] = useState("");

  const [positions, setPositions] = useState([]);

  //ui state
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);

  //a helper that behaves like fetch, but injects auth + handles 401.
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("authToken");

    const mergedOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        //Because this line comes after the previous header spread,
        //Authorization will win if someone tried to set Authorization earlier.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const res = await fetch(url, mergedOptions);

    //Checks unauthorized response
    if (res.status === 401) {
      //token is expired
      //Clears token so future requests don’t keep failing.
      localStorage.removeItem("authToken");
      //replace: true removes the current page from history, so back button won’t return to the
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
    //no content safe read json
    if (res.status === 204) return null;
    //if reading fails (network hiccup, stream already consumed, etc.),
    // don’t crash—just use an empty string instead.
    const text = await res.text().catch(() => "");
    return safeParseJson(text);
  };

  const extractFieldErrors = (data) => {
    if (!data) return null;

    if (data.fieldErrors && typeof data.fieldErrors === "object") {
      return data.fieldErrors;
    }

    if (Array.isArray(data.errors)) {
      const fe = {};
      data.errors.forEach((e) => {
        //try diffrent name for fields in array element, for example:
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
        //Every time an element e has both a field and a msg, this line runs:
        if (field && msg) fe[field] = msg;
      });
      //return it only if it got something
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

  return (
    <div className={styles.projectContainer}>
      <div className={styles.formContainer}>
        <h3 className={styles.pageTitle}>Create Employee</h3>
        <p className={styles.pageSubtitle}>Stub works</p>
      </div>
    </div>
  );
};
export default CreateEmployee;
