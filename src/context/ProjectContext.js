import React, { createContext, useState, useEffect, useCallback } from "react";

import { BASE_URL } from "../config/api"; // adjust path if needed

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

  // 🔄 Fetch: Project IDs and names
  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");

      // ❗ If there's no token yet (user not logged in), don't call the API
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
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export { ProjectProvider };
