import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import OrganizationRow from "./Organization/Organization";
import styles from "./Organizations.module.scss";
import { FiColumns, FiPlus } from "react-icons/fi";
import SortableHeader from "../../components/SortableHeader/SortableHeader";
import { sortRows } from "../../utils/tableSorting";
import { matchesSelect, matchesText } from "../../utils/tableSorting";
import ColumnFilter from "../../components/ColumnFilter/ColumnFilter";
import ClearFiltersButton from "../../components/ClearFiltersButton/ClearFiltersButton";
import { getSelectedProjectName } from "../../utils/projectDisplay";

import { BASE_URL } from "../../config/api"; // adjust path if needed

const blankLink = {
  projectId: "",
  organizationId: "",
  organizationStatusId: "",
};

// Only 3 columns: Actions, Organization, Status
const headerLabels = ["Actions", "Organization", "Status"];
const HEADER_SORT_KEYS = [null, "organization", "status"];

// ✅ Actions wider: edit/delete/address/bank
const BASE_COL_WIDTHS = [
  230, // Actions
  240, // Organization
  180, // Status
];

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

  const [links, setLinks] = useState([]); // project_organization rows
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // dropdown data
  const [orgOptions, setOrgOptions] = useState([]); // /organizations/active/options
  const [projectOptions, setProjectOptions] = useState([]); // /projects/ids-names
  const [statusOptions, setStatusOptions] = useState([]); // /organization-statuses/active

  // UI state
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );
  const [sortConfig, setSortConfig] = useState(null);
  const emptyFilters = () => ({organization:"",status:""});
  const [filters, setFilters] = useState(emptyFilters);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters());

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  const toggleCol = (i) => {
    if (i === 0) return; // lock Actions
    setVisibleCols((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

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
    setColumnsOpen(false);
  }, [fetchProjectOrganizations, selectedProjectId]);

  const startEdit = (link) => {
    if (!canManageOrganizationLinks) return;
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
    if (!canManageOrganizationLinks) return;
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
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

  const save = async () => {
    if (!canManageOrganizationLinks) return;
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;

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
    }
  };

  const cancel = () => {
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
        setFormError(data?.message || "Failed to delete project organization.");
        return;
      }

      await fetchProjectOrganizations(selectedProjectId);
    } catch (err) {
      console.error(err);
      setFormError("Failed to delete project organization.");
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px"
    );
    return parts.join(" ");
  }, [visibleCols]);

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
  const toggleSort = (key) => setSortConfig((current) => ({ key, direction: current?.key === key && current.direction === "asc" ? "desc" : "asc" }));

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
            <div className={styles.columnsBox}>
              <button
                className={styles.columnsBtn}
                onClick={() => setColumnsOpen((v) => !v)}
                title="Choose visible columns"
                type="button"
              >
                <FiColumns />
                Columns
              </button>

              {columnsOpen && (
                <div className={styles.columnsPanel}>
                  {headerLabels.map((h, i) => (
                    <label key={h} className={styles.colItem}>
                      <input
                        type="checkbox"
                        checked={visibleCols[i]}
                        disabled={i === 0}
                        onChange={() => toggleCol(i)}
                      />
                      <span>{h}</span>
                      {i === 0 && (
                        <em className={styles.lockNote}> (locked)</em>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {canManageOrganizationLinks && <button
              className={styles.primaryBtn}
              onClick={startCreate}
              disabled={!selectedProjectId || editingId === "new"}
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
              New
            </button>}
          </div>
        </div>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <div className={styles.table} style={{ ["--org-grid-cols"]: gridCols }}>
          <div className={`${styles.gridRow} ${styles.headerRow}`}>
            {headerLabels.map((h, i) => (
              <div
                key={h}
                className={`${styles.headerCell}
                  ${i === 0 ? styles.stickyColHeader : ""}
                  ${!visibleCols[i] ? styles.hiddenCol : ""}`}
              >
                {i === 0 ? h : <div className={styles.sortAndFilterHeader}><SortableHeader label={h} sortKey={HEADER_SORT_KEYS[i]} sortConfig={sortConfig} onSort={toggleSort} /><ColumnFilter label={h} type={HEADER_SORT_KEYS[i] === "status" ? "select" : "text"} value={filters[HEADER_SORT_KEYS[i]]} options={HEADER_SORT_KEYS[i] === "status" ? statusOptions.map((s)=>({value:s.id,label:s.organizationStatusName})) : []} onApply={(v)=>setFilters((c)=>({...c,[HEADER_SORT_KEYS[i]]:v}))} onClear={()=>setFilters((c)=>({...c,[HEADER_SORT_KEYS[i]]:emptyFilters()[HEADER_SORT_KEYS[i]]}))} /></div>}
              </div>
            ))}
          </div>

          {!selectedProjectId ? (
            <p className={styles.noData}>
              Select a project to see its organizations.
            </p>
          ) : links.length === 0 ? (
            <p className={styles.noData}>
              No organizations linked to this project.
            </p>
          ) : (
            displayedLinks.map((link, idx) => (
              <OrganizationRow
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
                visibleCols={visibleCols}
                isEven={idx % 2 === 0}
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
              visibleCols={visibleCols}
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
