// Core React imports
import React, { useEffect, useState, useContext, useMemo } from "react";

// Styles specific to the RegisterProject form
import styles from "./RegisterProject.module.scss";

// Import context to update the global list of projects
import { ProjectContext } from "../../context/ProjectContext";

// ✅ Icons (same vibe as Project/Budget)
import {
  FiSave,
  FiX,
  FiUploadCloud,
  FiImage,
  FiAlertCircle,
} from "react-icons/fi";

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

// 🔍 Simple client-side validation for required fields (UX only)
// Backend still validates with @NotNull / @NotBlank
const validateProjectDetails = (values) => {
  const errors = {};

  if (!values.projectName?.trim())
    errors.projectName = "Project name is required.";
  if (!values.projectCode?.trim())
    errors.projectCode = "Project code is required.";
  if (!values.projectStatusId)
    errors.projectStatusId = "Project status is required.";
  if (!values.projectTypeId) errors.projectTypeId = "Project type is required.";
  if (!values.projectDate) errors.projectDate = "Project date is required.";
  if (!values.projectStart)
    errors.projectStart = "Project start date is required.";
  if (!values.projectEnd) errors.projectEnd = "Project end date is required.";

  return errors;
};

const RegisterProject = () => {
  const [loading, setLoading] = useState(false);

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const { setProjects } = useContext(ProjectContext);

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

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load form dropdown data from the server once when component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const fetchData = async () => {
      try {
        setLoading(true);

        const [statuses, types, addrs, projects] = await Promise.all([
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

        setProjectStatuses(Array.isArray(statuses) ? statuses : []);
        setProjectTypes(Array.isArray(types) ? types : []);
        setAddresses(Array.isArray(addrs) ? addrs : []);
        setAvailableParentProjects(Array.isArray(projects) ? projects : []);
      } catch (error) {
        console.error("Error loading form options:", error);
        setProjectStatuses([]);
        setProjectTypes([]);
        setAddresses([]);
        setAvailableParentProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ cover picker helpers
  const handleCoverFileSelected = (file) => {
    if (!file) return;

    setCoverFile(file);
    setUploadError("");

    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCoverDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleCoverFileSelected(file);
  };

  const handleCoverDragOver = (e) => {
    e.preventDefault();
  };

  const handleCoverFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleCoverFileSelected(file);
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
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload cover image");
      }

      return await response.json();
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  const resetForm = () => {
    setProjectDetails(initialProjectDetails);
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview("");
    setUploadError("");
    setFormError("");
    setFieldErrors({});
  };

  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("authToken");

      setFormError("");
      setFieldErrors({});

      // ✅ UX validation
      const errors = validateProjectDetails(projectDetails);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setLoading(true);

      const response = await fetch(`${BASE_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectDetails),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let data = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) setFieldErrors(data.fieldErrors);
          setFormError(
            data.message || "There was a problem creating the project."
          );
        } else {
          setFormError("There was a problem creating the project.");
        }
        return;
      }

      const newProject = await response.json();
      let finalProject = newProject;

      // ✅ If user selected a cover file, upload it now
      if (coverFile) {
        const updated = await uploadCoverImage(newProject.id, coverFile);
        if (updated) finalProject = updated;
      }

      alert("Project created successfully!");
      setProjects((prev) => [...prev, finalProject]);

      resetForm();
    } catch (error) {
      console.error("Create error:", error);
      setFormError("Unexpected error while creating project.");
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors]
  );

  return (
    <div className={styles.registerContainer}>
      <div className={styles.formContainer}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Register New Project</h3>
            <p className={styles.pageSubtitle}>
              Create a project, upload a cover image, and fill in core details.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={handleRegister}
              className={styles.saveButton}
              disabled={loading || uploadingCover}
            >
              <FiSave />
              Register
            </button>

            <button
              type="button"
              onClick={resetForm}
              className={styles.deleteButton}
              disabled={loading || uploadingCover}
              title="Reset form"
            >
              <FiX />
              Reset
            </button>
          </div>
        </div>

        {/* Errors */}
        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {hasAnyFieldErrors && (
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

        {/* Loading skeleton */}
        {loading ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {/* Card 1: Core details */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Core details</div>
                  <div className={styles.cardMeta}>Name, codes & costs</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project Name</label>
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
                </div>

                <div className={styles.formGroup}>
                  <label>Project Code</label>
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
                </div>

                <div className={styles.row2}>
                  <div className={styles.formGroup}>
                    <label>Reference No</label>
                    <input
                      className={styles.textInput}
                      name="refProjectNo"
                      placeholder="Reference No"
                      value={projectDetails.refProjectNo}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Pin Code</label>
                    <input
                      className={styles.textInput}
                      name="pinCode"
                      placeholder="Pin Code"
                      value={projectDetails.pinCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Funding Source</label>
                  <input
                    className={styles.textInput}
                    name="fundingSource"
                    placeholder="Funding Source"
                    value={projectDetails.fundingSource}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.row2}>
                  <div className={styles.formGroup}>
                    <label>FO Support Cost (%)</label>
                    <input
                      className={styles.textInput}
                      type="number"
                      step="0.01"
                      name="foSupportCostPercent"
                      placeholder="e.g. 5.00"
                      value={projectDetails.foSupportCostPercent}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>IRW Support Cost (%)</label>
                    <input
                      className={styles.textInput}
                      type="number"
                      step="0.01"
                      name="irwSupportCostPercent"
                      placeholder="e.g. 3.00"
                      value={projectDetails.irwSupportCostPercent}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Status/type/address */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Classification</div>
                  <div className={styles.cardMeta}>Status, type & address</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project Status</label>
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
                </div>

                <div className={styles.formGroup}>
                  <label>Project Type</label>
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
                </div>

                <div className={styles.formGroup}>
                  <label>Address</label>
                  <select
                    className={styles.textInput}
                    name="addressId"
                    value={projectDetails.addressId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select address</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.street || ""}, {a.city || ""} {a.country || ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.row2}>
                  <div className={styles.formGroup}>
                    <label>Period (Months)</label>
                    <input
                      className={styles.textInput}
                      type="number"
                      name="projectPeriodMonths"
                      placeholder="e.g. 12"
                      value={projectDetails.projectPeriodMonths}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Part Of Project</label>
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
                  </div>
                </div>

                {/* Dates */}
                <div className={styles.row2}>
                  <div className={styles.formGroup}>
                    <label>Project Date</label>
                    <input
                      type="datetime-local"
                      name="projectDate"
                      className={inputClass("projectDate")}
                      value={projectDetails.projectDate}
                      onChange={handleInputChange}
                    />
                    {getFieldError("projectDate") && (
                      <div className={styles.fieldError}>
                        {getFieldError("projectDate")}
                      </div>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Project Start</label>
                    <input
                      type="datetime-local"
                      name="projectStart"
                      className={inputClass("projectStart")}
                      value={projectDetails.projectStart}
                      onChange={handleInputChange}
                    />
                    {getFieldError("projectStart") && (
                      <div className={styles.fieldError}>
                        {getFieldError("projectStart")}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project End</label>
                  <input
                    type="datetime-local"
                    name="projectEnd"
                    className={inputClass("projectEnd")}
                    value={projectDetails.projectEnd}
                    onChange={handleInputChange}
                  />
                  {getFieldError("projectEnd") && (
                    <div className={styles.fieldError}>
                      {getFieldError("projectEnd")}
                    </div>
                  )}
                </div>

                <div className={styles.row2}>
                  <div className={styles.formGroup}>
                    <label>Project Start (Revised)</label>
                    <input
                      type="datetime-local"
                      name="projectStartRev"
                      className={styles.textInput}
                      value={projectDetails.projectStartRev}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Project End (Revised)</label>
                    <input
                      type="datetime-local"
                      name="projectEndRev"
                      className={styles.textInput}
                      value={projectDetails.projectEndRev}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Cover image */}
              <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Cover image</div>
                  <div className={styles.cardMeta}>Upload after creation</div>
                </div>

                <div className={styles.sectionRowStack}>
                  <div className={styles.sectionTitle}>
                    <FiUploadCloud />
                    <span>Pick an image</span>
                  </div>

                  <div
                    onDrop={handleCoverDrop}
                    onDragOver={handleCoverDragOver}
                    className={styles.dropzone}
                    onClick={() =>
                      document
                        .getElementById("registerCoverImageInput")
                        ?.click()
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.dropzoneText}>
                      {uploadingCover ? (
                        <strong>Uploading…</strong>
                      ) : coverFile ? (
                        <>
                          <strong>{coverFile.name}</strong>
                          <div className={styles.dropzoneHint}>
                            Click to replace • or drag a new one here
                          </div>
                        </>
                      ) : (
                        <>
                          <strong>Drag & drop</strong> or click to select an
                          image
                          <div className={styles.dropzoneHint}>
                            PNG, JPG, WEBP • recommended wide image
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <input
                    id="registerCoverImageInput"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleCoverFileInput}
                  />

                  {coverPreview ? (
                    <div className={styles.previewRow}>
                      <div className={styles.previewBox}>
                        <img
                          src={coverPreview}
                          alt="Selected cover preview"
                          className={styles.previewImg}
                        />
                      </div>
                      <div className={styles.mutedNote}>
                        <FiImage style={{ marginRight: 6 }} />
                        Preview only — the image is uploaded after the project
                        is created.
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noMedia}>
                      <FiImage />
                      <div>
                        <div style={{ fontWeight: 600 }}>No image selected</div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          You can still register the project without a cover.
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className={styles.inlineError}>{uploadError}</div>
                  )}
                </div>
              </div>

              {/* Card 4: Description */}
              <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Description</div>
                  <div className={styles.cardMeta}>Overview</div>
                </div>

                <div className={styles.fullWidthField}>
                  <textarea
                    className={styles.textareaInput}
                    name="projectDescription"
                    placeholder="Write a short summary of the project…"
                    value={projectDetails.projectDescription}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Bottom actions */}
            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={handleRegister}
                className={styles.saveButton}
                disabled={loading || uploadingCover}
              >
                <FiSave />
                Register project
              </button>

              <button
                type="button"
                onClick={resetForm}
                className={styles.deleteButton}
                disabled={loading || uploadingCover}
              >
                <FiX />
                Reset form
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterProject;
