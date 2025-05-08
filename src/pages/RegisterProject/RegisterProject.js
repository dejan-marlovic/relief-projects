// RegisterProject.jsx
import React, { useEffect, useState, useContext } from "react";
import styles from "./RegisterProject.module.scss";
import { ProjectContext } from "../../context/ProjectContext";

const RegisterProject = () => {
  const { setProjects } = useContext(ProjectContext);

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
  });

  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectDetails),
      });

      if (!response.ok) throw new Error("Failed to create project");

      const newProject = await response.json();
      alert("Project created successfully!");

      setProjects((prev) => [...prev, newProject]);
      setProjectDetails({});
    } catch (error) {
      console.error("Create error:", error);
      alert("Error creating project.");
    }
  };

  return (
    <div className={styles.projectContainer}>
      <div className={styles.formContainer}>
        <h3>Register New Project</h3>
        <form className={styles.formTwoColumn}>
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

            <div className={styles.fieldGroup}>
              <label>Project Date:</label>
              <input
                type="datetime-local"
                name="projectDate"
                className={styles.textInput}
                value={projectDetails.projectDate}
                onChange={handleInputChange}
              />
              <small className={styles.helperText}>
                The date the project was officially registered or approved.
              </small>
            </div>

            <div className={styles.fieldGroup}>
              <label>Project Start:</label>
              <input
                type="datetime-local"
                name="projectStart"
                className={styles.textInput}
                value={projectDetails.projectStart}
                onChange={handleInputChange}
              />
              <small className={styles.helperText}>
                The planned starting date for the project activities.
              </small>
            </div>

            <div className={styles.fieldGroup}>
              <label>Project End:</label>
              <input
                type="datetime-local"
                name="projectEnd"
                className={styles.textInput}
                value={projectDetails.projectEnd}
                onChange={handleInputChange}
              />
              <small className={styles.helperText}>
                The planned completion date for the project.
              </small>
            </div>
          </div>

          <div className={styles.formColumnRight}>
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

            <div className={styles.fieldGroup}>
              <label>Project Start (Revised):</label>
              <input
                type="datetime-local"
                name="projectStartRev"
                className={styles.textInput}
                value={projectDetails.projectStartRev}
                onChange={handleInputChange}
              />
              <small className={styles.helperText}>
                If applicable, enter the revised or actual project start date.
              </small>
            </div>

            <div className={styles.fieldGroup}>
              <label>Project End (Revised):</label>
              <input
                type="datetime-local"
                name="projectEndRev"
                className={styles.textInput}
                value={projectDetails.projectEndRev}
                onChange={handleInputChange}
              />
              <small className={styles.helperText}>
                If applicable, enter the revised or actual project end date.
              </small>
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

        <div className={styles.fullWidthField}>
          <label>Description:</label>
          <textarea
            className={styles.textareaInput}
            name="projectDescription"
            value={projectDetails.projectDescription}
            onChange={handleInputChange}
          />
        </div>

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
