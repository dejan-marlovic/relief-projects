// RegisterProject.jsx
import React, { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./RegisterProject.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

import {
  FiSave,
  FiX,
  FiUploadCloud,
  FiImage,
  FiAlertCircle,
} from "react-icons/fi";

// ✅ IMPORTANT: use shared config (works in IDE dev + Docker + AWS)
import { BASE_URL } from "../../config/api";

// Optional: initial state helper to avoid resetting to {}
const initialProjectDetails = {
  projectCode: "",
  refProjectNo: "",
  projectName: "",
  pinCode: "",
  donorOrganizationId: "",
  implementingPartnerOrganizationId: "",
  addressId: "",
  foSupportCostPercent: "",
  irwSupportCostPercent: "",
  projectDescription: "",
  projectCoverImage: "",
  projectStatusId: "",
  approved: "Yes",
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
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ✅ grab setSelectedProjectId too, so we can auto-open the created project
  const { setProjects, setSelectedProjectId } = useContext(ProjectContext);

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

  // 🔐 Helper: fetch with auth + automatic 401 handling (same behavior as Project.jsx)
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("authToken");

    const mergedOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const res = await fetch(url, mergedOptions);

    if (res.status === 401) {
      localStorage.removeItem("authToken");
      navigate("/login");
      throw new Error("Unauthorized - redirecting to login");
    }

    return res;
  };

  // ✅ Safe JSON reader: handles 204 / empty body / non-json without crashing
  const safeReadJson = async (res) => {
    if (!res) return null;
    if (res.status === 204) return null;

    const text = await res.text().catch(() => "");
    if (!text || !text.trim()) return null;

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("safeReadJson: failed to parse JSON:", e);
      return null;
    }
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load form dropdown data from the server once when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // If no token, redirect early (prevents confusing JSON errors)
        const token = localStorage.getItem("authToken");
        if (!token) {
          navigate("/login");
          return;
        }

        const [statusesRes, typesRes, addrsRes, projectsRes] =
          await Promise.all([
            authFetch(`${BASE_URL}/api/project-statuses/active`, {
              headers: { "Content-Type": "application/json" },
            }),
            authFetch(`${BASE_URL}/api/project-types/active`, {
              headers: { "Content-Type": "application/json" },
            }),
            authFetch(`${BASE_URL}/api/addresses/active`, {
              headers: { "Content-Type": "application/json" },
            }),
            authFetch(`${BASE_URL}/api/projects/ids-names`, {
              headers: { "Content-Type": "application/json" },
            }),
          ]);

        const statuses = await safeReadJson(statusesRes);
        const types = await safeReadJson(typesRes);
        const addrs = await safeReadJson(addrsRes);
        const projects = await safeReadJson(projectsRes);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({ ...prev, [name]: value }));
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

  const handleCoverDragOver = (e) => e.preventDefault();

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
      const formData = new FormData();
      formData.append("file", file);

      const response = await authFetch(
        `${BASE_URL}/api/projects/${projectId}/cover-image`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload cover image");
      }

      return await safeReadJson(response);
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

  // Convert some fields to numbers (helps backend consistency, especially after Docker/AWS)
  const toNumberOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const buildPayload = (values) => {
    // remove legacy field if it exists
    // eslint-disable-next-line no-unused-vars
    const { fundingSource, ...rest } = values;

    return {
      ...rest,
      projectStatusId: toNumberOrNull(rest.projectStatusId),
      projectTypeId: toNumberOrNull(rest.projectTypeId),
      addressId: toNumberOrNull(rest.addressId),
      partOfId: toNumberOrNull(rest.partOfId),
      projectPeriodMonths:
        rest.projectPeriodMonths === ""
          ? null
          : Number(rest.projectPeriodMonths),
      // keep decimals as strings (backend BigDecimal usually accepts strings fine)
      // keep datetime-local strings as-is (you already confirmed it works)
    };
  };

  const handleRegister = async () => {
    try {
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

      const payload = buildPayload(projectDetails);

      const response = await authFetch(`${BASE_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            data.message || "There was a problem creating the project.",
          );
        } else {
          setFormError(text || "There was a problem creating the project.");
        }
        return;
      }

      const newProject = await safeReadJson(response);
      if (!newProject?.id) {
        setFormError(
          "Project was created, but response did not include an id.",
        );
        return;
      }

      let finalProject = newProject;

      // ✅ If user selected a cover file, upload it now
      if (coverFile) {
        const updated = await uploadCoverImage(newProject.id, coverFile);
        if (updated) finalProject = updated;
      }

      // ✅ Update global list (dedupe if needed)
      setProjects((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const exists = arr.some(
          (p) => String(p.id) === String(finalProject.id),
        );
        return exists
          ? arr.map((p) =>
              String(p.id) === String(finalProject.id) ? finalProject : p,
            )
          : [...arr, finalProject];
      });

      // ✅ Select the newly created project so Project.jsx can fetch /api/projects/:id
      setSelectedProjectId(String(finalProject.id));

      alert("Project created successfully!");
      resetForm();

      // Optional: if you have a dedicated route for project details, you can navigate there
      // navigate("/projects");
    } catch (error) {
      console.error("Create error:", error);
      setFormError(
        error?.message || "Unexpected error while creating project.",
      );
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors || {}).length > 0,
    [fieldErrors],
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
