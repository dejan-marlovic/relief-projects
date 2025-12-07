// src/components/Recipients/Recipients.jsx
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import RecipientRow from "./Recipient/Recipient";
import styles from "./Recipients.module.scss";

const BASE_URL = "http://localhost:8080";

const headerLabels = ["Actions", "Organization", "Payment Order"];

const BASE_COL_WIDTHS = [
  110, // Actions
  260, // Organization
  170, // Payment Order
];

function Recipients() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // dropdown data
  const [poOptions, setPoOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);

  // UI
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  // ref for potential auto-scroll of new row
  const newRowRef = useRef(null);

  const toggleCol = (i) => {
    if (i === 0) return; // keep Actions visible
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

  // FETCH: recipients filtered by project
  const fetchRecipients = useCallback(
    async (projectId) => {
      if (!projectId) {
        setItems([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/recipients/by-project/${projectId}`,
          { headers: authHeaders }
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        setItems(await res.json());
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    },
    [authHeaders]
  );

  // FETCH: payment orders (dropdown) filtered by project
  const fetchPaymentOrders = useCallback(
    async (projectId) => {
      if (!projectId) {
        setPoOptions([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/payment-orders/project/${projectId}`,
          { headers: authHeaders }
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        const data = await res.json();
        setPoOptions(Array.isArray(data) ? data : data ? [data] : []);
      } catch (e) {
        console.error(e);
        setPoOptions([]);
      }
    },
    [authHeaders]
  );

  // FETCH: organizations (project-aware options)
  const fetchOrganizations = useCallback(
    async (projectId) => {
      if (!projectId) {
        setOrgOptions([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/organizations/by-project/${projectId}/options`,
          { headers: authHeaders }
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((o) => ({
          id:
            o.id ??
            o.organizationId ??
            (typeof o.value === "number" ? o.value : null),
          label:
            o.label ??
            o.name ??
            o.organizationName ??
            (o.id != null ? `Org #${o.id}` : ""),
        }));

        setOrgOptions(normalized.filter((x) => x.id != null));
      } catch (e) {
        console.error(e);
        setOrgOptions([]);
      }
    },
    [authHeaders]
  );

  // Load lists whenever project changes
  useEffect(() => {
    fetchRecipients(selectedProjectId);
    fetchPaymentOrders(selectedProjectId);
    fetchOrganizations(selectedProjectId);

    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
  }, [
    fetchRecipients,
    fetchPaymentOrders,
    fetchOrganizations,
    selectedProjectId,
  ]);

  // Optional: smooth scroll when new row opens
  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  // Begin edit
  const startEdit = (row) => {
    setEditingId(row?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [row.id]: {
        organizationId: row.organizationId ?? "",
        paymentOrderId: row.paymentOrderId ?? "",
      },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setFormError("");
  };

  // Begin create
  const blankRecipient = {
    organizationId: "",
    paymentOrderId: "",
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankRecipient } }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.new;
      return next;
    });
    setFormError("");
  };

  // Change handler
  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

  // Cancel edit/create
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

  // Save (create/update) with ApiError handling
  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    const payload = {
      organizationId: v.organizationId !== "" ? Number(v.organizationId) : null,
      paymentOrderId: v.paymentOrderId !== "" ? Number(v.paymentOrderId) : null,
    };

    setFormError("");
    setFieldErrors((prev) => ({
      ...prev,
      [id]: {},
    }));

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/recipients`
          : `${BASE_URL}/api/recipients/${id}`,
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
          console.warn("Failed to parse recipient error JSON:", e);
        }

        if (data && data.fieldErrors) {
          setFieldErrors((prev) => ({
            ...prev,
            [id]: data.fieldErrors,
          }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} recipient.`
        );
        return;
      }

      await fetchRecipients(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} recipient.`
      );
    }
  };

  // Delete
  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this recipient?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/recipients/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchRecipients(selectedProjectId);
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // Grid columns CSS var
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
        style={{ ["--rec-grid-cols"]: gridCols }}
      >
        {/* Header */}
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          {headerLabels.map((h, i) => (
            <div
              key={h}
              className={`${styles.headerCell}
                ${i === 0 ? styles.stickyColHeader : ""}
                ${!visibleCols[i] ? styles.hiddenCol : ""}`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Body */}
        {!selectedProjectId ? (
          <p className={styles.noData}>
            Select a project to see its recipients.
          </p>
        ) : items.length === 0 ? (
          <p className={styles.noData}>No recipients for this project.</p>
        ) : (
          items.map((r, idx) => (
            <RecipientRow
              key={r.id}
              row={r}
              isEven={idx % 2 === 0}
              isEditing={editingId === r.id}
              editedValues={editedValues[r.id]}
              onEdit={() => startEdit(r)}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={remove}
              poOptions={poOptions}
              orgOptions={orgOptions}
              visibleCols={visibleCols}
              fieldErrors={fieldErrors[r.id] || {}}
            />
          ))
        )}

        {/* Inline create row */}
        {editingId === "new" && (
          <RecipientRow
            row={{ id: "new", organizationId: "", paymentOrderId: "" }}
            isEditing
            editedValues={editedValues.new}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
            poOptions={poOptions}
            orgOptions={orgOptions}
            visibleCols={visibleCols}
            isEven={false}
            fieldErrors={fieldErrors.new || {}}
            rowRef={newRowRef}
          />
        )}
      </div>

      {/* Create */}
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
              : "Create new recipient"
          }
        >
          + New Recipient
        </button>
      </div>
    </div>
  );
}

export default Recipients;
