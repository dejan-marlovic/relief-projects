import React, { createContext, useState, useEffect, useCallback } from "react";

export const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [selectedProjectId, setSelectedProjectIdState] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pendingProjectId, setPendingProjectId] = useState(null);

  // Log state changes for debugging
  useEffect(() => {
    if (selectedProjectId !== null) {
      console.log(
        "ProjectContext.js: selectedProjectId changed:",
        selectedProjectId
      );
    }
  }, [selectedProjectId]);

  // Debounced setSelectedProjectId
  const safeSetSelectedProjectId = useCallback((projectId) => {
    console.log(
      "ProjectContext.js: setSelectedProjectId called with:",
      projectId
    );
    if (projectId === undefined || projectId === null) {
      console.warn(
        "ProjectContext.js: Attempted to set invalid projectId:",
        projectId
      );
      return;
    }
    setPendingProjectId(projectId);
  }, []);

  // Handle debounced projectId updates
  useEffect(() => {
    if (pendingProjectId === null) return;
    const debounceTimeout = setTimeout(() => {
      setSelectedProjectIdState((prev) => {
        if (prev !== pendingProjectId) {
          return pendingProjectId;
        }
        return prev;
      });
      setPendingProjectId(null);
    }, 300); // 300ms debounce
    return () => clearTimeout(debounceTimeout);
  }, [pendingProjectId]);

  // Fetch projects on mount
  useEffect(() => {
    console.log("ProjectContext.js: ProjectProvider mounted");
    let isMounted = true;

    const fetchProjects = async () => {
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
    };

    fetchProjects();

    // Cleanup to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      console.log("ProjectContext.js: ProjectProvider unmounted");
    };
  }, [selectedProjectId, safeSetSelectedProjectId]);

  return (
    <ProjectContext.Provider
      value={{
        selectedProjectId,
        setSelectedProjectId: safeSetSelectedProjectId,
        projects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
