import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiRefreshCw, FiAlertCircle, FiEdit3 } from "react-icons/fi";

import styles from "../UpdateUser/UpdateUser.module.scss";
import { BASE_URL } from "../../../config/api";
import {
  createAuthFetch,
  safeReadJson,
  extractFieldErrors,
} from "../../../utils/http";

const initialForm = {
  selectedId: "",
  projectCode: "",
  refProjectNo: "",
  projectName: "",
  pinCode: "",
  fundingSource: "",
  addressId: "",
  foSupportCostPercent: "",
  irwSupportCostPercent: "",
  projectDescription: "",
  projectCoverImage: "",
  projectCoverImageCaption: "",
  projectStatusId: "",
  approved: "",
  projectPeriodMonths: "",
  projectDate: "",
  projectStart: "",
  projectEnd: "",
  projectStartRev: "",
  projectEndRev: "",
  partOfId: "",
  projectTypeId: "",
};

const toInputDateTime = (value) => {
  if (!value) return "";
  try {
    return String(value).slice(0, 16);
  } catch {
    return "";
  }
};

const buildAddressLabel = (address) => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
};

const validate = (values) => {
  const errors = {};

  if (!values.selectedId) errors.selectedId = "Please select a project.";

  if (!values.projectCode?.trim())
    errors.projectCode = "Project code is required.";
  if (!values.projectName?.trim())
    errors.projectName = "Project name is required.";
  if (!values.projectStatusId)
    errors.projectStatusId = "Project status is required.";
  if (!values.approved) errors.approved = "Approval status is required.";
  if (!values.projectDate) errors.projectDate = "Project date is required.";
  if (!values.projectStart)
    errors.projectStart = "Project start date is required.";
  if (!values.projectEnd) errors.projectEnd = "Project end date is required.";
  if (!values.projectTypeId) errors.projectTypeId = "Project type is required.";

  return errors;
};

