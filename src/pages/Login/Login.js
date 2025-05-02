// Import the React library and the useState hook for managing component state
import React, { useState } from "react";

// Import useNavigate hook from React Router, used to programmatically navigate between pages
import { useNavigate } from "react-router-dom";

// Import styles scoped to this component using CSS Modules (from SCSS file)
import styles from "./Login.module.scss";

// Define the Login functional component
function Login() {
  /**
   *
   *  We don’t have to define our own setter functions manually! (IMPORTANT)
   *
   * useState returns a 2-element array:
   * [stateValue, functionToUpdateIt]
   *
   *  We don’t have to define our own setter functions manually! (IMPORTANT)
   *
   * We're using array destructuring to assign:
   * - username: holds the current username input (initially "")
   * - setUsername: function to update the username
   */
  const [username, setUsername] = useState("");

  // Same as above, for password input
  const [password, setPassword] = useState("");

  // State for displaying success or error messages to the user
  const [message, setMessage] = useState("");

  // useNavigate returns a function used to navigate to a different route
  // here we are just calling that fuction navigate
  /*

  ✅ In short:
  useNavigate() returns a function

  const navigate = ... stores that function

  navigate("/some-path") is how you call that function to change the page
  */
  const navigate = useNavigate();

  /**
   * handleSubmit is called when the form is submitted
   * It prevents the default page reload and performs a login operation
   */
  const handleSubmit = async (e) => {
    // Prevent default form submission behavior (reload)
    e.preventDefault();

    // Create an object containing the credentials to send to the backend
    const loginDetails = { username, password };

    try {
      // Send a POST request to the login API endpoint
      /*

      FETCH, modern, standard JavaScript way to send a POST request using the built-in fetch() API.
      It’s widely used in both vanilla JavaScript and React projects for making HTTP requests.

      fetch(url, options - object)
      
      url: A string — the endpoint you’re making the request to.
      options: An optional object — tells fetch how to behave (method, headers, body, etc).
      
      fetch() is a FUNCTION  CALL, not a function declaration. ()

      fetch(
      PARAMETER 1 ENDPOINT ADDRESS
      
      "where to send it"    ,    
      
      PARAMETER 2 OPTIONS OBJECT

      {
        method: "how to send it", // GET, POST, etc.
        headers: "meta info about the request", // like Content-Type
        body: "what data you're sending" // if needed (for POST/PUT)
      }

      🔄 Returns:
      It returns a Promise that resolves to a Response object. That’s why we use:
      const response = await fetch(...);
      */
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST", // HTTP POST request
        headers: { "Content-Type": "application/json" }, // Tell the server we're sending JSON
        body: JSON.stringify(loginDetails), // Convert loginDetails object to JSON string
      });

      // If the response is not in the 200–299 range, throw an error
      if (!response.ok) throw new Error("Login failed");

      // Parse the JSON response into a JavaScript object
      const tokenJsonObject = await response.json();

      // Store the received token in the browser's localStorage (for later authenticated API calls)
      localStorage.setItem("authToken", tokenJsonObject.token);

      // Show success message to user
      setMessage("Login successful!");

      // Navigate the user to the /project page
      navigate("/project");
    } catch (error) {
      // If an error occurs (network error, bad credentials, etc.), show an error message
      console.error("Error:", error);
      setMessage("Login failed. Please try again.");
    }
  };

  // JSX returned by the component – defines what is rendered on screen
  return (
    <div className={styles.container}>
      {" "}
      {/* Main container with scoped styling */}
      <h2>Login</h2>
      {/* Form element; onSubmit event triggers the handleSubmit function */}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <br />
          <input
            type="text" // Input type is text
            value={username} // Controlled input: value tied to username state
            onChange={(e) => setUsername(e.target.value)} // Update username on change
            required // Field must be filled out before submitting
          />
        </div>

        <div className={styles.formGroup}>
          {" "}
          {/* Additional styling applied to password input group */}
          <label>Password:</label>
          <br />
          <input
            type="password" // Input type is password (hides text)
            value={password} // Controlled input: value tied to password state
            onChange={(e) => setPassword(e.target.value)} // Update password on change
            required // Field must be filled out before submitting
          />
        </div>

        <button type="submit" className={styles.button}>
          Login
        </button>
      </form>
      {/* Conditionally render a message if it's not an empty string */}
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}

// Export the Login component as the default export so it can be imported elsewhere
export default Login;
