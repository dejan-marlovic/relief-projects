import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProjectContext } from "../../context/ProjectContext";
import SignatureRow from "./Signature/Signature";
import styles from "./Signatures.module.scss";

const BASE_URL = "http://localhost:8080";

const headerLabels = [
  "Actions",
  "Status",
  "Employee",
  "Payment Order",
  "Signature",
  "Date",
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
  const [poOptions, setPoOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // UI
  const [compact, setCompact] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true)
  );

  // errors
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { [rowId]: { fieldName: message } }

  // ref for new row (scroll-into-view)
  const newRowRef = useRef(null);

  const toggleCol = (i) => {
    if (i === 0) return;
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

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/employees/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();
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

  useEffect(() => {
    fetchSignatures(selectedProjectId);
    fetchPaymentOrders(selectedProjectId);
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
  }, [fetchSignatures, fetchPaymentOrders, selectedProjectId]);

  useEffect(() => {
    fetchSignatureStatuses();
    fetchEmployees();
  }, [fetchSignatureStatuses, fetchEmployees]);

  // auto-scroll when "new" row appears
  useEffect(() => {
    if (editingId === "new" && newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [editingId]);

  const blankSignature = {
    signatureStatusId: "",
    employeeId: "",
    paymentOrderId: "",
    signature: "",
    signatureDate: "",
  };

  const startEdit = (row) => {
    setEditingId(row?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [row.id]: {
        signatureStatusId:
          row.signatureStatusId != null ? String(row.signatureStatusId) : "",
        employeeId: row.employeeId != null ? String(row.employeeId) : "",
        paymentOrderId:
          row.paymentOrderId != null ? String(row.paymentOrderId) : "",
        signature: row.signature ?? "",
        signatureDate: row.signatureDate ?? "",
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
    setEditedValues((prev) => ({ ...prev, new: { ...blankSignature } }));

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
      signatureStatusId:
        v.signatureStatusId !== "" ? Number(v.signatureStatusId) : null,
      employeeId: v.employeeId !== "" ? Number(v.employeeId) : null,
      paymentOrderId: v.paymentOrderId !== "" ? Number(v.paymentOrderId) : null,
      signature: v.signature || "",
      signatureDate: v.signatureDate || null,
    };

    setFormError("");
    setFieldErrors((prev) => ({
      ...prev,
      [id]: {},
    }));

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

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.warn("Failed to parse signature error JSON:", e);
        }

        if (data && data.fieldErrors) {
          setFieldErrors((prev) => ({
            ...prev,
            [id]: data.fieldErrors,
          }));
        }

        setFormError(
          data?.message ||
            `Failed to ${isCreate ? "create" : "update"} signature.`
        );
        return;
      }

      await fetchSignatures(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} signature.`
      );
    }
  };

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

      {/* Global error banner */}
      {formError && <div className={styles.errorBanner}>{formError}</div>}

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
              fieldErrors={fieldErrors[s.id] || {}}
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
