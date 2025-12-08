// src/pages/Organizations/Organizations.jsx
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import OrganizationRow from "./Organization/Organization";
import styles from "./Organizations.module.scss";

const BASE_URL = "http://localhost:8080";

const blankLink = {
  projectId: "",
  organizationId: "",
  organizationStatusId: "",
};

// Only 3 columns: Actions, Organization, Status
const headerLabels = ["Actions", "Organization", "Status"];

const BASE_COL_WIDTHS = [
  110, // Actions
  220, // Organization
  160, // Status
];

const Organizations = () => {
  const { selectedProjectId } = useContext(ProjectContext);

  const [links, setLinks] = useState([]); // project_organization rows
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // dropdown data
  const [orgOptions, setOrgOptions] = useState([]); // /organizations/active/options
  const [projectOptions, setProjectOptions] = useState([]); // /projects/ids-names
  const [statusOptions, setStatusOptions] = useState([]); // /organization-statuses/active

  // UI state
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

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
          { headers: authHeaders }
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

  const startEdit = (link) => {
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
    setFieldErrors((prev) => ({
      ...prev,
      [id]: {},
    }));

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
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.warn("Failed to parse project-organization error JSON:", e);
        }

        if (data && data.fieldErrors) {
          setFieldErrors((prev) => ({
            ...prev,
            [id]: data.fieldErrors,
          }));
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
    if (!id) return;
    if (!window.confirm("Remove this organization from the project?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/project-organizations/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete project organization");
      await fetchProjectOrganizations(selectedProjectId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete project organization.");
    }
  };

  // grid columns CSS var
  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px"
    );
    return parts.join(" ");
  }, [visibleCols]);

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <label className={styles.compactToggle}>
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
          />
          <span>Compact mode</span>
        </label>

        <div className={styles.columnsBox}>
          <button
            className={styles.columnsBtn}
            onClick={() => setColumnsOpen((v) => !v)}
          >
            Columns ▾
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
                  {i === 0 && <em className={styles.lockNote}> (locked)</em>}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🔴 Global error banner */}
      {formError && <div className={styles.errorBanner}>{formError}</div>}

      {/* Table */}
      <div
        className={`${styles.table} ${compact ? styles.compact : ""}`}
        style={{ "--org-grid-cols": gridCols }}
      >
        {/* Header */}
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          {headerLabels.map((h, i) => (
            <div
              key={h}
              className={`${styles.headerCell}
                ${i === 0 ? styles.stickyColHeader : ""}
                ${!visibleCols[i] ? styles.hiddenCol : ""}
                ${i === 0 ? styles.actionsCol : ""}`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Body */}
        {!selectedProjectId ? (
          <p className={styles.noData}>
            Select a project to see its organizations.
          </p>
        ) : links.length === 0 ? (
          <p className={styles.noData}>
            No organizations linked to this project.
          </p>
        ) : (
          links.map((link, idx) => (
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
            />
          ))
        )}

        {/* Inline create row */}
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
          />
        )}
      </div>

      {/* Add button */}
      <div className={styles.createBar}>
        <button
          className={styles.addBtn}
          onClick={startCreate}
          disabled={!selectedProjectId || editingId === "new"}
          title={
            !selectedProjectId
              ? "Select a project first"
              : editingId === "new"
              ? "Finish the current draft first"
              : "Create new organization link"
          }
        >
          + New Organization Link
        </button>
      </div>
    </div>
  );
};

export default Organizations;
