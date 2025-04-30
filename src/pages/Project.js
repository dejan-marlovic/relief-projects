import React, { useEffect, useState } from "react";

const Project = () => {
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
              Authorization: `Bearer ${token}`, // 🔐 Add token here
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error("Error fetching project list:", error);
      }
    };

    fetchProjects();
  }, []);

  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "2rem auto" }}>
      <h2>Select a Project</h2>
      <select
        value={selectedProjectId}
        onChange={handleSelectChange}
        style={{ width: "100%", padding: "0.5rem" }}
      >
        <option value="">-- Select a Project --</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.projectName}
          </option>
        ))}
      </select>

      {selectedProjectId && (
        <p style={{ marginTop: "1rem" }}>
          Selected Project ID: <strong>{selectedProjectId}</strong>
        </p>
      )}
    </div>
  );
};

export default Project;
