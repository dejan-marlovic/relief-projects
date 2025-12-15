// Project.jsx
import React, { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./Project.module.scss";
import Memos from "../Project/Memos/Memos.jsx";

import { ProjectContext } from "../../context/ProjectContext";

import {
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiSave,
  FiPlus,
  FiUploadCloud,
  FiImage,
  FiAlertCircle,
} from "react-icons/fi";

const BASE_URL = "http://localhost:8080";
const coverImagePath = `${BASE_URL}/images/projects/`;

const Project = () => {
  const navigate = useNavigate();

  // 🔐 Helper: fetch with auth + automatic 401 handling
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

  // ✅ Safe JSON reader: handles 204 / empty body without crashing
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

  const { selectedProjectId, setSelectedProjectId, projects, setProjects } =
    useContext(ProjectContext);

  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // ✅ Sector-related state
  const [sectorOptions, setSectorOptions] = useState([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState([]);
  const [currentProjectSectorLinks, setCurrentProjectSectorLinks] = useState(
    []
  );

  // ✅ Cover image upload state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ✅ Slideshow state (for multiple images)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ✅ Related organizations state
  const [allOrganizationOptions, setAllOrganizationOptions] = useState([]);
  const [projectOrgOptions, setProjectOrgOptions] = useState([]);
  const [orgStatusOptions, setOrgStatusOptions] = useState([]);
  const [projectOrganizations, setProjectOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgStatusId, setSelectedOrgStatusId] = useState("");

  // ✅ Participants (employee_project) state
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]); // for displaying labels only
  const [projectParticipants, setProjectParticipants] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [participantError, setParticipantError] = useState("");

  // ✅ form-level + field-level error state
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  // 🔍 Derive image list from comma-separated string
  const imageNames = useMemo(() => {
    return projectDetails?.projectCoverImage
      ? projectDetails.projectCoverImage
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  }, [projectDetails?.projectCoverImage]);

  // Reset slideshow index when image list changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [projectDetails?.projectCoverImage]);

  // Fetch full project details from backend when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setFormError("");
        setFieldErrors({});

        const response = await authFetch(
          `${BASE_URL}/api/projects/${selectedProjectId}`,
          { headers: { "Content-Type": "application/json" } }
        );

        if (!response.ok) throw new Error("Failed to fetch project details");
        const projectDetailsData = await response.json();
        setProjectDetails(projectDetailsData);
      } catch (error) {
        console.error("Error fetching project details:", error);
        setFormError("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // Fetch sectors list
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/sectors/active`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch sectors");
        const data = await res.json();
        setSectorOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching sectors:", e);
        setSectorOptions([]);
      }
    };
    fetchSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch existing project-sector links
  useEffect(() => {
    if (!selectedProjectId) {
      setCurrentProjectSectorLinks([]);
      setSelectedSectorIds([]);
      return;
    }
    const fetchProjectSectors = async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/project-sectors/active`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch project-sector links");
        const links = await res.json();
        const byProject = (Array.isArray(links) ? links : []).filter(
          (ps) => String(ps.projectId) === String(selectedProjectId)
        );
        setCurrentProjectSectorLinks(byProject);
        setSelectedSectorIds(byProject.map((ps) => String(ps.sectorId)));
      } catch (e) {
        console.error("Error fetching project sectors:", e);
        setCurrentProjectSectorLinks([]);
        setSelectedSectorIds([]);
      }
    };
    fetchProjectSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchProjectStatuses = async () => {
      try {
        const response = await authFetch(
          `${BASE_URL}/api/project-statuses/active`,
          { headers: { "Content-Type": "application/json" } }
        );

        if (!response.ok) throw new Error("Failed to fetch project statuses");
        const statuses = await response.json();
        setProjectStatuses(statuses);
      } catch (error) {
        console.error("Error fetching project statuses:", error);
      }
    };

    fetchProjectStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAvailableParentProjects = async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/projects/ids-names`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch project list");
        const allProjects = await response.json();

        const filteredProjects = allProjects.filter(
          (p) => p.id.toString() !== selectedProjectId
        );

        setAvailableParentProjects(filteredProjects);
      } catch (error) {
        console.error("Error fetching parent projects:", error);
      }
    };

    fetchAvailableParentProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchTypesAndAddresses = async () => {
      try {
        const [typeRes, addressRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/project-types/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/addresses/active`, {
            headers: { "Content-Type": "application/json" },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ fetch all org options (safe for 204 too)
  useEffect(() => {
    const fetchAllOrgOptions = async () => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/organizations/active/options`,
          { headers: { "Content-Type": "application/json" } }
        );

        const data = await safeReadJson(res);
        setAllOrganizationOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching all organization options:", e);
        setAllOrganizationOptions([]);
      }
    };
    fetchAllOrgOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ fetch organization statuses
  useEffect(() => {
    const fetchOrgStatuses = async () => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/organization-statuses/active`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!res.ok) throw new Error("Failed to fetch organization statuses");
        const data = await res.json();
        setOrgStatusOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching org statuses:", e);
        setOrgStatusOptions([]);
      }
    };
    fetchOrgStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ project-aware org options + project_organization rows
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectOrgOptions([]);
      setProjectOrganizations([]);
      setSelectedOrgId("");
      setSelectedOrgStatusId("");
      return;
    }

    const loadProjectOrgOptions = async (projectId) => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/organizations/by-project/${projectId}/options`,
          { headers: { "Content-Type": "application/json" } }
        );

        if (!res.ok) {
          setProjectOrgOptions(allOrganizationOptions);
          return;
        }

        const data = await safeReadJson(res);
        const arr = Array.isArray(data) ? data : [];
        setProjectOrgOptions(arr.length > 0 ? arr : allOrganizationOptions);
      } catch (e) {
        console.error("Error fetching project-aware org options:", e);
        setProjectOrgOptions(allOrganizationOptions);
      }
    };

    const loadProjectOrganizations = async (projectId) => {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/project-organizations/active`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!res.ok) throw new Error("Failed to fetch project organizations");
        const data = await res.json();
        const byProject = (Array.isArray(data) ? data : []).filter(
          (po) => String(po.projectId) === String(projectId)
        );
        setProjectOrganizations(byProject);
      } catch (e) {
        console.error("Error fetching project organizations:", e);
        setProjectOrganizations([]);
      }
    };

    loadProjectOrgOptions(selectedProjectId);
    loadProjectOrganizations(selectedProjectId);
    setSelectedOrgId("");
    setSelectedOrgStatusId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, allOrganizationOptions]);

  // ✅ Participants: load employees + positions once (positions only used for label)
  useEffect(() => {
    const loadEmployeesAndPositions = async () => {
      try {
        const [empRes, posRes] = await Promise.all([
          authFetch(`${BASE_URL}/api/employees/active`, {
            headers: { "Content-Type": "application/json" },
          }),
          authFetch(`${BASE_URL}/api/positions/active`, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        const empData = await safeReadJson(empRes);
        const posData = await safeReadJson(posRes);

        setEmployeeOptions(Array.isArray(empData) ? empData : []);
        setPositionOptions(Array.isArray(posData) ? posData : []);
      } catch (e) {
        console.error("Error fetching employees/positions:", e);
        setEmployeeOptions([]);
        setPositionOptions([]);
      }
    };

    loadEmployeesAndPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Participants: load project participants whenever project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectParticipants([]);
      setSelectedEmployeeId("");
      setParticipantError("");
      return;
    }

    const loadParticipants = async (projectId) => {
      try {
        setParticipantError("");
        const res = await authFetch(
          `${BASE_URL}/api/employee-projects/active`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        const data = await safeReadJson(res);
        const all = Array.isArray(data) ? data : [];
        const byProject = all.filter(
          (ep) => String(ep.projectId) === String(projectId)
        );
        setProjectParticipants(byProject);
      } catch (e) {
        console.error("Error loading project participants:", e);
        setProjectParticipants([]);
      }
    };

    loadParticipants(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setProjectDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Upload cover image via FormData (appends on backend)
  const uploadCoverImage = async (file) => {
    if (!file || !projectDetails?.id) return;

    setUploadError("");
    setUploadingCover(true);

    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${BASE_URL}/api/projects/${projectDetails.id}/cover-image`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/login");
        throw new Error("Unauthorized - redirecting to login");
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload cover image");
      }

      const updatedProject = await response.json();
      setProjectDetails(updatedProject);

      setProjects((prev) =>
        prev.map((p) =>
          p.id === updatedProject.id
            ? { ...p, projectName: updatedProject.projectName }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadCoverImage(file);
  };

  const handleCoverDragOver = (e) => e.preventDefault();

  const handleCoverFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadCoverImage(file);
  };

  const handleDeleteImage = async (filename) => {
    if (!projectDetails?.id) return;
    if (!window.confirm(`Delete image "${filename}" from this project?`))
      return;

    try {
      const response = await authFetch(
        `${BASE_URL}/api/projects/${
          projectDetails.id
        }/cover-image/${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to delete image");
      }

      const updatedProject = await response.json();
      setProjectDetails(updatedProject);

      setProjects((prev) =>
        prev.map((p) =>
          p.id === updatedProject.id
            ? { ...p, projectName: updatedProject.projectName }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Error deleting image.");
    }
  };

  const handleToggleSector = (sectorIdStr, checked) => {
    setSelectedSectorIds((prev) => {
      if (checked)
        return prev.includes(sectorIdStr) ? prev : [...prev, sectorIdStr];
      return prev.filter((id) => id !== sectorIdStr);
    });
  };

  const handleRemoveSectorClick = async (sectorId) => {
    const link = currentProjectSectorLinks.find(
      (l) => String(l.sectorId) === String(sectorId)
    );

    if (!link) {
      setSelectedSectorIds((prev) =>
        prev.filter((id) => String(id) !== String(sectorId))
      );
      return;
    }

    if (!window.confirm("Remove this sector from the project?")) return;

    try {
      const res = await authFetch(
        `${BASE_URL}/api/project-sectors/${link.id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to delete sector link");

      setCurrentProjectSectorLinks((prev) =>
        prev.filter((l) => l.id !== link.id)
      );
      setSelectedSectorIds((prev) =>
        prev.filter((id) => String(id) !== String(sectorId))
      );
    } catch (e) {
      console.error(e);
      alert("Failed to delete sector link.");
    }
  };

  const handleAddProjectOrganization = async () => {
    if (!projectDetails?.id) return alert("No project is selected.");
    if (!selectedOrgId || !selectedOrgStatusId)
      return alert("Please select both organization and status.");

    try {
      const res = await authFetch(`${BASE_URL}/api/project-organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectDetails.id),
          organizationId: Number(selectedOrgId),
          organizationStatusId: Number(selectedOrgStatusId),
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to add organization to project.");
      }

      const projectId = projectDetails.id;

      const reloadPO = await authFetch(
        `${BASE_URL}/api/project-organizations/active`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (reloadPO.ok) {
        const data = await reloadPO.json();
        const byProject = (Array.isArray(data) ? data : []).filter(
          (po) => String(po.projectId) === String(projectId)
        );
        setProjectOrganizations(byProject);
      }

      setSelectedOrgId("");
      setSelectedOrgStatusId("");
    } catch (e) {
      console.error(e);
      alert(e.message || "Error adding organization to project.");
    }
  };

  const handleDeleteProjectOrganization = async (projectOrgId) => {
    if (!window.confirm("Remove this organization from the project?")) return;

    try {
      const res = await authFetch(
        `${BASE_URL}/api/project-organizations/${projectOrgId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete project organization.");

      setProjectOrganizations((prev) =>
        prev.filter((po) => po.id !== projectOrgId)
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Error deleting project organization.");
    }
  };

  // ✅ Participants: helper to get employee's position id from EmployeeDTO
  const getEmployeePositionId = (employeeId) => {
    const e = (employeeOptions || []).find(
      (x) => String(x.id) === String(employeeId)
    );
    if (!e) return null;

    // supports either "positionId" OR "position: { id }"
    const pid =
      e.positionId || (e.position && e.position.id) || e.position_id || null;

    return pid ? Number(pid) : null;
  };

  // ✅ Participants: add / delete (role auto from employee)
  const handleAddParticipant = async () => {
    if (!projectDetails?.id) {
      setParticipantError("No project is selected.");
      return;
    }
    if (!selectedEmployeeId) {
      setParticipantError("Please select an employee.");
      return;
    }

    const positionId = getEmployeePositionId(selectedEmployeeId);
    if (!positionId) {
      setParticipantError(
        "Could not find this employee's positionId. Make sure EmployeeDTO includes positionId (or position.id)."
      );
      return;
    }

    try {
      setParticipantError("");

      const res = await authFetch(`${BASE_URL}/api/employee-projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectDetails.id),
          employeeId: Number(selectedEmployeeId),
          positionId: Number(positionId),
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to add participant.");
      }

      // reload participants for this project
      const reload = await authFetch(
        `${BASE_URL}/api/employee-projects/active`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await safeReadJson(reload);
      const all = Array.isArray(data) ? data : [];
      const byProject = all.filter(
        (ep) => String(ep.projectId) === String(projectDetails.id)
      );
      setProjectParticipants(byProject);

      setSelectedEmployeeId("");
    } catch (e) {
      console.error(e);
      setParticipantError(e.message || "Error adding participant.");
    }
  };

  const handleDeleteParticipant = async (participantId) => {
    if (!window.confirm("Remove this participant from the project?")) return;

    try {
      const res = await authFetch(
        `${BASE_URL}/api/employee-projects/${participantId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to remove participant.");
      }

      setProjectParticipants((prev) =>
        prev.filter((p) => p.id !== participantId)
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Error deleting participant.");
    }
  };

  const autoResize = (textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;

    try {
      const response = await authFetch(
        `${BASE_URL}/api/projects/${projectDetails.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete project");

      alert("Project deleted successfully!");

      const updatedProjects = projects.filter(
        (p) => p.id !== projectDetails.id
      );
      setProjects(updatedProjects);

      if (updatedProjects.length > 0) {
        setSelectedProjectId(updatedProjects[0].id.toString());
      } else {
        setSelectedProjectId("");
      }

      setProjectDetails(null);
      setSelectedSectorIds([]);
      setCurrentProjectSectorLinks([]);
      setProjectOrganizations([]);
      setProjectParticipants([]);
      setFormError("");
      setFieldErrors({});
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting project.");
    }
  };

  const syncProjectSectors = async (projectId) => {
    const currentBySectorId = new Map(
      currentProjectSectorLinks.map((l) => [String(l.sectorId), l])
    );

    const selectedSet = new Set(selectedSectorIds.map(String));

    const toAdd = [...selectedSet].filter(
      (sid) => !currentBySectorId.has(String(sid))
    );
    const toRemove = currentProjectSectorLinks.filter(
      (l) => !selectedSet.has(String(l.sectorId))
    );

    for (const sid of toAdd) {
      try {
        const res = await authFetch(`${BASE_URL}/api/project-sectors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: Number(projectId),
            sectorId: Number(sid),
          }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`Failed to link sector ${sid}. ${msg}`);
        }
      } catch (e) {
        console.error(e);
        alert(e.message || "Failed to add sector link.");
      }
    }

    for (const link of toRemove) {
      try {
        const res = await authFetch(
          `${BASE_URL}/api/project-sectors/${link.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to delete sector link");
      } catch (e) {
        console.error(e);
        alert("Failed to delete sector link.");
      }
    }

    try {
      const res = await authFetch(`${BASE_URL}/api/project-sectors/active`, {
        headers: { "Content-Type": "application/json" },
      });
      const links = res.ok ? await res.json() : [];
      const byProject = (Array.isArray(links) ? links : []).filter(
        (ps) => String(ps.projectId) === String(projectId)
      );
      setCurrentProjectSectorLinks(byProject);
      setSelectedSectorIds(byProject.map((ps) => String(ps.sectorId)));
    } catch (e) {
      console.error("Failed to refresh project sectors after sync:", e);
    }
  };

  const handleSave = async () => {
    try {
      setFormError("");
      setFieldErrors({});

      const response = await authFetch(
        `${BASE_URL}/api/projects/${projectDetails.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectDetails),
        }
      );

      const text = await response.text();

      if (!response.ok) {
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        if (data) {
          if (data.fieldErrors) setFieldErrors(data.fieldErrors);
          setFormError(
            data.message || "There was a problem updating the project."
          );
        } else {
          setFormError("There was a problem updating the project.");
        }
        return;
      }

      const updatedProject = text ? JSON.parse(text) : null;

      if (updatedProject) {
        setProjectDetails(updatedProject);

        setProjects((prevProjects) =>
          prevProjects.map((proj) =>
            proj.id === updatedProject.id
              ? { ...proj, projectName: updatedProject.projectName }
              : proj
          )
        );
      }

      await syncProjectSectors(projectDetails.id);

      setFormError("");
      setFieldErrors({});
      alert("Project updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      setFormError("Unexpected error while updating project.");
    }
  };

  const getSectorLabel = (id) => {
    const s = sectorOptions.find(
      (x) => String(x.id ?? x.sectorId ?? x.sector_id) === String(id)
    );
    return (
      s?.sectorDescription ||
      s?.sector_description ||
      s?.sectorCode ||
      s?.sector_code ||
      `Sector ${id}`
    );
  };

  const getOrgLabel = (id) => {
    const o = allOrganizationOptions.find(
      (opt) => String(opt.id ?? opt.organizationId) === String(id)
    );
    return (
      o?.name ||
      o?.organizationName ||
      o?.organization_name ||
      `Organization ${id}`
    );
  };

  const getOrgStatusLabel = (id) => {
    const s = orgStatusOptions.find(
      (opt) =>
        String(
          opt.id ?? opt.organizationStatusId ?? opt.organization_status_id
        ) === String(id)
    );
    return (
      s?.organizationStatusName ||
      s?.organization_status_name ||
      s?.statusName ||
      `Status ${id}`
    );
  };

  // ✅ Babel-safe label builder
  const getEmployeeLabel = (id) => {
    const e = (employeeOptions || []).find((x) => String(x.id) === String(id));
    if (!e) return `Employee ${id}`;

    const fullName = `${e.firstName || ""} ${e.lastName || ""}`.trim();

    return (
      e.employeeName ||
      e.fullName ||
      e.name ||
      (fullName ? fullName : "") ||
      e.email ||
      `Employee ${id}`
    );
  };

  const getPositionLabel = (id) => {
    const p = (positionOptions || []).find((x) => String(x.id) === String(id));
    if (!p) return `Role ${id}`;
    return p.positionName || p.name || p.title || `Role ${id}`;
  };

  // ✅ org dropdown options based on "only hide when ALL statuses are used"
  const selectableOrgOptions = useMemo(() => {
    const allOrgs = Array.isArray(allOrganizationOptions)
      ? allOrganizationOptions
      : [];

    const allStatusIds = (
      Array.isArray(orgStatusOptions) ? orgStatusOptions : []
    )
      .map((s) =>
        String(s.id ?? s.organizationStatusId ?? s.organization_status_id)
      )
      .filter(Boolean);

    if (allStatusIds.length === 0) return allOrgs;

    const allStatusSet = new Set(allStatusIds);

    const usedByOrg = new Map();
    (Array.isArray(projectOrganizations) ? projectOrganizations : []).forEach(
      (po) => {
        const orgId = String(po.organizationId);
        const statusId = String(po.organizationStatusId);
        if (!orgId || !statusId) return;

        if (!usedByOrg.has(orgId)) usedByOrg.set(orgId, new Set());
        usedByOrg.get(orgId).add(statusId);
      }
    );

    return allOrgs.filter((o) => {
      const orgId = String(o.id ?? o.organizationId);
      const usedSet = usedByOrg.get(orgId);
      if (!usedSet) return true;

      for (const sid of allStatusSet) {
        if (!usedSet.has(sid)) return true;
      }
      return false;
    });
  }, [allOrganizationOptions, orgStatusOptions, projectOrganizations]);

  // ✅ employee dropdown options — remove already-added employees
  const selectableEmployeeOptions = useMemo(() => {
    const all = Array.isArray(employeeOptions) ? employeeOptions : [];
    const used = new Set(
      (Array.isArray(projectParticipants) ? projectParticipants : []).map((p) =>
        String(p.employeeId)
      )
    );
    return all.filter((e) => !used.has(String(e.id)));
  }, [employeeOptions, projectParticipants]);

  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    margin: "6px 6px 0 0",
    borderRadius: "999px",
    border: "1px solid rgba(74,144,226,0.25)",
    fontSize: "12px",
    lineHeight: 1.6,
    background: "rgba(74,144,226,0.08)",
  };

  const pillBtnStyle = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  const hasProject = Boolean(projectDetails);

  // compute selected employee’s role label for UI hint
  const selectedEmployeeRoleLabel = useMemo(() => {
    if (!selectedEmployeeId) return "";
    const pid = getEmployeePositionId(selectedEmployeeId);
    return pid ? getPositionLabel(pid) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId, positionOptions]);

  return (
    <div className={styles.projectContainer}>
      {!hasProject && (
        <div className={styles.emptyState}>
          <FiImage />
          <div>
            <h3 style={{ margin: 0 }}>No project selected</h3>
            <p style={{ margin: 0, color: "#666" }}>
              Select a project from the dropdown to view details.
            </p>
          </div>
        </div>
      )}

      {projectDetails && (
        <div className={styles.formContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderText}>
              <h3 className={styles.pageTitle}>Project Details</h3>
              <p className={styles.pageSubtitle}>
                Update project info, sectors, images, organizations, and
                participants.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={handleSave}
                className={styles.saveButton}
                disabled={loading}
              >
                <FiSave />
                Save
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={loading}
              >
                <FiTrash2 />
                Delete
              </button>
            </div>
          </div>

          {formError && (
            <div className={styles.errorBanner}>
              <FiAlertCircle />
              <span>{formError}</span>
            </div>
          )}

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

          <div className={styles.imageAndFormWrapper}>
            {/* Left: media card */}
            <aside className={styles.mediaColumn}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Cover & Notes</div>
                  <div className={styles.cardMeta}>
                    {imageNames.length > 0
                      ? `${imageNames.length} image(s)`
                      : "No images"}
                  </div>
                </div>

                {imageNames.length > 0 ? (
                  <>
                    <div className={styles.imageShell}>
                      <img
                        src={`${coverImagePath}${imageNames[currentImageIndex]}`}
                        alt="Project Cover"
                        className={styles.coverImage}
                      />

                      {imageNames.length > 1 && (
                        <div className={styles.galleryControls}>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === 0 ? imageNames.length - 1 : prev - 1
                              )
                            }
                            aria-label="Previous image"
                            className={styles.iconCircleBtn}
                          >
                            <FiChevronLeft />
                          </button>

                          <span className={styles.galleryCount}>
                            {currentImageIndex + 1} / {imageNames.length}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === imageNames.length - 1 ? 0 : prev + 1
                              )
                            }
                            aria-label="Next image"
                            className={styles.iconCircleBtn}
                          >
                            <FiChevronRight />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={styles.imageList}>
                      <div className={styles.imageListTitle}>
                        <strong>Images</strong>
                      </div>
                      <ul className={styles.cleanList}>
                        {imageNames.map((name) => (
                          <li key={name} className={styles.imageRow}>
                            <span className={styles.filename}>{name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(name)}
                              className={styles.dangerIconBtn}
                              aria-label={`Delete image ${name}`}
                              title={`Delete image ${name}`}
                            >
                              <FiTrash2 />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className={styles.noMedia}>
                    <FiImage />
                    <div>
                      <div style={{ fontWeight: 600 }}>No cover image yet</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Upload one below to show a slideshow here.
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.divider} />

                <div className={styles.memosWrap}>
                  <Memos />
                </div>
              </div>
            </aside>

            {/* Right: form */}
            <section className={styles.formContent}>
              {loading ? (
                <div className={styles.skeletonWrap}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              ) : (
                <form>
                  {/* Description */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>Description</div>
                      <div className={styles.cardMeta}>Overview</div>
                    </div>

                    <div className={styles.fullWidthField}>
                      <label>Project Description:</label>
                      <textarea
                        name="projectDescription"
                        value={projectDetails.projectDescription || ""}
                        onChange={(e) => {
                          handleProjectInputChange(e);
                          autoResize(e.target);
                        }}
                        ref={(el) => el && autoResize(el)}
                        className={styles.textareaInput}
                        placeholder="Write a short summary of the project..."
                      />
                    </div>
                  </div>

                  <div className={styles.grid}>
                    {/* Left column card */}
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>Core details</div>
                        <div className={styles.cardMeta}>
                          Name, codes & costs
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Name:</label>
                        <input
                          type="text"
                          name="projectName"
                          value={projectDetails.projectName || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectName")}
                        />
                        {getFieldError("projectName") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectName")}
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Code:</label>
                        <input
                          type="text"
                          name="projectCode"
                          value={projectDetails.projectCode || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectCode")}
                        />
                        {getFieldError("projectCode") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectCode")}
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label>Reference No:</label>
                        <input
                          type="text"
                          name="refProjectNo"
                          value={projectDetails.refProjectNo || ""}
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Pin Code:</label>
                        <input
                          type="text"
                          name="pinCode"
                          value={projectDetails.pinCode || ""}
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>FO Support Cost (%):</label>
                          <input
                            type="number"
                            step="0.01"
                            name="foSupportCostPercent"
                            value={projectDetails.foSupportCostPercent || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>IRW Support Cost (%):</label>
                          <input
                            type="number"
                            step="0.01"
                            name="irwSupportCostPercent"
                            value={projectDetails.irwSupportCostPercent || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Approved:</label>
                        <select
                          name="approved"
                          value={projectDetails.approved || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("approved")}
                        >
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        {getFieldError("approved") && (
                          <div className={styles.fieldError}>
                            {getFieldError("approved")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column card */}
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>Schedule & type</div>
                        <div className={styles.cardMeta}>
                          Status, dates, address
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project Status:</label>
                        <select
                          name="projectStatusId"
                          value={projectDetails.projectStatusId || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectStatusId")}
                        >
                          <option value="">Select status</option>
                          {projectStatuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.statusName}
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
                        <label>Project Type:</label>
                        <select
                          name="projectTypeId"
                          value={projectDetails.projectTypeId || ""}
                          onChange={handleProjectInputChange}
                          className={inputClass("projectTypeId")}
                        >
                          <option value="">Select type</option>
                          {projectTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.projectTypeName}
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
                        <label>Address:</label>
                        <select
                          name="addressId"
                          value={projectDetails.addressId || ""}
                          onChange={handleProjectInputChange}
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

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>Project Period (Months):</label>
                          <input
                            type="number"
                            name="projectPeriodMonths"
                            value={projectDetails.projectPeriodMonths || ""}
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Part Of Project:</label>
                          <select
                            name="partOfId"
                            value={projectDetails.partOfId || ""}
                            onChange={handleProjectInputChange}
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

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>Project Date:</label>
                          <input
                            type="datetime-local"
                            name="projectDate"
                            value={
                              projectDetails.projectDate
                                ? projectDetails.projectDate.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={inputClass("projectDate")}
                          />
                          {getFieldError("projectDate") && (
                            <div className={styles.fieldError}>
                              {getFieldError("projectDate")}
                            </div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label>Project Start:</label>
                          <input
                            type="datetime-local"
                            name="projectStart"
                            value={
                              projectDetails.projectStart
                                ? projectDetails.projectStart.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={inputClass("projectStart")}
                          />
                          {getFieldError("projectStart") && (
                            <div className={styles.fieldError}>
                              {getFieldError("projectStart")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.row2}>
                        <div className={styles.formGroup}>
                          <label>Project End:</label>
                          <input
                            type="datetime-local"
                            name="projectEnd"
                            value={
                              projectDetails.projectEnd
                                ? projectDetails.projectEnd.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={inputClass("projectEnd")}
                          />
                          {getFieldError("projectEnd") && (
                            <div className={styles.fieldError}>
                              {getFieldError("projectEnd")}
                            </div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label>Project Start (Revised):</label>
                          <input
                            type="datetime-local"
                            name="projectStartRev"
                            value={
                              projectDetails.projectStartRev
                                ? projectDetails.projectStartRev.slice(0, 16)
                                : ""
                            }
                            onChange={handleProjectInputChange}
                            className={styles.textInput}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Project End (Revised):</label>
                        <input
                          type="datetime-local"
                          name="projectEndRev"
                          value={
                            projectDetails.projectEndRev
                              ? projectDetails.projectEndRev.slice(0, 16)
                              : ""
                          }
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Links card (includes participants UI) */}
                    <div
                      className={styles.card}
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>Links & media</div>
                        <div className={styles.cardMeta}>
                          Sectors, organizations, participants, upload
                        </div>
                      </div>

                      {/* Upload */}
                      <div className={styles.sectionRowStack}>
                        <div className={styles.sectionTitle}>
                          <FiUploadCloud />
                          <span>Cover image upload</span>
                        </div>

                        <div
                          onDrop={handleCoverDrop}
                          onDragOver={handleCoverDragOver}
                          className={styles.dropzone}
                          onClick={() =>
                            document
                              .getElementById("coverImageFileInput")
                              ?.click()
                          }
                          role="button"
                          tabIndex={0}
                        >
                          <div className={styles.dropzoneText}>
                            {uploadingCover ? (
                              <strong>Uploading…</strong>
                            ) : (
                              <>
                                <strong>Drag & drop</strong> or click to select
                                an image
                              </>
                            )}
                            <div className={styles.dropzoneHint}>
                              PNG, JPG, WEBP • recommended wide image
                            </div>
                          </div>
                        </div>

                        <input
                          id="coverImageFileInput"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleCoverFileInput}
                        />

                        {uploadError && (
                          <div className={styles.inlineError}>
                            {uploadError}
                          </div>
                        )}
                      </div>

                      <div className={styles.split}>
                        {/* Sectors */}
                        <div>
                          <div className={styles.sectionTitle}>
                            <span style={{ fontWeight: 700 }}>Sectors</span>
                            <span className={styles.sectionHint}>
                              Click checkbox to add; click pill “x” to remove
                              immediately
                            </span>
                          </div>

                          <div className={styles.scrollBox}>
                            {sectorOptions.length === 0 ? (
                              <div className={styles.mutedText}>
                                No sectors available
                              </div>
                            ) : (
                              sectorOptions.map((s) => {
                                const idStr = String(
                                  s.id ?? s.sectorId ?? s.sector_id
                                );
                                const label =
                                  s.sectorDescription ||
                                  s.sector_description ||
                                  s.sectorCode ||
                                  s.sector_code ||
                                  `Sector ${idStr}`;
                                const checked =
                                  selectedSectorIds.includes(idStr);

                                return (
                                  <label
                                    key={idStr}
                                    className={styles.checkboxRow}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        handleToggleSector(
                                          idStr,
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>

                          <div style={{ marginTop: 8 }}>
                            {selectedSectorIds.length > 0 ? (
                              selectedSectorIds.map((sid) => (
                                <span key={sid} style={pillStyle}>
                                  {getSectorLabel(sid)}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSectorClick(sid)}
                                    aria-label={`Remove sector ${getSectorLabel(
                                      sid
                                    )}`}
                                    title="Remove sector"
                                    style={pillBtnStyle}
                                  >
                                    <FiX />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className={styles.mutedText}>
                                No sectors assigned
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Organizations */}
                        <div>
                          <div className={styles.sectionTitle}>
                            <span style={{ fontWeight: 700 }}>
                              Related Organizations
                            </span>
                            <span className={styles.sectionHint}>
                              Add an organization with a status
                            </span>
                          </div>

                          <div className={styles.scrollBox}>
                            {projectOrganizations.length === 0 ? (
                              <span className={styles.mutedText}>
                                No related organizations
                              </span>
                            ) : (
                              <ul className={styles.cleanList}>
                                {projectOrganizations.map((po) => (
                                  <li key={po.id} className={styles.orgRow}>
                                    <div className={styles.orgText}>
                                      <div className={styles.orgName}>
                                        {getOrgLabel(po.organizationId)}
                                      </div>
                                      <div className={styles.orgStatus}>
                                        {getOrgStatusLabel(
                                          po.organizationStatusId
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteProjectOrganization(po.id)
                                      }
                                      className={styles.dangerIconBtn}
                                      aria-label="Remove organization from project"
                                      title="Remove organization"
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className={styles.addRow}>
                            <select
                              value={selectedOrgId}
                              onChange={(e) => setSelectedOrgId(e.target.value)}
                              className={styles.textInput}
                            >
                              <option value="">Select organization</option>
                              {selectableOrgOptions.map((o) => (
                                <option
                                  key={o.id ?? o.organizationId}
                                  value={o.id ?? o.organizationId}
                                >
                                  {o.name ||
                                    o.organizationName ||
                                    o.organization_name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={selectedOrgStatusId}
                              onChange={(e) =>
                                setSelectedOrgStatusId(e.target.value)
                              }
                              className={styles.textInput}
                            >
                              <option value="">Select status</option>
                              {orgStatusOptions.map((s) => (
                                <option
                                  key={
                                    s.id ??
                                    s.organizationStatusId ??
                                    s.organization_status_id
                                  }
                                  value={
                                    s.id ??
                                    s.organizationStatusId ??
                                    s.organization_status_id
                                  }
                                >
                                  {s.organizationStatusName ||
                                    s.organization_status_name ||
                                    s.statusName}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={handleAddProjectOrganization}
                              className={styles.primaryInlineBtn}
                            >
                              <FiPlus />
                              Add
                            </button>
                          </div>

                          <div className={styles.mutedNote}>
                            An organization stays available until it has been
                            linked with every possible status for this project.
                          </div>
                        </div>
                      </div>

                      {/* Participants */}
                      <div style={{ marginTop: "1rem" }}>
                        <div className={styles.sectionTitle}>
                          <span style={{ fontWeight: 700 }}>
                            Project Participants
                          </span>
                          <span className={styles.sectionHint}>
                            Select employee; role is fetched from employee
                            record
                          </span>
                        </div>

                        <div className={styles.scrollBox}>
                          {projectParticipants.length === 0 ? (
                            <span className={styles.mutedText}>
                              No participants added
                            </span>
                          ) : (
                            <ul className={styles.cleanList}>
                              {projectParticipants.map((p) => (
                                <li key={p.id} className={styles.orgRow}>
                                  <div className={styles.orgText}>
                                    <div className={styles.orgName}>
                                      {getEmployeeLabel(p.employeeId)}
                                    </div>
                                    <div className={styles.orgStatus}>
                                      {getPositionLabel(p.positionId)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteParticipant(p.id)
                                    }
                                    className={styles.dangerIconBtn}
                                    aria-label="Remove participant from project"
                                    title="Remove participant"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div
                          className={styles.addRow}
                          style={{ marginTop: 10 }}
                        >
                          <select
                            value={selectedEmployeeId}
                            onChange={(e) =>
                              setSelectedEmployeeId(e.target.value)
                            }
                            className={styles.textInput}
                          >
                            <option value="">Select employee</option>
                            {selectableEmployeeOptions.map((e) => {
                              const fullName = `${e.firstName || ""} ${
                                e.lastName || ""
                              }`.trim();
                              const label =
                                e.employeeName ||
                                e.fullName ||
                                e.name ||
                                (fullName ? fullName : "") ||
                                e.email ||
                                `Employee ${e.id}`;

                              return (
                                <option key={e.id} value={e.id}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>

                          <div
                            className={styles.textInput}
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {selectedEmployeeId
                              ? selectedEmployeeRoleLabel || "Role not found"
                              : "Role: (select employee)"}
                          </div>

                          <button
                            type="button"
                            onClick={handleAddParticipant}
                            className={styles.primaryInlineBtn}
                          >
                            <FiPlus />
                            Add
                          </button>
                        </div>

                        {participantError && (
                          <div
                            className={styles.inlineError}
                            style={{ marginTop: 8 }}
                          >
                            {participantError}
                          </div>
                        )}

                        <div className={styles.mutedNote}>
                          Employees already added to this project are hidden
                          from the dropdown.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom actions */}
                  <div className={styles.bottomActions}>
                    <button
                      type="button"
                      onClick={handleSave}
                      className={styles.saveButton}
                      disabled={loading}
                    >
                      <FiSave />
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={styles.deleteButton}
                      disabled={loading}
                    >
                      <FiTrash2 />
                      Delete project
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default Project;
