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
    const text = await res.text().catch(() => "");
    return safeParseJson(text);
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
