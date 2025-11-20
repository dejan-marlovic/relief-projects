import React, { createContext, useState, useEffect, useCallback } from "react";

const BASE_URL = "http://localhost:8080";

export const ProjectContext = createContext();

const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // 🔄 Fetch: Project IDs and names
  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");

      // ❗ If there's no token yet (user not logged in), don't call the API
      if (!token) {
        return;
      }

      const response = await fetch(`${BASE_URL}/api/projects/ids-names`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch projects");

      const projectNamesAndIds = await response.json();

      const list = Array.isArray(projectNamesAndIds) ? projectNamesAndIds : [];

      setProjects(list);

      // Only set a default selected project if we don't already have one
      setSelectedProjectId((prev) => {
        if (prev) return prev;
        if (list.length > 0) {
          return list[0].id.toString();
        }
        return "";
      });
    } catch (error) {
      console.error("Error fetching project list:", error);
    }
  }, []);

  // Try to fetch on mount (works when user refreshes while already logged in)
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        setProjects,
        selectedProjectId,
        setSelectedProjectId,
        // 👇 this is what Login will call after successful login
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export { ProjectProvider };
