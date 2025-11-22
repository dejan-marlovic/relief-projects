// Core React imports
import React, { useEffect, useState, useContext } from "react";

// Styles specific to the RegisterProject form
import styles from "./RegisterProject.module.scss";

// Import context to update the global list of projects
import { ProjectContext } from "../../context/ProjectContext";

// ✅ Base URL (backend) – same as in Project component
const BASE_URL = "http://localhost:8080";

// Optional: initial state helper to avoid resetting to {}
const initialProjectDetails = {
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
};

// The main functional component to register a new project
const RegisterProject = () => {
  // Extract the setProjects function from context to update the global project list
  const { setProjects } = useContext(ProjectContext);

  // Local state to hold all input values for the form (controlled component)
  const [projectDetails, setProjectDetails] = useState(initialProjectDetails);

  // Dropdown options fetched from backend
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // ✅ Cover image upload state (NEW – mirrors Project component behavior)
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Load form dropdown data from the server once when component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchData = async () => {
      try {
        const [statuses, types, addresses, projects] = await Promise.all([
          fetch(`${BASE_URL}/api/project-statuses/active`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),

          fetch(`${BASE_URL}/api/project-types/active`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),

          fetch(`${BASE_URL}/api/addresses/active`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),

          fetch(`${BASE_URL}/api/projects/ids-names`, {
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
    const { name, value } = e.target;

    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Helpers to handle selected cover file (NEW)
  const handleCoverFileSelected = (file) => {
    if (!file) return;

    setCoverFile(file);
    setUploadError("");

    // Create local preview URL
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCoverDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleCoverFileSelected(file);
    }
  };

  const handleCoverDragOver = (e) => {
    e.preventDefault();
  };

  const handleCoverFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverFileSelected(file);
    }
  };

  // ✅ Upload cover image AFTER project is created (NEW)
  const uploadCoverImage = async (projectId, file) => {
    if (!projectId || !file) return null;

    setUploadError("");
    setUploadingCover(true);

    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${BASE_URL}/api/projects/${projectId}/cover-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, // don't set Content-Type manually
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload cover image");
      }

      const updatedProject = await response.json();
      return updatedProject;
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  // Submit handler for creating a new project
  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${BASE_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectDetails),
      });

      // 🔴 Just changed this part to read raw text from backend
      if (!response.ok) {
        const backendError = await response.text(); // raw string from backend
        throw new Error(backendError || "Failed to create project");
      }

      const newProject = await response.json();
      let finalProject = newProject;

      // ✅ If user selected a cover file, upload it now using the same API as in Project
      if (coverFile) {
        const updated = await uploadCoverImage(newProject.id, coverFile);
        if (updated) {
          finalProject = updated;
        }
      }

      alert("Project created successfully!");

      // Update global context with the new/updated project
      setProjects((prev) => [...prev, finalProject]);

      // Reset the form and cover image state
      setProjectDetails(initialProjectDetails);
      setCoverFile(null);
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
      setCoverPreview("");
      setUploadError("");
    } catch (error) {
      console.error("Create error:", error);
      // 🔥 This now shows exactly what the backend returned (even if it's ugly)
      alert(error.message || "Error creating project.");
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

            {/* ✅ Project Cover Image drag & drop (NEW – mirrors Project component) */}
            <div>
              <label>Project Cover Image:</label>

              <div
                onDrop={handleCoverDrop}
                onDragOver={handleCoverDragOver}
                className={styles.textInput}
                style={{
                  border: "2px dashed #ccc",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onClick={() =>
                  document.getElementById("registerCoverImageInput")?.click()
                }
              >
                {uploadingCover
                  ? "Uploading..."
                  : "Drag & drop an image here, or click to select"}
              </div>

              <input
                id="registerCoverImageInput"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleCoverFileInput}
              />

              {/* Preview selected image before project is created */}
              {coverPreview && (
                <div style={{ marginTop: "8px" }}>
                  <img
                    src={coverPreview}
                    alt="Selected cover preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "150px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              )}

              {uploadError && (
                <div
                  style={{
                    color: "red",
                    fontSize: "0.85rem",
                    marginTop: "4px",
                  }}
                >
                  {uploadError}
                </div>
              )}
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
