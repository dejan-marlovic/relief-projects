// Import React core and two hooks: useEffect and useState
import React, { useEffect, useState, useContext } from "react";

// Import styling
import styles from "./Project.module.scss";

// Import context to access selected project ID
import { ProjectContext } from "../../context/ProjectContext"; // Adjust path as needed

// Define main project component
const Project = () => {
  // Access selected project ID from global context
  const { selectedProjectId } = useContext(ProjectContext);

  // State to store full project details
  const [projectDetails, setProjectDetails] = useState(null);

  // State to track loading status
  const [loading, setLoading] = useState(false);

  // Fetch full project details when selected project ID changes
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

        if (!response.ok) throw new Error("Failed to fetch project details");

        const projectDetailsData = await response.json();
        setProjectDetails(projectDetailsData);
      } catch (error) {
        console.error("Error fetching project details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
    //Dependency passed to useEffect so useEffect will run every time
    //selectedProjectId is changed
  }, [selectedProjectId]);

  /*
   An empty array:

  useEffect(() => {
    //Runs only on the first render, because we pass empty arry to useEffect()
  }, []);

  useEffect(() => {
    //Runs on the first render
    //And any time any dependency value changes
  }, [prop, state]);
  */

  // Handle edits to project detail form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.projectContainer}>
      {/* Project details form, shown only if a project is loaded */}
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

// Export the component
export default Project;
