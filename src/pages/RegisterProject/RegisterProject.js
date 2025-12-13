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

// 🔍 Simple client-side validation for required fields
const validateProjectDetails = (values) => {
  const errors = {};

  // 👉 tweak this list based on what you consider required
  if (!values.projectName?.trim()) {
    errors.projectName = "Project name is required.";
  }

  if (!values.projectCode?.trim()) {
    errors.projectCode = "Project code is required.";
  }

  if (!values.projectStatusId) {
    errors.projectStatusId = "Project status is required.";
  }

  if (!values.projectTypeId) {
    errors.projectTypeId = "Project type is required.";
  }

  if (!values.projectDate) {
    errors.projectDate = "Project date is required.";
  }

  if (!values.projectStart) {
    errors.projectStart = "Project start date is required.";
  }

  if (!values.projectEnd) {
    errors.projectEnd = "Project end date is required.";
  }

  return errors;
};

// The main functional component to register a new project
const RegisterProject = () => {
  const [formError, setFormError] = useState(""); // general error message
  const [fieldErrors, setFieldErrors] = useState({}); // { fieldName: "Message" }

  // Extract the setProjects function from context to update the global project list
  const { setProjects } = useContext(ProjectContext);

  // Local state to hold all input values for the form (controlled component)
  const [projectDetails, setProjectDetails] = useState(initialProjectDetails);

  // Dropdown options fetched from backend
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // ✅ Cover image upload state
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

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

  // ✅ Helpers to handle selected cover file
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

  // ✅ Upload cover image AFTER project is created
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

  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // Clear previous errors
      setFormError("");
      setFieldErrors({});

      // ✅ FRONTEND REQUIRED-FIELD VALIDATION
      const errors = validateProjectDetails(projectDetails);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        // ⛔ Don't call backend if basic validation fails
        return;
      }

      const response = await fetch(`${BASE_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectDetails),
      });

      if (!response.ok) {
        // Try to parse JSON error from backend (ApiError)
        let data = null;
        const text = await response.text();

        console.log("🔴 Backend error raw text:", text);

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        console.log("🔴 Parsed backend error object:", data);

        if (data) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          }

          setFormError(
            data.message || "There was a problem creating the project."
          );
        } else {
          setFormError("There was a problem creating the project.");
        }

        // Stop here – don't continue with success flow
        return;
      }

      const newProject = await response.json();
      let finalProject = newProject;

      // ✅ If user selected a cover file, upload it now
      if (coverFile) {
        const updated = await uploadCoverImage(newProject.id, coverFile);
        if (updated) {
          finalProject = updated;
        }
      }

      alert("Project created successfully!");

      setProjects((prev) => [...prev, finalProject]);

      // Reset form + cover image + errors
      setProjectDetails(initialProjectDetails);
      setCoverFile(null);
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
      setCoverPreview("");
      setUploadError("");
      setFormError("");
      setFieldErrors({});
    } catch (error) {
      console.error("Create error:", error);
      setFormError("Unexpected error while creating project.");
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.formContainer}>
        <h3>Register New Project</h3>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        {Object.keys(fieldErrors).length > 0 && (
          <div className={styles.errorList}>
            <ul>
              {Object.entries(fieldErrors).map(([field, message]) => (
                <li key={field}>
                  <strong>{field}</strong>: {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Begin Form Layout */}
        <form className={styles.formTwoColumn}>
          {/* LEFT COLUMN — general project info */}
          <div className={styles.formColumnLeft}>
            {/* Project Name */}
            <input
              className={inputClass("projectName")}
              name="projectName"
              placeholder="Project Name"
              value={projectDetails.projectName}
              onChange={handleInputChange}
            />
            {getFieldError("projectName") && (
              <div className={styles.fieldError}>
                {getFieldError("projectName")}
              </div>
            )}

            {/* Project Code */}
            <input
              className={inputClass("projectCode")}
              name="projectCode"
              placeholder="Project Code"
              value={projectDetails.projectCode}
              onChange={handleInputChange}
            />
            {getFieldError("projectCode") && (
              <div className={styles.fieldError}>
                {getFieldError("projectCode")}
              </div>
            )}

            {/* Reference No */}
            <input
              className={styles.textInput}
              name="refProjectNo"
              placeholder="Reference No"
              value={projectDetails.refProjectNo}
              onChange={handleInputChange}
            />

            {/* Pin Code */}
            <input
              className={styles.textInput}
              name="pinCode"
              placeholder="Pin Code"
              value={projectDetails.pinCode}
              onChange={handleInputChange}
            />

            {/* Funding Source */}
            <input
              className={styles.textInput}
              name="fundingSource"
              placeholder="Funding Source"
              value={projectDetails.fundingSource}
              onChange={handleInputChange}
            />

            {/* FO Support Cost % */}
            <input
              className={styles.textInput}
              type="number"
              step="0.01"
              name="foSupportCostPercent"
              placeholder="FO Support Cost %"
              value={projectDetails.foSupportCostPercent}
              onChange={handleInputChange}
            />

            {/* IRW Support Cost % */}
            <input
              className={styles.textInput}
              type="number"
              step="0.01"
              name="irwSupportCostPercent"
              placeholder="IRW Support Cost %"
              value={projectDetails.irwSupportCostPercent}
              onChange={handleInputChange}
            />

            {/* Project Cover Image */}
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
                className={inputClass("projectDate")}
                value={projectDetails.projectDate}
                onChange={handleInputChange}
              />
            </div>
            {getFieldError("projectDate") && (
              <div className={styles.fieldError}>
                {getFieldError("projectDate")}
              </div>
            )}

            <div className={styles.textInput}>
              <label>Project Start:</label>
              <input
                type="datetime-local"
                name="projectStart"
                className={inputClass("projectStart")}
                value={projectDetails.projectStart}
                onChange={handleInputChange}
              />
            </div>
            {getFieldError("projectStart") && (
              <div className={styles.fieldError}>
                {getFieldError("projectStart")}
              </div>
            )}

            <div className={styles.textInput}>
              <label>Project End:</label>
              <input
                type="datetime-local"
                name="projectEnd"
                className={inputClass("projectEnd")}
                value={projectDetails.projectEnd}
                onChange={handleInputChange}
              />
            </div>
            {getFieldError("projectEnd") && (
              <div className={styles.fieldError}>
                {getFieldError("projectEnd")}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — dropdowns and additional info */}
          <div className={styles.formColumnRight}>
            {/* Project Status */}
            <select
              className={inputClass("projectStatusId")}
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
            {getFieldError("projectStatusId") && (
              <div className={styles.fieldError}>
                {getFieldError("projectStatusId")}
              </div>
            )}

            {/* Project Type */}
            <select
              className={inputClass("projectTypeId")}
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
            {getFieldError("projectTypeId") && (
              <div className={styles.fieldError}>
                {getFieldError("projectTypeId")}
              </div>
            )}

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
