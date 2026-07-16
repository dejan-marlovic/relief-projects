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
import { FiColumns, FiPlus, FiTrash2 } from "react-icons/fi";

import { BASE_URL } from "../../config/api"; // adjust path if needed

const headerLabels = ["Actions", "Organization", "Payment Order", "Amount"];

// ✅ add width for Amount column
const BASE_COL_WIDTHS = [
  130, // Actions
  260, // Organization
  170, // Payment Order
  140, // Amount
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

function Recipients() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // Lazy initializer function.
  // React calls this once when the component first mounts
  // and uses the returned Set as the initial state.
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(
    () => new Set(),
  );

  // dropdown data
  const [poOptions, setPoOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true),
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

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
    [token],
  );

  // FETCH: recipients filtered by project
  const fetchRecipients = useCallback(
    async (projectId) => {
      if (!projectId) {
        setItems([]);
        setSelectedRecipientIds(new Set());
        return;
      }

      try {
        const res = await fetch(
          `${BASE_URL}/api/recipients/by-project/${projectId}`,
          { headers: authHeaders },
        );

        if (!res.ok) throw new Error(`Failed ${res.status}`);

        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        setItems(arr);

        // Remove selected IDs that no longer exist after reload.
        setSelectedRecipientIds((prev) => {
          const activeIds = new Set(arr.map((r) => r.id));
          return new Set([...prev].filter((id) => activeIds.has(id)));
        });
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    },
    [authHeaders],
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
          { headers: authHeaders },
        );

        if (!res.ok) throw new Error(`Failed ${res.status}`);

        const data = await res.json();
        setPoOptions(Array.isArray(data) ? data : data ? [data] : []);
      } catch (e) {
        console.error(e);
        setPoOptions([]);
      }
    },
    [authHeaders],
  );

  // FETCH: organizations (ALL active options - not project-filtered)
  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/organizations/active/options`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error(`Failed ${res.status}`);

      const data = await res.json();

      // Robust normalization: supports {id,label}, {organizationId,name},
      // {value:"123", label:"Org"}, etc.
      const normalized = (Array.isArray(data) ? data : []).map((o) => {
        const rawId =
          o?.id ??
          o?.organizationId ??
          o?.organization_id ??
          o?.orgId ??
          o?.value;

        const idNum = rawId === "" || rawId == null ? null : Number(rawId);
        const id = Number.isFinite(idNum) ? idNum : null;

        const label =
          o?.label ??
          o?.name ??
          o?.organizationName ??
          o?.organization_name ??
          (id != null ? `Org #${id}` : "");

        return { id, label };
      });

      setOrgOptions(normalized.filter((x) => x.id != null));
    } catch (e) {
      console.error(e);
      setOrgOptions([]);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchRecipients(selectedProjectId);
    fetchPaymentOrders(selectedProjectId);
    fetchOrganizations();

    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
    setColumnsOpen(false);
  }, [
    fetchRecipients,
    fetchPaymentOrders,
    fetchOrganizations,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  const blankRecipient = {
    organizationId: "",
    paymentOrderId: "",
  };

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

  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
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
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/recipients`
          : `${BASE_URL}/api/recipients/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} recipient.`,
        );
        return;
      }

      await fetchRecipients(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} recipient.`,
      );
    }
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this recipient?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/recipients/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        setFormError(data?.message || "Delete failed.");
        return;
      }

      setSelectedRecipientIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await fetchRecipients(selectedProjectId);
    } catch (e) {
      console.error(e);
      setFormError("Delete failed.");
    }
  };

  const toggleSelectedRecipient = (id, checked) => {
    if (!id) return;

    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const toggleSelectAllVisible = (checked) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);

      selectableRecipients.forEach((r) => {
        if (checked) {
          next.add(r.id);
        } else {
          next.delete(r.id);
        }
      });

      return next;
    });
  };

  const removeSelected = async () => {
    const ids = [...selectedRecipientIds];

    if (ids.length === 0) return;

    if (
      !window.confirm(
        `Delete ${ids.length} selected recipient${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/recipients/bulk-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        throw new Error(
          data?.message || "Failed to delete selected recipients.",
        );
      }

      setSelectedRecipientIds(new Set());
      await fetchRecipients(selectedProjectId);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to delete recipients.");
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px",
    );
    return parts.join(" ");
  }, [visibleCols]);

  const selectableRecipients = useMemo(
    () => items.filter((r) => r?.id != null),
    [items],
  );

  const selectedRecipientCount = selectedRecipientIds.size;

  const allVisibleSelected =
    selectableRecipients.length > 0 &&
    selectableRecipients.every((r) => selectedRecipientIds.has(r.id));

  const totalCount = items.length;

  const subtitle = selectedProjectId
    ? `Project #${selectedProjectId} • ${totalCount} recipient${
        totalCount === 1 ? "" : "s"
      }`
    : "Select a project to see recipients.";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h2 className={styles.pageTitle}>Recipients</h2>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.dangerInlineBtn}
              onClick={removeSelected}
              disabled={selectedRecipientCount === 0}
              title="Delete selected recipients"
            >
              <FiTrash2 />
              Delete selected{" "}
              {selectedRecipientCount > 0 ? `(${selectedRecipientCount})` : ""}
            </button>

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

            <button
              className={styles.primaryBtn}
              onClick={startCreate}
              disabled={!selectedProjectId || editingId === "new"}
              title={
                !selectedProjectId
                  ? "Select a project first"
                  : editingId === "new"
                    ? "Finish the current draft first"
                    : "Create new recipient"
              }
              type="button"
            >
              <FiPlus />
              New
            </button>
          </div>
        </div>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <div className={styles.table} style={{ ["--rec-grid-cols"]: gridCols }}>
          <div className={`${styles.gridRow} ${styles.headerRow}`}>
            {headerLabels.map((h, i) => (
              <div
                key={h}
                className={`${styles.headerCell}
                  ${i === 0 ? styles.stickyColHeader : ""}
                  ${!visibleCols[i] ? styles.hiddenCol : ""}`}
              >
                {i === 0 ? (
                  <div className={styles.headerActionsCell}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      disabled={selectableRecipients.length === 0}
                      title="Select all visible recipients"
                      aria-label="Select all visible recipients"
                    />
                    <span>{h}</span>
                  </div>
                ) : (
                  h
                )}
              </div>
            ))}
          </div>

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
                isSelected={selectedRecipientIds.has(r.id)}
                onSelectChange={toggleSelectedRecipient}
                selectionDisabled={editingId === r.id}
                poOptions={poOptions}
                orgOptions={orgOptions}
                visibleCols={visibleCols}
                fieldErrors={fieldErrors[r.id] || {}}
              />
            ))
          )}

          {editingId === "new" && (
            <RecipientRow
              row={{
                id: "new",
                organizationId: "",
                paymentOrderId: "",
                amount: 0,
              }}
              isEditing
              editedValues={editedValues.new}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={() => {}}
              isSelected={false}
              onSelectChange={() => {}}
              selectionDisabled
              poOptions={poOptions}
              orgOptions={orgOptions}
              visibleCols={visibleCols}
              isEven={false}
              fieldErrors={fieldErrors.new || {}}
              rowRef={newRowRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Recipients;
