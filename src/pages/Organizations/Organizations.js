import useRecordAutosave from "../../utils/useRecordAutosave";
import AutosaveStatus from "../../components/ProjectClassification/AutosaveStatus";
import { appFetch as fetch } from "../../utils/appFetch";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import OrganizationRow from "./Organization/Organization";
import styles from "./Organizations.module.scss";
import { FiPlus } from "react-icons/fi";
import { sortRows } from "../../utils/tableSorting";
import { matchesSelect, matchesText } from "../../utils/tableSorting";
import ClearFiltersButton from "../../components/ClearFiltersButton/ClearFiltersButton";
import { getSelectedProjectName } from "../../utils/projectDisplay";

import { BASE_URL } from "../../config/api";
import ErrorBanner from "../../components/ErrorBanner/ErrorBanner"; // adjust path if needed
import { formatApiError } from "../../utils/apiErrors";

const blankLink = {
  projectId: "",
  organizationId: "",
  organizationStatusId: "",
};

async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const Organizations = () => {
  const { selectedProjectId, projects } = useContext(ProjectContext);
  const { hasAnyRole } = useAuth();
  const canManageOrganizationLinks = hasAnyRole("ADMIN", "PROJECT_MANAGER");
  const canManageAddresses = canManageOrganizationLinks;
  const canViewBankDetails = hasAnyRole("ADMIN", "FINANCE", "APPROVER");
  const canManageBankDetails = hasAnyRole("ADMIN", "FINANCE");


  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [links, setLinks] = useState([]); // project_organization rows
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});


  // dropdown data
  const [orgOptions, setOrgOptions] = useState([]); // /organizations/active/options
  const [projectOptions, setProjectOptions] = useState([]); // /projects/ids-names
  const [statusOptions, setStatusOptions] = useState([]); // /organization-statuses/active

  // UI state
  const [sortConfig, setSortConfig] = useState(null);
  const emptyFilters = () => ({organization:"",status:""});
  const [filters, setFilters] = useState(emptyFilters);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters());

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token]
  );

  const autosave = useRecordAutosave({
    recordKey: `organisation-link-${selectedProjectId}-${editingId}`,
    enabled: canManageOrganizationLinks && editingId !== null && editingId !== "new",
    read: async () => {
      const response = await fetch(`${BASE_URL}/api/project-organizations/active`, { headers: authHeaders, cache: "no-store" });
      if (!response.ok) throw new Error("Could not read the latest organisation relationship.");
      const rows = await response.json();
      const row = rows.find(item => String(item.id) === String(editingId) && String(item.projectId) === String(selectedProjectId));
      if (!row) throw new Error("This relationship is no longer available. Reload before editing.");
      return row;
    },
    write: async (fresh, changes) => {
      const value = { ...fresh, ...changes };
      const response = await fetch(`${BASE_URL}/api/project-organizations/${editingId}`, {
        method: "PUT", headers: authHeaders, silentSuccess: true,
        body: JSON.stringify({ projectId: value.projectId, organizationId: value.organizationId, organizationStatusId: value.organizationStatusId }),
      });
      if (!response.ok) {
        const body = await safeParseJsonResponse(response);
        throw new Error(formatApiError(body, "Could not save the organisation relationship."));
      }
    },
    validate: value => !value.organizationId || !value.organizationStatusId ? "Select an organisation and role before saving." : "",
    onSaved: (saved, changes, pending) => {
      setLinks(rows => rows.map(row => row.id === saved.id ? saved : row));
      setEditedValues({ [editingId]: { ...saved, ...pending } });
    },
  });
  useUnsavedChange("project-organizations-editor", editingId === "new" || autosave.dirty);

  const fetchProjectOrganizations = useCallback(
    async (projectId) => {
      if (!projectId) {
        setLinks([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/project-organizations/active`,
          {
            headers: authHeaders,
          }
        );
        if (!res.ok)
          throw new Error(
            `Failed to fetch project organizations (${res.status})`
          );

        const data = await res.json();
        const list = Array.isArray(data) ? data : data ? [data] : [];
        const byProject = list.filter(
          (po) => String(po.projectId) === String(projectId)
        );

        setLinks(byProject);
      } catch (err) {
        console.error("Error fetching project organizations:", err);
        setLinks([]);
      }
    },
    [authHeaders]
  );

  // dropdowns
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [orgRes, projRes, statusRes] = await Promise.all([
          fetch(`${BASE_URL}/api/organizations/active/options`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/projects/ids-names`, {
            headers: authHeaders,
          }),
          fetch(`${BASE_URL}/api/organization-statuses/active`, {
            headers: authHeaders,
          }),
        ]);

        if (cancelled) return;

        setOrgOptions(orgRes.ok ? await orgRes.json() : []);
        setProjectOptions(projRes.ok ? await projRes.json() : []);
        setStatusOptions(statusRes.ok ? await statusRes.json() : []);
      } catch (e) {
        if (!cancelled) {
          console.error("Error fetching dropdown options:", e);
          setOrgOptions([]);
          setProjectOptions([]);
          setStatusOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    fetchProjectOrganizations(selectedProjectId);
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");

  }, [fetchProjectOrganizations, selectedProjectId]);

  const currentProjectRef = useRef(selectedProjectId);
  currentProjectRef.current = selectedProjectId;
  const startEdit = async (link) => {
    if (!canManageOrganizationLinks || saving || saveInProgress.current || (editingId !== null)) return;
    // Enrollment permanently fixes the relationship triple, including deleted assessments.
    saveInProgress.current = true; setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/api/project-organizations/${link.id}/assessment`, { headers: authHeaders, cache: "no-store" });
      if (!response.ok) throw new Error("Could not check assessment ownership. Refresh and try again.");
      const assessment = await response.json();
      if (String(currentProjectRef.current) !== String(link.projectId)) return;
      if (assessment.assessment) { setFormError("This relationship has assessment history. Its project, organization and role cannot be changed. Create another relationship for a different role or project."); return; }
    } catch (error) { setFormError(error.message); return; }
    finally { saveInProgress.current = false; setSaving(false); }
    setEditingId(link?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [link.id]: {
        projectId: link.projectId,
        organizationId: link.organizationId,
        organizationStatusId: link.organizationStatusId,
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[link.id];
      return next;
    });
    setFormError("");
  };

  const startCreate = () => {
    if (!canManageOrganizationLinks || saving || (editingId !== null)) return;
    setEditingId("new");
    setEditedValues((prev) => ({
      ...prev,
      new: {
        ...blankLink,
        projectId: selectedProjectId || "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      return next;
    });
    setFormError("");
  };

  const onChange = (field, value) => {
    if (editingId !== "new") autosave.edit({ [field]: value }, links.find(row => row.id === editingId), true);
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

  const save = async () => {
    if (!canManageOrganizationLinks || saveInProgress.current) return;
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

    saveInProgress.current = true;
    setSaving(true);
    const isCreate = id === "new";
    const effectiveProjectId = isCreate
      ? values.projectId || selectedProjectId
      : values.projectId ?? null;

    const payload = {
      projectId: effectiveProjectId ? Number(effectiveProjectId) : null,
      organizationId: values.organizationId
        ? Number(values.organizationId)
        : null,
      organizationStatusId: values.organizationStatusId
        ? Number(values.organizationStatusId)
        : null,
    };

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/project-organizations`
          : `${BASE_URL}/api/project-organizations/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} organization link.`
        );
        return;
      }

      await fetchProjectOrganizations(selectedProjectId);
      cancel();
    } catch (err) {
      console.error(err);
      setFormError(
        err.message ||
          `Failed to ${isCreate ? "create" : "update"} organization link.`
      );
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const cancel = () => {
    if (autosave.busy) return;
    if (autosave.dirty && !window.confirm("Discard unsaved changes? Previously saved changes will remain.")) return;
    const id = editingId;
    setEditingId(null);

    setEditedValues((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      if (id && next[id]) delete next[id];
      return next;
    });

    setFormError("");
  };

  const remove = async (id) => {
    if (!canManageOrganizationLinks) return;
    if (!id) return;
    if (!window.confirm("Remove this organization from the project?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/project-organizations/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        setFormError(
          formatApiError(data, "Failed to delete project organization."),
        );
        return;
      }

      await fetchProjectOrganizations(selectedProjectId);
    } catch (err) {
      console.error(err);
      setFormError("Failed to delete project organization.");
    }
  };

  const organizationNames = useMemo(() => new Map(orgOptions.map((o) => [String(o.id), o.name])), [orgOptions]);
  const statusNames = useMemo(() => new Map(statusOptions.map((s) => [String(s.id), s.organizationStatusName])), [statusOptions]);
  useEffect(() => setFilters(emptyFilters()), [selectedProjectId]);
  const filteredLinks = useMemo(() => links.filter((link) =>
    matchesText(organizationNames.get(String(link.organizationId)), filters.organization) &&
    matchesSelect(link.organizationStatusId, filters.status)
  ), [filters, links, organizationNames]);
  const displayedLinks = useMemo(() => {
    if (!sortConfig) return filteredLinks;
    const getters = {
      organization: (link) => link?.organizationId == null ? null : organizationNames.get(String(link.organizationId)) || `Organization ${link.organizationId}`,
      status: (link) => link?.organizationStatusId == null ? null : statusNames.get(String(link.organizationStatusId)) || `Status ${link.organizationStatusId}`,
    };
    return sortRows(filteredLinks, getters[sortConfig.key], sortConfig.direction);
  }, [filteredLinks, organizationNames, sortConfig, statusNames]);


  const totalCount = links.length;

  const subtitle = selectedProjectId
    ? `${getSelectedProjectName(projects, selectedProjectId)} • ${totalCount} link${
        totalCount === 1 ? "" : "s"
      }`
    : "Select a project to see linked organizations.";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Organizations</h2>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            {hasActiveFilters && <ClearFiltersButton onClick={() => setFilters(emptyFilters())} />}
            {canManageOrganizationLinks && <button
              className={styles.primaryBtn}
              onClick={startCreate}
              disabled={!selectedProjectId || saving || editingId !== null}
              title={
                !selectedProjectId
                  ? "Select a project first"
                  : editingId === "new"
                  ? "Finish the current draft first"
                  : "Create new organization link"
              }
              type="button"
            >
              <FiPlus />
              Add organisation
            </button>}
          </div>
        </div>

        <p>Existing organisation and role selections save automatically. Addresses and bank details save after a short typing pause or when you leave a field. Adding and removing records remain separate actions.</p>
        <AutosaveStatus save={autosave} />
        {formError && <ErrorBanner message={formError} onDismiss={() => setFormError("")} />}

        <fieldset className={styles.cardFilters} disabled={editingId !== null || saving}>
          <label>Find organisation<input value={filters.organization} onChange={e => setFilters(v => ({ ...v, organization: e.target.value }))} /></label>
          <label>Filter by role<select value={filters.status} onChange={e => setFilters(v => ({ ...v, status: e.target.value }))}><option value="">All roles</option>{statusOptions.map(s => <option key={s.id} value={s.id}>{s.organizationStatusName}</option>)}</select></label>
          <label>Sort by<select value={sortConfig?.key || ""} onChange={e => setSortConfig(e.target.value ? { key: e.target.value, direction: "asc" } : null)}><option value="">Original order</option><option value="organization">Organisation name</option><option value="status">Role</option></select></label>
        </fieldset>
        <div className={styles.cardList}>
          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see its organizations.
            </p>
          ) : links.length === 0 ? (
            <p className={styles.noData}>
              No organizations linked to this project.
            </p>
          ) : displayedLinks.length === 0 ? (
            <p className={styles.noData}>No organizations match your filters.</p>
          ) : (
            displayedLinks.map((link) => (
              <OrganizationRow
                saving={saving || autosave.busy}
                editingLocked={editingId !== null}
                key={link.id}
                link={link}
                isEditing={editingId === link.id}
                editedValues={editedValues[link.id]}
                onEdit={() => startEdit(link)}
                onChange={onChange}
                onSave={save}
                onCancel={cancel}
                onDelete={remove}
                organizations={orgOptions}
                projects={projectOptions}
                statuses={statusOptions}
                fieldErrors={fieldErrors[link.id] || {}}
                canManage={canManageOrganizationLinks}
                canManageAddresses={canManageAddresses}
                canViewBankDetails={canViewBankDetails}
                canManageBankDetails={canManageBankDetails}
              />
            ))
          )}

          {editingId === "new" && (
            <OrganizationRow
                saving={saving || autosave.busy}
                editingLocked={editingId !== null}
              link={{
                id: "new",
                ...blankLink,
                projectId: selectedProjectId || "",
              }}
              isEditing
              editedValues={editedValues.new}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={() => {}}
              organizations={orgOptions}
              projects={projectOptions}
              statuses={statusOptions}
              isEven={false}
              fieldErrors={fieldErrors.new || {}}
              canManage={canManageOrganizationLinks}
              canManageAddresses={canManageAddresses}
              canViewBankDetails={canViewBankDetails}
              canManageBankDetails={canManageBankDetails}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Organizations;
