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

// Define the provider component
const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const response = await fetch(
          "http://localhost:8080/api/projects/ids-names",
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch projects");

        const projectNamesAndIds = await response.json();
        setProjects(projectNamesAndIds);

        if (projectNamesAndIds.length > 0) {
          setSelectedProjectId(projectNamesAndIds[0].id.toString());
        }
      } catch (error) {
        console.error("Error fetching project list:", error);
      }
    };

    fetchProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{ projects, setProjects, selectedProjectId, setSelectedProjectId }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

// Export the provider at the end
export { ProjectProvider };
