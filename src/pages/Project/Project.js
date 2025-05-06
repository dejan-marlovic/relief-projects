import React, { useEffect, useState, useContext } from "react";
import styles from "./Project.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

const Project = () => {
  const { selectedProjectId } = useContext(ProjectContext);
  const [projectDetails, setProjectDetails] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);

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
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchCoverImage = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `http://localhost:8080/api/projects/${selectedProjectId}/cover-image`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch cover image");

        const imageData = await response.json();
        setCoverImage(imageData.projectCoverImage);
      } catch (error) {
        console.error("Error fetching cover image:", error);
        setCoverImage(null);
      }
    };

    fetchCoverImage();
  }, [selectedProjectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const autoResize = (textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <div className={styles.projectContainer}>
      {projectDetails && (
        <div className={styles.formContainer}>
          <h3>Project Details</h3>

          <div className={styles.imageAndFormWrapper}>
            {coverImage && (
              <div className={styles.imageContainer}>
                <img
                  src={coverImage}
                  alt="Project Cover"
                  className={styles.coverImage}
                />
              </div>
            )}

            <div className={styles.formContent}>
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
                      onChange={(e) => {
                        handleInputChange(e);
                        autoResize(e.target);
                      }}
                      ref={(el) => el && autoResize(el)}
                      className={styles.textareaInput}
                    />
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Project;
