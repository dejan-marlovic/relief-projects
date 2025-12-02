// Import necessary React hooks and modules
import React, { useEffect, useState, useContext } from "react";

// Import scoped CSS module for styling
import styles from "./Project.module.scss";
import Memos from "../Project/Memos/Memos.jsx";

// Import ProjectContext to access the currently selected project ID
import { ProjectContext } from "../../context/ProjectContext";

// ✅ Icons (same library as Memos)
import {
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiSave,
  FiPlus, // ✅ NEW
} from "react-icons/fi";

// ✅ Base URL (backend)
const BASE_URL = "http://localhost:8080";
const coverImagePath = `${BASE_URL}/images/projects/`;

// Define the Project component
const Project = () => {
  // Extract selected project ID from global context
  const { selectedProjectId, setSelectedProjectId, projects, setProjects } =
    useContext(ProjectContext);

  // Local state for full project details
  const [projectDetails, setProjectDetails] = useState(null);

  // State to track whether the data is being loaded
  const [loading, setLoading] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [availableParentProjects, setAvailableParentProjects] = useState([]);

  // ✅ Sector-related state
  const [sectorOptions, setSectorOptions] = useState([]); // [{id, sectorCode, sectorDescription}]
  const [selectedSectorIds, setSelectedSectorIds] = useState([]); // string[]
  const [currentProjectSectorLinks, setCurrentProjectSectorLinks] = useState(
    []
  ); // [{id, projectId, sectorId}]

  // ✅ Cover image upload state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ✅ Slideshow state (for multiple images)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ✅ NEW: Related organizations state
  const [allOrganizationOptions, setAllOrganizationOptions] = useState([]); // all active orgs: /api/organizations/active/options
  const [projectOrgOptions, setProjectOrgOptions] = useState([]); // project-aware options: /by-project/{projectId}/options
  const [orgStatusOptions, setOrgStatusOptions] = useState([]); // /api/organization-statuses/active
  const [projectOrganizations, setProjectOrganizations] = useState([]); // project_organization rows for this project
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgStatusId, setSelectedOrgStatusId] = useState("");

  // ✅ NEW: form-level + field-level error state (like RegisterProject)
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { fieldName: "Message" }

  const getFieldError = (fieldName) => fieldErrors?.[fieldName];
  const hasError = (fieldName) => Boolean(fieldErrors?.[fieldName]);

  const inputClass = (fieldName) =>
    `${styles.textInput} ${hasError(fieldName) ? styles.inputError : ""}`;

  // 🔍 Derive image list from comma-separated string
  const imageNames = projectDetails?.projectCoverImage
    ? projectDetails.projectCoverImage
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

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
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${BASE_URL}/api/projects/${selectedProjectId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
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
  }, [selectedProjectId]);

  // Fetch sectors list (for checkbox options)
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${BASE_URL}/api/sectors/active`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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
  }, []);

  // Fetch existing project-sector links and derive selected IDs
  useEffect(() => {
    if (!selectedProjectId) {
      setCurrentProjectSectorLinks([]);
      setSelectedSectorIds([]);
      return;
    }
    const fetchProjectSectors = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${BASE_URL}/api/project-sectors/active`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchProjectStatuses = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${BASE_URL}/api/project-statuses/active`,
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
        const response = await fetch(`${BASE_URL}/api/projects/ids-names`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

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
          fetch(`${BASE_URL}/api/project-types/active`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${BASE_URL}/api/addresses/active`, {
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

  // ✅ NEW: fetch all org options (for displaying labels)
  useEffect(() => {
    const fetchAllOrgOptions = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${BASE_URL}/api/organizations/active/options`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch organization options");
        const data = await res.json();
        setAllOrganizationOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching all organization options:", e);
        setAllOrganizationOptions([]);
      }
    };
    fetchAllOrgOptions();
  }, []);

  // ✅ NEW: fetch organization statuses
  useEffect(() => {
    const fetchOrgStatuses = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${BASE_URL}/api/organization-statuses/active`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
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
  }, []);

  // ✅ NEW: project-aware org options + project_organization rows
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectOrgOptions([]);
      setProjectOrganizations([]);
      setSelectedOrgId("");
      setSelectedOrgStatusId("");
      return;
    }

    const token = localStorage.getItem("authToken");

    const loadProjectOrgOptions = async (projectId) => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/organizations/by-project/${projectId}/options`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          // Fallback: if this endpoint isn't available/returns 404, use all active options
          console.warn(
            "Falling back to all active organization options for dropdown."
          );
          setProjectOrgOptions(allOrganizationOptions);
          return;
        }

        const data = await res.json();
        setProjectOrgOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching project-aware org options:", e);
        setProjectOrgOptions([]);
      }
    };

    const loadProjectOrganizations = async (projectId) => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/project-organizations/active`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
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
  }, [selectedProjectId, allOrganizationOptions]);

  // Handle input field changes by updating local projectDetails state
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

      setProjectDetails(updatedProject);

      // Optionally keep the list in sync (at least the name)
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
    if (file) {
      uploadCoverImage(file);
    }
  };

  const handleCoverDragOver = (e) => {
    e.preventDefault();
  };

  const handleCoverFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadCoverImage(file);
    }
  };

  // ✅ Delete a single image (calls backend delete)
  const handleDeleteImage = async (filename) => {
    if (!projectDetails?.id) return;
    if (!window.confirm(`Delete image "${filename}" from this project?`))
      return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${BASE_URL}/api/projects/${
          projectDetails.id
        }/cover-image/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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

  // ✅ Toggle a single sector on/off without affecting others
  const handleToggleSector = (sectorIdStr, checked) => {
    setSelectedSectorIds((prev) => {
      if (checked) {
        return prev.includes(sectorIdStr) ? prev : [...prev, sectorIdStr];
      }
      return prev.filter((id) => id !== sectorIdStr);
    });
  };

  // ✅ Immediate removal by clicking a pill (DELETE right away)
  const handleRemoveSectorClick = async (sectorId) => {
    const link = currentProjectSectorLinks.find(
      (l) => String(l.sectorId) === String(sectorId)
    );

    // If there's no backend link yet (e.g., user toggled in UI but not saved),
    // just update UI selection.
    if (!link) {
      setSelectedSectorIds((prev) =>
        prev.filter((id) => String(id) !== String(sectorId))
      );
      return;
    }

    if (!window.confirm("Remove this sector from the project?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${BASE_URL}/api/project-sectors/${link.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete sector link");

      // Optimistic local updates
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

  // ✅ NEW: add related organization to project_organization
  const handleAddProjectOrganization = async () => {
    if (!projectDetails?.id) {
      alert("No project is selected.");
      return;
    }
    if (!selectedOrgId || !selectedOrgStatusId) {
      alert("Please select both organization and status.");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${BASE_URL}/api/project-organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

      // Refresh current project organizations and project-aware dropdown
      const projectId = projectDetails.id;
      const token2 = localStorage.getItem("authToken");

      // reload project organizations
      const reloadPO = await fetch(
        `${BASE_URL}/api/project-organizations/active`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token2}`,
          },
        }
      );
      if (reloadPO.ok) {
        const data = await reloadPO.json();
        const byProject = (Array.isArray(data) ? data : []).filter(
          (po) => String(po.projectId) === String(projectId)
        );
        setProjectOrganizations(byProject);
      }

      // reload project-aware org options
      const reloadOpts = await fetch(
        `${BASE_URL}/api/organizations/by-project/${projectId}/options`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token2}`,
          },
        }
      );
      if (reloadOpts.ok) {
        const data = await reloadOpts.json();
        setProjectOrgOptions(Array.isArray(data) ? data : []);
      }

      setSelectedOrgId("");
      setSelectedOrgStatusId("");
    } catch (e) {
      console.error(e);
      alert(e.message || "Error adding organization to project.");
    }
  };

  // ✅ NEW: delete related organization from project_organization
  const handleDeleteProjectOrganization = async (projectOrgId) => {
    if (!window.confirm("Remove this organization from the project?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${BASE_URL}/api/project-organizations/${projectOrgId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete project organization.");

      // Optimistic update
      setProjectOrganizations((prev) =>
        prev.filter((po) => po.id !== projectOrgId)
      );

      // Also reload project-aware org options so it becomes selectable again
      if (projectDetails?.id) {
        const token2 = localStorage.getItem("authToken");
        const reload = await fetch(
          `${BASE_URL}/api/organizations/by-project/${projectDetails.id}/options`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token2}`,
            },
          }
        );
        if (reload.ok) {
          const data = await reload.json();
          setProjectOrgOptions(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Error deleting project organization.");
    }
  };

  // Automatically resize textarea to fit content
  const autoResize = (textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${BASE_URL}/api/projects/${projectDetails.id}`,
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

      // Clear UI state
      setProjectDetails(null);
      setSelectedSectorIds([]);
      setCurrentProjectSectorLinks([]);
      setProjectOrganizations([]);
      setFormError("");
      setFieldErrors({});
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting project.");
    }
  };

  // ✅ Reconcile selected sectors with backend links on Save (add/remove diffs)
  const syncProjectSectors = async (projectId) => {
    const token = localStorage.getItem("authToken");

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

    // Create missing links
    for (const sid of toAdd) {
      try {
        const res = await fetch(`${BASE_URL}/api/project-sectors`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

    // Soft delete removed links
    for (const link of toRemove) {
      try {
        const res = await fetch(`${BASE_URL}/api/project-sectors/${link.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to delete sector link");
      } catch (e) {
        console.error(e);
        alert("Failed to delete sector link.");
      }
    }

    // Refresh links
    try {
      const res = await fetch(`${BASE_URL}/api/project-sectors/active`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      const token = localStorage.getItem("authToken");

      // Clear previous errors
      setFormError("");
      setFieldErrors({});

      const response = await fetch(
        `${BASE_URL}/api/projects/${projectDetails.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(projectDetails),
        }
      );

      const text = await response.text();

      if (!response.ok) {
        // Try to parse ApiError JSON from backend
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.warn("Failed to parse backend error JSON:", parseErr);
        }

        console.log("🔴 Update error payload:", data);

        if (data) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          }
          setFormError(
            data.message || "There was a problem updating the project."
          );
        } else {
          setFormError("There was a problem updating the project.");
        }

        return;
      }

      // Success: parse updated project DTO
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

      // 2) Sync sector checkbox selection with backend links
      await syncProjectSectors(projectDetails.id);

      setFormError("");
      setFieldErrors({});
      alert("Project updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      setFormError("Unexpected error while updating project.");
    }
  };

  // Helper: get sector display text by id
  const getSectorLabel = (id) => {
    const s = sectorOptions.find(
      (x) => String(x.id ?? x.sectorId ?? x.sector_id) === String(id)
    );
    return (
      s?.sectorDescription ??
      s?.sector_description ??
      s?.sectorCode ??
      s?.sector_code ??
      `Sector ${id}`
    );
  };

  // ✅ NEW: org + org status label helpers
  const getOrgLabel = (id) => {
    const o = allOrganizationOptions.find(
      (opt) => String(opt.id ?? opt.organizationId) === String(id)
    );
    return (
      o?.name ??
      o?.organizationName ??
      o?.organization_name ??
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
      s?.organizationStatusName ??
      s?.organization_status_name ??
      s?.statusName ??
      `Status ${id}`
    );
  };

  // Simple pill styles (inline to avoid SCSS changes)
  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    margin: "4px 6px 0 0",
    borderRadius: "999px",
    border: "1px solid #ddd",
    fontSize: "12px",
    lineHeight: 1.6,
    background: "#f7f7f7",
  };
  const pillBtnStyle = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className={styles.projectContainer}>
      {/* Render form only if project details are available */}
      {projectDetails && (
        <div className={styles.formContainer}>
          <h3>Project Details</h3>

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

          {/* Wrapper for image and form side-by-side */}
          <div className={styles.imageAndFormWrapper}>
            {/* Show slideshow if images available */}
            {imageNames.length > 0 && (
              <div className={styles.imageContainer}>
                <img
                  src={`${coverImagePath}${imageNames[currentImageIndex]}`}
                  alt="Project Cover"
                  className={styles.coverImage}
                />

                {imageNames.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === 0 ? imageNames.length - 1 : prev - 1
                        )
                      }
                      aria-label="Previous image"
                      style={{
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        border: "1px solid #ccc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        backgroundColor: "#fff",
                      }}
                    >
                      <FiChevronLeft />
                    </button>
                    <span>
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
                      style={{
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        border: "1px solid #ccc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        backgroundColor: "#fff",
                      }}
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                )}

                {/* Memos live directly under the picture */}
                <Memos />
              </div>
            )}

            {/* Main form content */}
            <div className={styles.formContent}>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <form>
                  {/* Project Description */}
                  <div
                    className={`${styles.fullWidthField} ${styles.textInput}`}
                  >
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
                    />
                  </div>
                  <div className={styles.formTwoColumn}>
                    {/* Left Column */}
                    <div className={styles.formColumnLeft}>
                      {/* Project Name */}
                      <div>
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

                      {/* Project Code */}
                      <div>
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

                      {/* Reference Number */}
                      <div>
                        <label>Reference No:</label>
                        <input
                          type="text"
                          name="refProjectNo"
                          value={projectDetails.refProjectNo || ""}
                          onChange={handleProjectInputChange}
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
                          onChange={handleProjectInputChange}
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
                          onChange={handleProjectInputChange}
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
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Project Cover Image Upload */}
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
                            document
                              .getElementById("coverImageFileInput")
                              ?.click()
                          }
                        >
                          {uploadingCover
                            ? "Uploading..."
                            : "Drag & drop an image here, or click to select"}
                        </div>

                        <input
                          id="coverImageFileInput"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleCoverFileInput}
                        />

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

                        {/* List of all images with delete buttons */}
                        {imageNames.length > 0 && (
                          <div style={{ marginTop: "8px" }}>
                            <strong>Images for this project:</strong>
                            <ul
                              style={{
                                listStyle: "none",
                                paddingLeft: 0,
                                marginTop: "4px",
                              }}
                            >
                              {imageNames.map((name) => (
                                <li
                                  key={name}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.9rem",
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImage(name)}
                                    style={{
                                      border: "none",
                                      backgroundColor: "#e74c3c",
                                      color: "#fff",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "0.9rem",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      lineHeight: 1,
                                    }}
                                    aria-label={`Delete image ${name}`}
                                    title={`Delete image ${name}`}
                                  >
                                    <FiTrash2 />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Approved */}
                      <div>
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

                      {/* ✅ Sectors checkbox list (before buttons) */}
                      <div>
                        <label>Sectors:</label>

                        {/* Checkbox list (click to add without unselecting others) */}
                        <div
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: 8,
                            maxHeight: 180,
                            overflow: "auto",
                          }}
                        >
                          {sectorOptions.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#666" }}>
                              No sectors available
                            </div>
                          ) : (
                            sectorOptions.map((s) => {
                              const idStr = String(
                                s.id ?? s.sectorId ?? s.sector_id
                              );
                              const label =
                                s.sectorDescription ??
                                s.sector_description ??
                                s.sectorCode ??
                                s.sector_code ??
                                `Sector ${idStr}`;
                              const checked = selectedSectorIds.includes(idStr);
                              return (
                                <label
                                  key={idStr}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "4px 0",
                                    cursor: "pointer",
                                    userSelect: "none",
                                  }}
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

                        {/* Assigned sector pills with remove buttons */}
                        <div style={{ marginTop: 6 }}>
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
                            <span style={{ fontSize: 12, color: "#666" }}>
                              No sectors assigned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ✅ NEW: Related organizations */}
                      <div style={{ marginTop: "1rem" }}>
                        <label>Related Organizations:</label>

                        {/* Existing relations */}
                        <div
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: 8,
                            marginBottom: 8,
                            maxHeight: 180,
                            overflow: "auto",
                          }}
                        >
                          {projectOrganizations.length === 0 ? (
                            <span style={{ fontSize: 12, color: "#666" }}>
                              No related organizations
                            </span>
                          ) : (
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                              }}
                            >
                              {projectOrganizations.map((po) => (
                                <li
                                  key={po.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    padding: "4px 0",
                                  }}
                                >
                                  <span style={{ fontSize: 13 }}>
                                    {getOrgLabel(po.organizationId)}{" "}
                                    <span style={{ color: "#888" }}>
                                      (
                                      {getOrgStatusLabel(
                                        po.organizationStatusId
                                      )}
                                      )
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteProjectOrganization(po.id)
                                    }
                                    style={{
                                      border: "none",
                                      backgroundColor: "#e74c3c",
                                      color: "#fff",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "0.9rem",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      lineHeight: 1,
                                    }}
                                    aria-label="Remove organization from project"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Add new relation */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <select
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                            className={styles.textInput}
                            style={{ flex: 1, marginBottom: 0 }}
                          >
                            <option value="">Select organization</option>
                            {projectOrgOptions.map((o) => (
                              <option
                                key={o.id ?? o.organizationId}
                                value={o.id ?? o.organizationId}
                              >
                                {o.name ??
                                  o.organizationName ??
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
                            style={{ flex: 1, marginBottom: 0 }}
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
                                {s.organizationStatusName ??
                                  s.organization_status_name ??
                                  s.statusName}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleAddProjectOrganization}
                            style={{
                              padding: "0.55rem 1rem",
                              borderRadius: 8,
                              border: "none",
                              cursor: "pointer",
                              backgroundColor: "#4a90e2",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontWeight: 600,
                              marginBottom: 0,
                            }}
                          >
                            <FiPlus />
                            Add
                          </button>
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            marginTop: 4,
                          }}
                        >
                          Only organizations not already linked to this project
                          are shown in the dropdown.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSave}
                        className={styles.saveButton}
                      >
                        <FiSave style={{ marginRight: 6 }} />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className={styles.deleteButton}
                      >
                        <FiTrash2 style={{ marginRight: 6 }} />
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

                      {/* Project Type ID */}
                      <div>
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

                      {/* Address ID */}
                      <div>
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

                      {/* Project Period (Months) */}
                      <div>
                        <label>Project Period (Months):</label>
                        <input
                          type="number"
                          name="projectPeriodMonths"
                          value={projectDetails.projectPeriodMonths || ""}
                          onChange={handleProjectInputChange}
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
                          onChange={handleProjectInputChange}
                          className={inputClass("projectDate")}
                        />
                        {getFieldError("projectDate") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectDate")}
                          </div>
                        )}
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
                          onChange={handleProjectInputChange}
                          className={inputClass("projectStart")}
                        />
                        {getFieldError("projectStart") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectStart")}
                          </div>
                        )}
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
                          onChange={handleProjectInputChange}
                          className={inputClass("projectEnd")}
                        />
                        {getFieldError("projectEnd") && (
                          <div className={styles.fieldError}>
                            {getFieldError("projectEnd")}
                          </div>
                        )}
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
                          onChange={handleProjectInputChange}
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
                          onChange={handleProjectInputChange}
                          className={styles.textInput}
                        />
                      </div>

                      {/* Part Of Project ID */}
                      <div>
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
