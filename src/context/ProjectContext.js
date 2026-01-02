import React, { createContext, useState, useEffect, useCallback } from "react";

const BASE_URL = "http://localhost:8080";

export const ProjectContext = createContext();

const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);

  // ✅ restore last selected project on mount
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    try {
      return localStorage.getItem("selectedProjectId") || "";
    } catch {
      return "";
    }
  });

  // ✅ DEBUG: detect provider remounts (temporary)
  useEffect(() => {
    console.log("✅ ProjectProvider mounted");
    return () => console.log("❌ ProjectProvider unmounted");
  }, []);

  // ✅ persist selection whenever it changes
  useEffect(() => {
    try {
      if (selectedProjectId) {
        localStorage.setItem("selectedProjectId", selectedProjectId);
      } else {
        localStorage.removeItem("selectedProjectId");
      }
    } catch {
      // ignore
    }
  }, [selectedProjectId]);

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

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

      // ✅ keep current selection if it still exists; otherwise default to first
      setSelectedProjectId((prev) => {
        const prevStr = prev ? String(prev) : "";
        const exists = prevStr && list.some((p) => String(p.id) === prevStr);

        if (exists) return prevStr;
        if (list.length > 0) return String(list[0].id);
        return "";
      });
    } catch (error) {
      console.error("Error fetching project list:", error);
    }
  }, []);

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
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export { ProjectProvider };