const UpdateProject = () => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);

  const [projects, setProjects] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedProject = useMemo(() => {
    const id = Number(form.selectedId);
    if (!id) return null;
    return projects.find((item) => item.id === id) || null;
  }, [form.selectedId, projects]);

  const inputClass = (name) =>
    `${styles.textInput} ${fieldErrors?.[name] ? styles.inputError : ""}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");
      setSuccessMessage("");

      const [projectRes, addressRes, statusRes, typeRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/projects/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/addresses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/project-statuses/active`, {
          headers: { "Content-Type": "application/json" },
        }),
        authFetch(`${BASE_URL}/api/project-types/active`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      const projectData = await safeReadJson(projectRes);
      const addressData = await safeReadJson(addressRes);
      const statusData = await safeReadJson(statusRes);
      const typeData = await safeReadJson(typeRes);

      setProjects(Array.isArray(projectData) ? projectData : []);
      setAddresses(Array.isArray(addressData) ? addressData : []);
      setProjectStatuses(Array.isArray(statusData) ? statusData : []);
      setProjectTypes(Array.isArray(typeData) ? typeData : []);
    } catch (err) {
      console.error("Load projects error:", err);
      setProjects([]);
      setAddresses([]);
      setProjectStatuses([]);
      setProjectTypes([]);
      setFormError(
        err?.message || "Unexpected error while loading project data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    if (!selectedId) {
      setForm(initialForm);
      return;
    }

    const selected = projects.find((item) => item.id === Number(selectedId));

    setForm({
      selectedId,
      projectCode: selected?.projectCode || "",
      refProjectNo: selected?.refProjectNo || "",
      projectName: selected?.projectName || "",
      pinCode: selected?.pinCode || "",
      fundingSource: selected?.fundingSource || "",
      addressId: selected?.addressId ? String(selected.addressId) : "",
      foSupportCostPercent:
        selected?.foSupportCostPercent !== undefined &&
        selected?.foSupportCostPercent !== null
          ? String(selected.foSupportCostPercent)
          : "",
      irwSupportCostPercent:
        selected?.irwSupportCostPercent !== undefined &&
        selected?.irwSupportCostPercent !== null
          ? String(selected.irwSupportCostPercent)
          : "",
      projectDescription: selected?.projectDescription || "",
      projectCoverImage: selected?.projectCoverImage || "",
      projectCoverImageCaption: selected?.projectCoverImageCaption || "",
      projectStatusId: selected?.projectStatusId
        ? String(selected.projectStatusId)
        : "",
      approved: selected?.approved || "",
      projectPeriodMonths:
        selected?.projectPeriodMonths !== undefined &&
        selected?.projectPeriodMonths !== null
          ? String(selected.projectPeriodMonths)
          : "",
      projectDate: toInputDateTime(selected?.projectDate),
      projectStart: toInputDateTime(selected?.projectStart),
      projectEnd: toInputDateTime(selected?.projectEnd),
      projectStartRev: toInputDateTime(selected?.projectStartRev),
      projectEndRev: toInputDateTime(selected?.projectEndRev),
      partOfId: selected?.partOfId ? String(selected.partOfId) : "",
      projectTypeId: selected?.projectTypeId
        ? String(selected.projectTypeId)
        : "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    if (!selectedProject) {
      setForm(initialForm);
      return;
    }

    setForm({
      selectedId: String(selectedProject.id),
      projectCode: selectedProject.projectCode || "",
      refProjectNo: selectedProject.refProjectNo || "",
      projectName: selectedProject.projectName || "",
      pinCode: selectedProject.pinCode || "",
      fundingSource: selectedProject.fundingSource || "",
      addressId: selectedProject.addressId
        ? String(selectedProject.addressId)
        : "",
      foSupportCostPercent:
        selectedProject.foSupportCostPercent !== undefined &&
        selectedProject.foSupportCostPercent !== null
          ? String(selectedProject.foSupportCostPercent)
          : "",
      irwSupportCostPercent:
        selectedProject.irwSupportCostPercent !== undefined &&
        selectedProject.irwSupportCostPercent !== null
          ? String(selectedProject.irwSupportCostPercent)
          : "",
      projectDescription: selectedProject.projectDescription || "",
      projectCoverImage: selectedProject.projectCoverImage || "",
      projectCoverImageCaption: selectedProject.projectCoverImageCaption || "",
      projectStatusId: selectedProject.projectStatusId
        ? String(selectedProject.projectStatusId)
        : "",
      approved: selectedProject.approved || "",
      projectPeriodMonths:
        selectedProject.projectPeriodMonths !== undefined &&
        selectedProject.projectPeriodMonths !== null
          ? String(selectedProject.projectPeriodMonths)
          : "",
      projectDate: toInputDateTime(selectedProject.projectDate),
      projectStart: toInputDateTime(selectedProject.projectStart),
      projectEnd: toInputDateTime(selectedProject.projectEnd),
      projectStartRev: toInputDateTime(selectedProject.projectStartRev),
      projectEndRev: toInputDateTime(selectedProject.projectEndRev),
      partOfId: selectedProject.partOfId
        ? String(selectedProject.partOfId)
        : "",
      projectTypeId: selectedProject.projectTypeId
        ? String(selectedProject.projectTypeId)
        : "",
    });

    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    try {
      setFormError("");
      setSuccessMessage("");
      setFieldErrors({});

      const errors = validate(form);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setFormError("Please fix the highlighted fields.");
        return;
      }

      setSaving(true);

      const payload = {
        projectCode: form.projectCode.trim(),
        refProjectNo: form.refProjectNo.trim() || null,
        projectName: form.projectName.trim(),
        pinCode: form.pinCode.trim() || null,
        fundingSource: form.fundingSource.trim() || null,
        addressId: form.addressId ? Number(form.addressId) : null,
        foSupportCostPercent: form.foSupportCostPercent
          ? Number(form.foSupportCostPercent)
          : null,
        irwSupportCostPercent: form.irwSupportCostPercent
          ? Number(form.irwSupportCostPercent)
          : null,
        projectDescription: form.projectDescription.trim() || null,
        projectCoverImage: form.projectCoverImage.trim() || null,
        projectCoverImageCaption: form.projectCoverImageCaption.trim() || null,
        projectStatusId: Number(form.projectStatusId),
        approved: form.approved,
        projectPeriodMonths: form.projectPeriodMonths
          ? Number(form.projectPeriodMonths)
          : null,
        projectDate: form.projectDate,
        projectStart: form.projectStart,
        projectEnd: form.projectEnd,
        projectStartRev: form.projectStartRev || null,
        projectEndRev: form.projectEndRev || null,
        partOfId: form.partOfId ? Number(form.partOfId) : null,
        projectTypeId: Number(form.projectTypeId),
      };

      const res = await authFetch(
        `${BASE_URL}/api/projects/${Number(form.selectedId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await safeReadJson(res);

      if (!res.ok) {
        const fe = extractFieldErrors(data);
        if (fe) setFieldErrors(fe);

        setFormError(
          data?.message ||
            data?.detail ||
            "There was a problem updating the project.",
        );
        return;
      }

      setProjects((prev) =>
        prev.map((item) =>
          item.id === Number(form.selectedId)
            ? {
                ...item,
                ...payload,
                id: item.id,
              }
            : item,
        ),
      );

      setSuccessMessage(
        `Project "${data?.projectName || payload.projectName}" updated successfully.`,
      );
    } catch (err) {
      console.error("Update project error:", err);
      setFormError(err?.message || "Unexpected error while updating project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.updateContainer}>
      <div className={styles.formContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Update Project</h3>
            <p className={styles.pageSubtitle}>
              Select an active project and update its details.
            </p>
          </div>
        </div>

        {formError && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            <FiEdit3 />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Choose project</div>
                  <div className={styles.cardMeta}>Active projects only</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project</label>
                  <select
                    className={inputClass("selectedId")}
                    value={form.selectedId}
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    <option value="">Select project</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.projectName} ({item.projectCode}) - id: {item.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit details</div>
                  <div className={styles.cardMeta}>Main project fields</div>
                </div>

                <div className={styles.formGroup}>
                  <label>Project code</label>
                  <input
                    className={inputClass("projectCode")}
                    name="projectCode"
                    value={form.projectCode}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Reference project no</label>
                  <input
                    className={inputClass("refProjectNo")}
                    name="refProjectNo"
                    value={form.refProjectNo}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project name</label>
                  <input
                    className={inputClass("projectName")}
                    name="projectName"
                    value={form.projectName}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Pin code</label>
                  <input
                    className={inputClass("pinCode")}
                    name="pinCode"
                    value={form.pinCode}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Funding source</label>
                  <input
                    className={inputClass("fundingSource")}
                    name="fundingSource"
                    value={form.fundingSource}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Address</label>
                  <select
                    className={inputClass("addressId")}
                    name="addressId"
                    value={form.addressId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select address</option>
                    {addresses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {buildAddressLabel(item) || `Address #${item.id}`} (id:{" "}
                        {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>FO support cost percent</label>
                  <input
                    className={inputClass("foSupportCostPercent")}
                    type="number"
                    step="0.01"
                    name="foSupportCostPercent"
                    value={form.foSupportCostPercent}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>IRW support cost percent</label>
                  <input
                    className={inputClass("irwSupportCostPercent")}
                    type="number"
                    step="0.01"
                    name="irwSupportCostPercent"
                    value={form.irwSupportCostPercent}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project description</label>
                  <input
                    className={inputClass("projectDescription")}
                    name="projectDescription"
                    value={form.projectDescription}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project cover image</label>
                  <input
                    className={inputClass("projectCoverImage")}
                    name="projectCoverImage"
                    value={form.projectCoverImage}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project cover image caption</label>
                  <input
                    className={inputClass("projectCoverImageCaption")}
                    name="projectCoverImageCaption"
                    value={form.projectCoverImageCaption}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project status</label>
                  <select
                    className={inputClass("projectStatusId")}
                    name="projectStatusId"
                    value={form.projectStatusId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select project status</option>
                    {projectStatuses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.statusName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Approved</label>
                  <select
                    className={inputClass("approved")}
                    name="approved"
                    value={form.approved}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select approval status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Project period months</label>
                  <input
                    className={inputClass("projectPeriodMonths")}
                    type="number"
                    name="projectPeriodMonths"
                    value={form.projectPeriodMonths}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project date</label>
                  <input
                    className={inputClass("projectDate")}
                    type="datetime-local"
                    name="projectDate"
                    value={form.projectDate}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project start</label>
                  <input
                    className={inputClass("projectStart")}
                    type="datetime-local"
                    name="projectStart"
                    value={form.projectStart}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project end</label>
                  <input
                    className={inputClass("projectEnd")}
                    type="datetime-local"
                    name="projectEnd"
                    value={form.projectEnd}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project start revised</label>
                  <input
                    className={inputClass("projectStartRev")}
                    type="datetime-local"
                    name="projectStartRev"
                    value={form.projectStartRev}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Project end revised</label>
                  <input
                    className={inputClass("projectEndRev")}
                    type="datetime-local"
                    name="projectEndRev"
                    value={form.projectEndRev}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Part of project</label>
                  <select
                    className={inputClass("partOfId")}
                    name="partOfId"
                    value={form.partOfId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">None</option>
                    {projects
                      .filter((item) => item.id !== Number(form.selectedId))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.projectName} ({item.projectCode}) - id:{" "}
                          {item.id}
                        </option>
                      ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Project type</label>
                  <select
                    className={inputClass("projectTypeId")}
                    name="projectTypeId"
                    value={form.projectTypeId}
                    onChange={handleInputChange}
                    disabled={!form.selectedId || saving}
                  >
                    <option value="">Select project type</option>
                    {projectTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.projectTypeName} (id: {item.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.bottomActions}>
              <button
                type="button"
                onClick={loadData}
                className={styles.secondaryButton}
                disabled={loading || saving}
              >
                <FiRefreshCw /> Refresh list
              </button>

              <button
                type="button"
                onClick={resetForm}
                className={styles.secondaryButton}
                disabled={saving}
              >
                <FiRefreshCw /> Reset form
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className={styles.saveButton}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Update project"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateProject;
