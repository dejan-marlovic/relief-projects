import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.scss";

const BASE_URL = "http://localhost:8080";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  // 🔐 API: Login fetch call
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

      localStorage.setItem("authToken", tokenJson.token);
      setMessage("Login successful!");
      navigate("/project");
    } catch (error) {
      console.error("Error:", error);
      setMessage("Login failed. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
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
