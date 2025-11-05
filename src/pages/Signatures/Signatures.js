import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import SignatureRow from "./Signature/Signature";
import styles from "./Signatures.module.scss";

const BASE_URL = "http://localhost:8080";

const headerLabels = [
  "Actions",
  "Status", // signatureStatusId (dropdown)
  "Employee", // employeeId (dropdown)
  "Payment Order", // paymentOrderId (dropdown)
  "Signature", // signature
  "Date", // signatureDate
];

const BASE_COL_WIDTHS = [
  110, // Actions
  160, // Status
  200, // Employee
  170, // Payment Order
  260, // Signature
  200, // Date
];

function Signatures() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // dropdown data
  const [poOptions, setPoOptions] = useState([]); // payment orders by project
  const [statusOptions, setStatusOptions] = useState([]); // signature statuses (active)
  const [employeeOptions, setEmployeeOptions] = useState([]); // employees (active)

  // UI
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  const toggleCol = (i) => {
    if (i === 0) return; // keep Actions visible
    setVisibleCols((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  // Auth headers (memoized)
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

  // FETCH: signatures filtered by project
  const fetchSignatures = useCallback(
    async (projectId) => {
      if (!projectId) {
        setItems([]);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/signatures/by-project/${projectId}`,
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

  // FETCH: payment orders for dropdown (filtered by project)
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

  // FETCH: signature statuses for dropdown
  const fetchSignatureStatuses = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/signature-statuses/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((s) => ({
        id: s.id ?? s.signatureStatusId ?? s.statusId,
        label:
          s.signatureStatusName ??
          s.name ??
          s.statusName ??
          `Status #${s.id ?? s.signatureStatusId ?? s.statusId}`,
      }));
      setStatusOptions(normalized.filter((x) => x.id != null));
    } catch (e) {
      console.error(e);
      setStatusOptions([]);
    }
  }, [authHeaders]);

  // FETCH: employees (active) for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/employees/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();
      // Normalize to [{id, label}]
      const normalized = (Array.isArray(data) ? data : []).map((e) => ({
        id: e.id ?? e.employeeId,
        label:
          [e.firstName, e.lastName].filter(Boolean).join(" ") ||
          `Employee #${e.id ?? e.employeeId}`,
      }));
      setEmployeeOptions(normalized.filter((x) => x.id != null));
    } catch (e) {
      console.error(e);
      setEmployeeOptions([]);
    }
  }, [authHeaders]);

  // Load data whenever project changes (lists) and once for global dropdowns
  useEffect(() => {
    fetchSignatures(selectedProjectId);
    fetchPaymentOrders(selectedProjectId);
    setEditingId(null);
    setEditedValues({});
  }, [fetchSignatures, fetchPaymentOrders, selectedProjectId]);

  useEffect(() => {
    fetchSignatureStatuses();
    fetchEmployees();
  }, [fetchSignatureStatuses, fetchEmployees]);

  // Begin edit
  const startEdit = (row) => {
    setEditingId(row?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [row.id]: {
        signatureStatusId: row.signatureStatusId ?? "",
        employeeId: row.employeeId ?? "",
        paymentOrderId: row.paymentOrderId ?? "",
        signature: row.signature ?? "",
        signatureDate: row.signatureDate ?? "",
      },
    }));
  };

  // Begin create
  const blankSignature = {
    signatureStatusId: "",
    employeeId: "",
    paymentOrderId: "",
    signature: "",
    signatureDate: "",
  };

  const startCreate = () => {
    setEditingId("new");
    setEditedValues((prev) => ({ ...prev, new: { ...blankSignature } }));
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
      if (id && next[id]) delete next[id];
      return next;
    });
  };

  // Save (create/update)
  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    const payload = {
      signatureStatusId:
        v.signatureStatusId !== "" ? Number(v.signatureStatusId) : null,
      employeeId: v.employeeId !== "" ? Number(v.employeeId) : null,
      paymentOrderId: v.paymentOrderId !== "" ? Number(v.paymentOrderId) : null,
      signature: v.signature || "",
      signatureDate: v.signatureDate || null, // ISO string
    };

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/signatures`
          : `${BASE_URL}/api/signatures/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(`${isCreate ? "Create" : "Update"} failed`);
      await fetchSignatures(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      alert(`${isCreate ? "Create" : "Save"} failed.`);
    }
  };

  // Delete
  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this signature?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/signatures/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchSignatures(selectedProjectId);
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

      {/* Table */}
      <div
        className={`${styles.table} ${compact ? styles.compact : ""}`}
        style={{ ["--sig-grid-cols"]: gridCols }}
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
            Select a project to see its signatures.
          </p>
        ) : items.length === 0 ? (
          <p className={styles.noData}>No signatures for this project.</p>
        ) : (
          items.map((s, idx) => (
            <SignatureRow
              key={s.id}
              row={s}
              isEven={idx % 2 === 0}
              isEditing={editingId === s.id}
              editedValues={editedValues[s.id]}
              onEdit={() => startEdit(s)}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={remove}
              poOptions={poOptions}
              statusOptions={statusOptions}
              employeeOptions={employeeOptions}
              visibleCols={visibleCols}
            />
          ))
        )}

        {/* Inline create row */}
        {editingId === "new" && (
          <SignatureRow
            row={{
              id: "new",
              signatureStatusId: "",
              employeeId: "",
              paymentOrderId: "",
              signature: "",
              signatureDate: "",
            }}
            isEditing
            editedValues={editedValues.new}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
            poOptions={poOptions}
            statusOptions={statusOptions}
            employeeOptions={employeeOptions}
            visibleCols={visibleCols}
            isEven={false}
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
              : "Create new signature"
          }
        >
          + New Signature
        </button>
      </div>
    </div>
  );
}

export default Signatures;
