import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  //inital state of username is "" and the update function is given name "setUsername"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); // <-- for redirection

  const handleSubmit = async (e) => {
    e.preventDefault();

    const loginDetails = { username, password };

    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        //turns provided login details from the form into json string and adds it to POST request body
        body: JSON.stringify(loginDetails),
      });

      if (!response.ok) throw new Error("Login failed");

      const tokenJsonObject = await response.json();

      // 🔐 Store the token in localStorage
      localStorage.setItem("authToken", tokenJsonObject.token);

      setMessage("Login successful!");

      // ✅ Redirect to Home
      navigate("/project");
    } catch (error) {
      console.error("Error:", error);
      setMessage("Login failed. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto" }}>
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
        <div style={{ marginTop: "1rem" }}>
          <label>Password:</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: "1rem" }}>
          Login
        </button>
      </form>
      {message && <p style={{ marginTop: "1rem" }}>{message}</p>}
    </div>
  );
}
