import React, { createContext, useState, useEffect, useCallback } from "react";

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [selectedProjectId, setSelectedProjectIdState] = useState(null);
  const [projects, setProjects] = useState([]);

  // Log state changes for debugging
  useEffect(() => {
    if (selectedProjectId !== null) {
      console.log(
        "ProjectContext.js: selectedProjectId changed:",
        selectedProjectId
      );
    }
  }, [selectedProjectId]);

  // Simplified setSelectedProjectId with validation
  const safeSetSelectedProjectId = useCallback(
    (projectId) => {
      console.log(
        "ProjectContext.js: setSelectedProjectId called with:",
        projectId
      );
      if (projectId === undefined || projectId === null) {
        console.warn(
          "ProjectContext.js: Attempted to set invalid projectId:",
          projectId
        );
        setSelectedProjectIdState(null);
        return;
      }
      // Validate that projectId exists in projects
      if (projects.some((p) => p.id === projectId)) {
        setSelectedProjectIdState(projectId);
      } else {
        console.warn(
          "ProjectContext.js: Project ID not found in projects:",
          projectId
        );
        setSelectedProjectIdState(projects.length > 0 ? projects[0].id : null);
      }
    },
    [projects]
  );

  // Fetch projects on mount
  useEffect(() => {
    console.log("ProjectContext.js: ProjectProvider mounted");
    let isMounted = true;

    const fetchProjects = debounce(async () => {
      console.log("ProjectContext.js: Fetching projects...");
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          "http://localhost:8080/api/projects/active",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          const normalizedProjects = Array.isArray(data) ? data : [];
          setProjects(normalizedProjects);
          // Set initial selectedProjectId if not already set
          if (normalizedProjects.length > 0 && selectedProjectId === null) {
            console.log(
              "ProjectContext.js: Setting initial selectedProjectId:",
              normalizedProjects[0].id
            );
            safeSetSelectedProjectId(normalizedProjects[0].id);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error(
            "ProjectContext.js: Error fetching projects:",
            error.message
          );
        }
      }
    }, 500); // Debounce for 500ms

    fetchProjects();

    return () => {
      isMounted = false;
      console.log("ProjectContext.js: ProjectProvider unmounted");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedProjectId excluded to prevent unnecessary API calls on selection change
  }, [safeSetSelectedProjectId]);

  return (
    <ProjectContext.Provider
      value={{
        selectedProjectId,
        setSelectedProjectId: safeSetSelectedProjectId,
        projects,
        setProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
