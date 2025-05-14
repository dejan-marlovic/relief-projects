// Import React and core hooks:
// - createContext: to create a new context for sharing global state
// - useState: to hold component-level state
// - useEffect: to perform side effects (like fetching data on mount)
import React, { createContext, useState, useEffect } from "react";

// Create a context object that components can subscribe to.
// This acts like a global state container specifically for project-related data.
export const ProjectContext = createContext();

/*
📘 Context: Why and When?
React Context allows data (like selectedProjectId and the list of projects)
to be shared across many components without passing props manually at each level.

This is especially useful for cross-cutting state like "current project",
which may be needed in headers, forms, dashboards, etc.
*/

// Define the Provider component that will wrap the application
const ProjectProvider = ({ children }) => {
  // This state holds the list of projects returned from the backend API
  const [projects, setProjects] = useState([]);

  // This state holds the ID of the currently selected project
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // useEffect runs once when the component mounts (initial render)
  useEffect(() => {
    // Define an async function to fetch project data from backend
    const fetchProjects = async () => {
      try {
        // 🔐 Step 1: Retrieve token from localStorage to authorize API requests
        const token = localStorage.getItem("authToken");

        // 🔍 Step 2: Make a GET request to fetch project IDs and names
        const response = await fetch(
          "http://localhost:8080/api/projects/ids-names",
          {
            method: "GET", // Optional here, since fetch defaults to GET
            headers: {
              // Specify we expect JSON data back from the server
              "Content-Type": "application/json",

              // Include the token in the Authorization header for secure access
              // This tells the server who the user is and whether they are allowed to access this endpoint
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // ❌ If the response is not successful (status 200–299), throw an error
        if (!response.ok) throw new Error("Failed to fetch projects");

        // ✅ Parse the JSON response (list of { id, projectName } objects)
        const projectNamesAndIds = await response.json();

        // 💾 Store the fetched list into state so all components using this context can access it
        setProjects(projectNamesAndIds);

        // ✅ If there are any projects, select the first one by default
        if (projectNamesAndIds.length > 0) {
          // Store the ID as a string (important for dropdowns or form controls that expect string values)
          setSelectedProjectId(projectNamesAndIds[0].id.toString());
        }
      } catch (error) {
        // 🛑 Handle any error that happens during the fetch (e.g., network issues, auth errors)
        console.error("Error fetching project list:", error);
      }
    };

    // Trigger the API call when the component mounts
    fetchProjects();
  }, []); // Empty dependency array → only runs once after first render

  /*
  👇 Return the context provider with the actual shared values:
  Any component wrapped inside <ProjectProvider> can access this data using useContext(ProjectContext)
  */
  return (
    <ProjectContext.Provider
      value={{
        projects, // list of all available projects
        setProjects, // function to update project list
        selectedProjectId, // currently selected project ID
        setSelectedProjectId, // function to change the selected project
      }}
    >
      {children}{" "}
      {/* 👶 Render all nested children that will consume this context */}
    </ProjectContext.Provider>
  );
};

// Export both the context and the provider
// So other files can import and wrap their components in <ProjectProvider>
export { ProjectProvider };
