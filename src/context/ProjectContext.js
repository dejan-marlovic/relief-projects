import React, { createContext, useState, useEffect, useRef } from "react";

export const ProjectContext = createContext();

const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState(
    localStorage.getItem("selectedProjectId") || ""
  );
  const hasSetInitialProject = useRef(false);

  const setSelectedProjectId = (id) => {
    const newId = id.toString();
    console.log("setSelectedProjectId called with:", newId, new Error().stack);
    setSelectedProjectIdState(newId);
    localStorage.setItem("selectedProjectId", newId);
  };

  useEffect(() => {
    console.log("ProjectProvider mounted");
    const fetchProjects = async () => {
      console.log("Fetching projects...");
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
        const normalizedProjects = projectNamesAndIds.map((project) => ({
          ...project,
          id: project.id.toString(),
        }));
        setProjects(normalizedProjects);
        if (normalizedProjects.length > 0 && !hasSetInitialProject.current) {
          const storedId = localStorage.getItem("selectedProjectId");
          const validStoredId =
            storedId && normalizedProjects.some((p) => p.id === storedId);
          const initialId = validStoredId ? storedId : normalizedProjects[0].id;
          console.log("Setting initial selectedProjectId:", initialId);
          setSelectedProjectId(initialId);
          hasSetInitialProject.current = true;
        }
      } catch (error) {
        console.error("Error fetching project list:", error);
      }
    };
    fetchProjects();
    return () => console.log("ProjectProvider unmounted");
  }, []);

  useEffect(() => {
    console.log("selectedProjectId changed:", selectedProjectId);
  }, [selectedProjectId]);

  return (
    <ProjectContext.Provider
      value={{ projects, setProjects, selectedProjectId, setSelectedProjectId }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export { ProjectProvider };
