import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.scss";
import { ProjectContext } from "../../context/ProjectContext";
import { BASE_URL } from "../../config/api"; // adjust path if needed

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const { refreshProjects } = useContext(ProjectContext);

  const loginUser = async (credentials) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) throw new Error("Login failed");

    return response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const tokenJson = await loginUser({ username, password });

      // 1️⃣ Store token
      localStorage.setItem("authToken", tokenJson.token);
      setMessage("Login successful!");

      // 2️⃣ Now that token exists, fetch projects so context is populated
      if (typeof refreshProjects === "function") {
        await refreshProjects();
      }

      // 3️⃣ Navigate to project page
      navigate("/project");
    } catch (error) {
      console.error("Error:", error);
      setMessage("Login failed. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      {/* Centered logo above input fields */}
      <div className={styles.logoWrapper}>
        <img
          src="/logo.png"
          alt="Relief Projects logo"
          className={styles.logo}
        />
      </div>

      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label>Password:</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={styles.button}>
          Login
        </button>
      </form>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}

export default Login;
