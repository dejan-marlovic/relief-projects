import React, { useEffect, useState, useContext } from "react";
import styles from "./Project.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

const Project = () => {
  const { selectedProjectId, setSelectedProjectId, setProjects } =
    useContext(ProjectContext);
  const [projectDetails, setProjectDetails] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch full project details
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

        if (response.status === 404) {
          console.warn(
            `Project ${selectedProjectId} not found, resetting selectedProjectId`
          );
          // Refetch projects to ensure we have the latest list
          const projectsResponse = await fetch(
            "http://localhost:8080/api/projects/active",
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (projectsResponse.ok) {
            const updatedProjects = await projectsResponse.json();
            setProjects(updatedProjects);
            setSelectedProjectId(
              updatedProjects.length > 0 ? updatedProjects[0].id : null
            );
          }
          return;
        }

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
  }, [selectedProjectId, setProjects, setSelectedProjectId]);

  // Fetch project cover image
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

        if (response.status === 404) {
          console.warn(
            `Cover image for project ${selectedProjectId} not found`
          );
          setCoverImage(null);
          return;
        }

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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `http://localhost:8080/api/projects/${projectDetails.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete project");

      // Refetch projects
      const fetchResponse = await fetch(
        "http://localhost:8080/api/projects/active",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!fetchResponse.ok) throw new Error("Failed to fetch projects");
      const updatedProjects = await fetchResponse.json();

      // Update projects and selectedProjectId atomically
      setProjects(updatedProjects);
      setSelectedProjectId(
        updatedProjects.length > 0 ? updatedProjects[0].id : null
      );

      // Clear UI state
      setProjectDetails(null);
      setCoverImage(null);

      alert("Project deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting project.");
    }
  };

  // Placeholder for handleSave (unchanged)
  const handleSave = async () => {
    // Implement save logic here
    console.log("Saving project...");
  };

  return (
    <div className={styles.projectContainer}>
      {loading ? (
        <p>Loading...</p>
      ) : projectDetails ? (
        <>
          <h2>{projectDetails.projectName}</h2>
          {coverImage && (
            <img
              src={`data:image/jpeg;base64,${coverImage}`}
              alt="Project Cover"
              className={styles.coverImage}
            />
          )}
          <p>Status: {projectDetails.status}</p>
          <p>Type: {projectDetails.type}</p>
          <p>Address: {projectDetails.address}</p>
          <button onClick={handleSave}>Save</button>
          <button onClick={handleDelete}>Delete</button>
        </>
      ) : (
        <p>No project selected or project not found.</p>
      )}
    </div>
  );
};

export default Project;
