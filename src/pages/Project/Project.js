//Import React core and two hooks: useEffect and useState
import React, { useEffect, useState } from "react";
import styles from "./Project.module.scss"; // Import scoped styles

//Define main project component
const Project = () => {
  const [projects, setProjects] = useState([]); // List of projects
  const [selectedProjectId, setSelectedProjectId] = useState(""); // Selected ID
  const [projectDetails, setProjectDetails] = useState(null); // Full project details
  const [loading, setLoading] = useState(false); // Loading state

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
        const projectNameAndIds = await response.json();
        setProjects(projectNameAndIds);
        if (projectNameAndIds.length > 0) {
          setSelectedProjectId(projectNameAndIds[0].id.toString()); // Set first project as default
        }
      } catch (error) {
        console.error("Error fetching project list:", error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `http://localhost:8080/api/projects/${selectedProjectId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Faild to fetch project details");
        const projectDetailsData = await response.json();
        setProjectDetails(projectDetailsData);
      } catch (error) {
        console.error("Error fetching project details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [selectedProjectId]);

  const handleSelectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.projectContainer}>
      <div className={styles.selectorContainer}>
        <strong>Select a Project</strong>
        <br />
        <select
          value={selectedProjectId}
          onChange={handleSelectChange}
          className={styles.selectInput}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </select>
      </div>

      {projectDetails && (
        <div className={styles.formContainer}>
          <h3>Project Details</h3>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <form>
              <div>
                <label>Project Name:</label>
                <input
                  type="text"
                  name="projectName"
                  value={projectDetails.projectName || ""}
                  onChange={handleInputChange}
                  className={styles.textInput}
                />
              </div>

              <div>
                <label>Project Code:</label>
                <input
                  type="text"
                  name="projectCode"
                  value={projectDetails.projectCode || ""}
                  onChange={handleInputChange}
                  className={styles.textInput}
                />
              </div>

              <div>
                <label>Reference No:</label>
                <input
                  type="text"
                  name="refProjectNo"
                  value={projectDetails.refProjectNo || ""}
                  onChange={handleInputChange}
                  className={styles.textInput}
                />
              </div>

              <div>
                <label>Funding Source:</label>
                <input
                  type="text"
                  name="fundingSource"
                  value={projectDetails.fundingSource || ""}
                  onChange={handleInputChange}
                  className={styles.textInput}
                />
              </div>

              <div>
                <label>Project Description:</label>
                <textarea
                  name="projectDescription"
                  value={projectDetails.projectDescription || ""}
                  onChange={handleInputChange}
                  rows={4}
                  className={styles.textareaInput}
                />
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Project;
