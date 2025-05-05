// Import React core and hooks for managing context and state
import React, { createContext, useState, useEffect } from "react";

// Create the context object.
// This is like creating a "global store" that components can read from or write to.
/*
🧠 What is React Context?
React Context is a built-in feature that allows you to share data globally across your component 
tree—without manually passing props down at every level.

In this case, you're sharing the list of projects and the currently selected project ID between 
many components (like Project, Budgets, etc.). Instead of lifting state up and drilling props down through 
every layout or tab component, Context gives you a cleaner, centralized way to do that.

*/
export const ProjectContext = createContext();

// Create the provider component that wraps around the app
// This is what actually provides the values (state + setters) to components.
export const ProjectProvider = ({ children }) => {
  // Local state to store all project ID-name pairs
  const [projects, setProjects] = useState([]);

  // Local state to store the currently selected project's ID
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Fetch the list of project names and IDs from the backend once, when the app starts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Get auth token from local storage
        const token = localStorage.getItem("authToken");

        // Call the backend to fetch project names + IDs
        const response = await fetch(
          "http://localhost:8080/api/projects/ids-names",
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Throw error if fetch fails
        if (!response.ok) throw new Error("Failed to fetch projects");

        // Parse response JSON and store in state
        const projectList = await response.json();
        setProjects(projectList);

        // Automatically select the first project (if any)
        if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].id.toString());
        }
      } catch (error) {
        console.error("Error fetching project list:", error);
      }
    };

    // Run fetch function
    fetchProjects();
  }, []); // Empty dependency array = run only once when component mounts

  // Wrap the entire app (or part of it) with this provider
  // so any nested component can access the project state
  return (
    <ProjectContext.Provider
      value={{ projects, selectedProjectId, setSelectedProjectId }}
    >
      {children} {/* All child components will have access to this context */}
    </ProjectContext.Provider>
  );
};
