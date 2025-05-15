// Import necessary React hooks and modules
import React, { useEffect, useState, useContext } from "react";

// Import scoped CSS module for styling
import styles from "./Project.module.scss";

// Import ProjectContext to access the currently selected project ID
import { ProjectContext } from "../../context/ProjectContext";

// Define the Project component
const Project = () => {
  // Extract selected project ID from global context
  const { selectedProjectId, setSelectedProjectId, projects, setProjects } =
    useContext(ProjectContext);

  // Local state for full project details
  const [projectDetails, setProjectDetails] = useState(null);

  // Local state for project cover image URL
  const [coverImage, setCoverImage] = useState(null);

  const coverImagePath = "/images/projects/";

  // State to track whether the data is being loaded
  const [loading, setLoading] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState([]);

  const [projectTypes, setProjectTypes] = useState([]);

  const [addresses, setAddresses] = useState([]);

  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // Fetch full project details from backend when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return; // Do nothing if no project selected

    const fetchProjectDetails = async () => {
      try {
        setLoading(true); // Start loading
        const token = localStorage.getItem("authToken"); // Get auth token
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

        const projectDetailsData = await response.json(); // Parse response
        setProjectDetails(projectDetailsData); // Update state with data
      } catch (error) {
        console.error("Error fetching project details:", error); // Log error
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchProjectDetails(); // Trigger fetch
  }, [selectedProjectId]); // Dependency: runs when selectedProjectId changes

  useEffect(() => {
    const fetchProjectStatuses = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          "http://localhost:8080/api/project-statuses/active",
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch project statuses");

        const statuses = await response.json();
        setProjectStatuses(statuses);
      } catch (error) {
        console.error("Error fetching project statuses:", error);
      }
    };

    fetchProjectStatuses();
  }, []);

  useEffect(() => {
    const fetchAvailableParentProjects = async () => {
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

        if (!response.ok) throw new Error("Failed to fetch project list");

        const allProjects = await response.json();

        // Exclude the currently selected project from the dropdown
        const filteredProjects = allProjects.filter(
          (p) => p.id.toString() !== selectedProjectId
        );

        setAvailableParentProjects(filteredProjects);
      } catch (error) {
        console.error("Error fetching parent projects:", error);
      }
    };

    fetchAvailableParentProjects();
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchTypesAndAddresses = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const [typeRes, addressRes] = await Promise.all([
          fetch("http://localhost:8080/api/project-types/active", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:8080/api/addresses/active", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!typeRes.ok) throw new Error("Failed to fetch project types");
        if (!addressRes.ok) throw new Error("Failed to fetch addresses");

        const typesData = await typeRes.json();
        const addressesData = await addressRes.json();

        setProjectTypes(typesData);
        setAddresses(addressesData);
      } catch (error) {
        console.error("Error fetching types or addresses:", error);
      }
    };

    fetchTypesAndAddresses();
  }, []);

  // Fetch project cover image from backend when selectedProjectId changes
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
        setCoverImage(imageData.projectCoverImage); // Save image URL
      } catch (error) {
        console.error("Error fetching cover image:", error);
        setCoverImage(null); // Reset if error occurs
      }
    };

    fetchCoverImage(); // Trigger image fetch
  }, [selectedProjectId]);

  // Handle input field changes by updating local projectDetails state
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Automatically resize textarea to fit content
  const autoResize = (textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto"; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Set height to fit content
  };

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

      alert("Project deleted successfully!");

      // Filter it out from context
      const updatedProjects = projects.filter(
        (p) => p.id !== projectDetails.id
      );
      setProjects(updatedProjects);

      // Reset to another project if available
      if (updatedProjects.length > 0) {
        setSelectedProjectId(updatedProjects[0].id.toString());
      } else {
        setSelectedProjectId("");
      }

      // Optionally clear UI state
      setProjectDetails(null);
      setCoverImage(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting project.");
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `http://localhost:8080/api/projects/${projectDetails.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(projectDetails),
        }
      );

      if (!response.ok) throw new Error("Failed to update project");

      alert("Project updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      alert("Error updating project.");
    }
  };

  return (
    <div className={styles.projectContainer}>
      {/* Render form only if project details are available */}
      {projectDetails && (
        <div className={styles.formContainer}>
          <h3>Project Details</h3>

          {/* Wrapper for image and form side-by-side */}
          <div className={styles.imageAndFormWrapper}>
            {/* Show image if available */}
            {coverImage && (
              <div className={styles.imageContainer}>
                <img
                  src={`${coverImagePath}${coverImage}`}
                  alt="Project Cover"
                  className={styles.coverImage}
                />
              </div>
            )}

            {/* Main form content */}
            <div className={styles.formContent}>
              {loading ? (
                <p>Loading...</p> // Show loading indicator
              ) : (
                <form>
                  {/* Project Description */}
                  <div className={(styles.fullWidthField, styles.textInput)}>
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
                  <div className={styles.formTwoColumn}>
                    {/* Left Column */}
                    <div className={styles.formColumnLeft}>
                      {/* Place first half of fields here */}
                      {/* Project Name */}
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

                      {/* Project Code */}
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

                      {/* Reference Number */}
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

                      {/* Pin Code */}
                      <div>
                        <label>Pin Code:</label>
                        <input
                          type="text"
                          name="pinCode"
                          value={projectDetails.pinCode || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Funding Source */}
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

                      {/* FO Support Cost % */}
                      <div>
                        <label>FO Support Cost (%):</label>
                        <input
                          type="number"
                          step="0.01"
                          name="foSupportCostPercent"
                          value={projectDetails.foSupportCostPercent || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* IRW Support Cost % */}
                      <div>
                        <label>IRW Support Cost (%):</label>
                        <input
                          type="number"
                          step="0.01"
                          name="irwSupportCostPercent"
                          value={projectDetails.irwSupportCostPercent || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project Cover Image Filename */}
                      <div>
                        <label>Project Cover Image Filename:</label>
                        <input
                          type="text"
                          name="projectCoverImage"
                          value={projectDetails.projectCoverImage || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                          placeholder="e.g., flood_relief.jpg"
                        />
                      </div>

                      {/* Approved */}
                      <div>
                        <label>Approved:</label>
                        <select
                          name="approved"
                          value={projectDetails.approved || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleSave}
                        className={styles.saveButton}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Right Column */}
                    <div className={styles.formColumnRight}>
                      {/* Project Status ID */}
                      <div>
                        <label>Project Status:</label>
                        <select
                          name="projectStatusId"
                          value={projectDetails.projectStatusId || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Select status</option>
                          {projectStatuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.statusName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Project Type ID */}
                      <div>
                        <label>Project Type:</label>
                        <select
                          name="projectTypeId"
                          value={projectDetails.projectTypeId || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Select type</option>
                          {projectTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.projectTypeName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Address ID */}
                      <div>
                        <label>Address:</label>
                        <select
                          name="addressId"
                          value={projectDetails.addressId || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Select address</option>
                          {addresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.street || ""}, {address.city || ""},{" "}
                              {address.country}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Project Period (Months) */}
                      <div>
                        <label>Project Period (Months):</label>
                        <input
                          type="number"
                          name="projectPeriodMonths"
                          value={projectDetails.projectPeriodMonths || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project Date */}
                      <div>
                        <label>Project Date:</label>
                        <input
                          type="datetime-local"
                          name="projectDate"
                          value={
                            projectDetails.projectDate
                              ? projectDetails.projectDate.slice(0, 16)
                              : ""
                          }
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project Start */}
                      <div>
                        <label>Project Start:</label>
                        <input
                          type="datetime-local"
                          name="projectStart"
                          value={
                            projectDetails.projectStart
                              ? projectDetails.projectStart.slice(0, 16)
                              : ""
                          }
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project End */}
                      <div>
                        <label>Project End:</label>
                        <input
                          type="datetime-local"
                          name="projectEnd"
                          value={
                            projectDetails.projectEnd
                              ? projectDetails.projectEnd.slice(0, 16)
                              : ""
                          }
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project Start Revision */}
                      <div>
                        <label>Project Start (Revised):</label>
                        <input
                          type="datetime-local"
                          name="projectStartRev"
                          value={
                            projectDetails.projectStartRev
                              ? projectDetails.projectStartRev.slice(0, 16)
                              : ""
                          }
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project End Revision */}
                      <div>
                        <label>Project End (Revised):</label>
                        <input
                          type="datetime-local"
                          name="projectEndRev"
                          value={
                            projectDetails.projectEndRev
                              ? projectDetails.projectEndRev.slice(0, 16)
                              : ""
                          }
                          onChange={handleInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Part Of Project ID */}
                      <div>
                        <label>Part Of Project:</label>
                        <select
                          name="partOfId"
                          value={projectDetails.partOfId || ""}
                          onChange={handleInputChange}
                          className={styles.textInput}
                        >
                          <option value="">Select parent project</option>
                          {availableParentProjects.map((proj) => (
                            <option key={proj.id} value={proj.id}>
                              {proj.projectName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
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

// Export the component to be used in routes
export default Project;
