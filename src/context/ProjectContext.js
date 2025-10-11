import React, { createContext, useState, useEffect } from "react";

const BASE_URL = "http://localhost:8080";

export const ProjectContext = createContext();

const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // 🔄 Fetch: Project IDs and names
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${BASE_URL}/api/projects/ids-names`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

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

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        setProjects,
        selectedProjectId,
        setSelectedProjectId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export { ProjectProvider };
