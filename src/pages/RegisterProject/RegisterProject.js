// Core React imports
import React, { useEffect, useState, useContext } from "react";

// Styles specific to the RegisterProject form
import styles from "./RegisterProject.module.scss";

// Import context to update the global list of projects
import { ProjectContext } from "../../context/ProjectContext";

// The main functional component to register a new project
const RegisterProject = () => {
  // Extract the setProjects function from context to update the global project list
  const { setProjects } = useContext(ProjectContext);

  // Local state to hold all input values for the form (controlled component)
  const [projectDetails, setProjectDetails] = useState({
    projectCode: "",
    refProjectNo: "",
    projectName: "",
    pinCode: "",
    donorOrganizationId: "",
    fundingSource: "",
    implementingPartnerOrganizationId: "",
    addressId: "",
    foSupportCostPercent: "",
    irwSupportCostPercent: "",
    projectDescription: "",
    projectCoverImage: "",
    projectStatusId: "",
    approved: "Yes", // Default value
    projectPeriodMonths: "",
    projectDate: "",
    projectStart: "",
    projectEnd: "",
    projectStartRev: "",
    projectEndRev: "",
    partOfId: "",
    projectTypeId: "",
  });

  // Dropdown options fetched from backend
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // Load form dropdown data from the server once when component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchData = async () => {
      try {
        const [statuses, types, addresses, projects] = await Promise.all([
          fetch("http://localhost:8080/api/project-statuses/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),

          fetch("http://localhost:8080/api/project-types/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),

          fetch("http://localhost:8080/api/addresses/active", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),

          fetch("http://localhost:8080/api/projects/ids-names", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
        ]);

        setProjectStatuses(statuses);
        setProjectTypes(types);
        setAddresses(addresses);
        setAvailableParentProjects(projects);
      } catch (error) {
        console.error("Error loading form options:", error);
      }
    };

    fetchData();
  }, []);

  // 🧠 This function handles **all input field changes** in the form
  const handleInputChange = (e) => {
    const { name, value } = e.target; // Destructure the name and value of the input that triggered the change

    // Update the corresponding field in projectDetails state immutably
    // React will re-render the component with the new value
    setProjectDetails((prev) => ({
      ...prev, // Copy all existing values
      [name]: value, // Dynamically update only the changed field using bracket notation
    }));
  };

  /*
  📌 What handleInputChange does:
  - Makes this a controlled form (state = single source of truth)
  - Works generically for all inputs by using the input's `name` attribute as the key
  - Allows real-time form updates and validations
  */

  // Submit handler for creating a new project
  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("http://localhost:8080/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectDetails), // Send entire form data to backend
      });

      if (!response.ok) throw new Error("Failed to create project");

      const newProject = await response.json();
      alert("Project created successfully!");

      // Update global context with the new project
      setProjects((prev) => [...prev, newProject]);

      // Optionally reset the form (currently clears everything)
      setProjectDetails({});
    } catch (error) {
      console.error("Create error:", error);
      alert("Error creating project.");
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.formContainer}>
        <h3>Register New Project</h3>

        {/* Begin Form Layout */}
        <form className={styles.formTwoColumn}>
          {/* LEFT COLUMN — general project info */}
          <div className={styles.formColumnLeft}>
            {/* Each input is bound to projectDetails and updates it via handleInputChange */}
            <input
              className={styles.textInput}
              name="projectName"
              placeholder="Project Name"
              value={projectDetails.projectName}
              onChange={handleInputChange}
            />
            <input
              className={styles.textInput}
              name="projectCode"
              placeholder="Project Code"
              value={projectDetails.projectCode}
              onChange={handleInputChange}
            />
            <input
              className={styles.textInput}
              name="refProjectNo"
              placeholder="Reference No"
              value={projectDetails.refProjectNo}
              onChange={handleInputChange}
            />
            <input
              className={styles.textInput}
              name="pinCode"
              placeholder="Pin Code"
              value={projectDetails.pinCode}
              onChange={handleInputChange}
            />
            <input
              className={styles.textInput}
              name="fundingSource"
              placeholder="Funding Source"
              value={projectDetails.fundingSource}
              onChange={handleInputChange}
            />
            <input
              className={styles.textInput}
              type="number"
              step="0.01"
              name="foSupportCostPercent"
              placeholder="FO Support Cost %"
              value={projectDetails.foSupportCostPercent}
              onChange={handleInputChange}
            />
            <input
              className={styles.textInput}
              type="number"
              step="0.01"
              name="irwSupportCostPercent"
              placeholder="IRW Support Cost %"
              value={projectDetails.irwSupportCostPercent}
              onChange={handleInputChange}
            />

            {/* Cover Image Filename */}
            <div className={styles.textInput}>
              <label>Cover Image Filename:</label>
              <input
                type="text"
                name="projectCoverImage"
                className={styles.textInput}
                value={projectDetails.projectCoverImage}
                onChange={handleInputChange}
                placeholder="e.g., flood_relief.jpg"
              />
              <small className={styles.helperText}>
                Enter just the filename (no path)
              </small>
            </div>

            {/* Date inputs */}
            <div className={styles.textInput}>
              <label>Project Date:</label>
              <input
                type="datetime-local"
                name="projectDate"
                className={styles.textInput}
                value={projectDetails.projectDate}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.textInput}>
              <label>Project Start:</label>
              <input
                type="datetime-local"
                name="projectStart"
                className={styles.textInput}
                value={projectDetails.projectStart}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.textInput}>
              <label>Project End:</label>
              <input
                type="datetime-local"
                name="projectEnd"
                className={styles.textInput}
                value={projectDetails.projectEnd}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* RIGHT COLUMN — dropdowns and additional info */}
          <div className={styles.formColumnRight}>
            {/* Project Status */}
            <select
              className={styles.textInput}
              name="projectStatusId"
              value={projectDetails.projectStatusId}
              onChange={handleInputChange}
            >
              <option value="">Select status</option>
              {projectStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.statusName}
                </option>
              ))}
            </select>

            {/* Project Type */}
            <select
              className={styles.textInput}
              name="projectTypeId"
              value={projectDetails.projectTypeId}
              onChange={handleInputChange}
            >
              <option value="">Select type</option>
              {projectTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.projectTypeName}
                </option>
              ))}
            </select>

            {/* Address */}
            <select
              className={styles.textInput}
              name="addressId"
              value={projectDetails.addressId}
              onChange={handleInputChange}
            >
              <option value="">Select address</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.street}, {a.city}
                </option>
              ))}
            </select>

            {/* Parent Project */}
            <select
              className={styles.textInput}
              name="partOfId"
              value={projectDetails.partOfId}
              onChange={handleInputChange}
            >
              <option value="">Select parent project</option>
              {availableParentProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectName}
                </option>
              ))}
            </select>

            {/* Revised dates */}
            <div className={styles.textInput}>
              <label>Project Start (Revised):</label>
              <input
                type="datetime-local"
                name="projectStartRev"
                className={styles.textInput}
                value={projectDetails.projectStartRev}
                onChange={handleInputChange}
              />
            </div>

            <div className={styles.textInput}>
              <label>Project End (Revised):</label>
              <input
                type="datetime-local"
                name="projectEndRev"
                className={styles.textInput}
                value={projectDetails.projectEndRev}
                onChange={handleInputChange}
              />
            </div>

            <input
              className={styles.textInput}
              type="number"
              name="projectPeriodMonths"
              placeholder="Period (Months)"
              value={projectDetails.projectPeriodMonths}
              onChange={handleInputChange}
            />
          </div>
        </form>

        {/* Project Description field */}
        <div className={styles.fullWidthField}>
          <label>Description:</label>
          <textarea
            className={styles.textareaInput}
            name="projectDescription"
            value={projectDetails.projectDescription}
            onChange={handleInputChange}
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleRegister}
          className={styles.saveButton}
        >
          Register Project
        </button>
      </div>
    </div>
  );
};

export default RegisterProject;
