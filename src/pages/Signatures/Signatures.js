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
import { FiPlus, FiColumns, FiTrash2 } from "react-icons/fi";

import { BASE_URL } from "../../config/api"; // adjust path if needed

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

// ---- helpers ----
async function safeParseJsonResponse(res) {
  const raw = await res.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Normalize signature DTO coming from backend.
 * Handles common variations: id/signatureId, paymentOrderId/paymentOrder etc.
 */
function normalizeSignature(s) {
  if (!s || typeof s !== "object") return null;

  const id = s.id ?? s.signatureId ?? s.signature_id ?? null;

  const signatureStatusId =
    s.signatureStatusId ??
    s.signature_status_id ??
    s.signatureStatus?.id ??
    s.signatureStatus?.signatureStatusId ??
    null;

  const employeeId =
    s.employeeId ??
    s.employee_id ??
    s.employee?.id ??
    s.employee?.employeeId ??
    null;

  const paymentOrderId =
    s.paymentOrderId ??
    s.payment_order_id ??
    s.paymentOrder?.id ??
    s.paymentOrder?.paymentOrderId ??
    null;

  return {
    id,
    signatureStatusId,
    employeeId,
    paymentOrderId,
    signature: s.signature ?? "",
    signatureDate: s.signatureDate ?? s.signature_date ?? null,
  };
}

function Signatures() {
  const { selectedProjectId } = useContext(ProjectContext);

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  //React allows a lazy initializer function
  //runs only when the component is first created.
  //So React says: I will call this function once to get the initial state.
  //function version is preferred when creating the initial value has some
  //cost or when you want to avoid recreating it unnecessarily on every render.
  const [selectedSignatureIds, setSelectedSignatureIds] = useState(
    () => new Set(),
  );

  // dropdown data
  const [poOptions, setPoOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // UI
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() =>
    Array(headerLabels.length).fill(true),
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
    [token],
  );

  const fetchSignatures = useCallback(
    async (projectId) => {
      if (!projectId) {
        setItems([]);
        //Clear selection when no project is selected
        setSelectedSignatureIds(new Set());
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/signatures/by-project/${projectId}`,
          { headers: authHeaders },
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);

        //reads the JSON response from your backend
        const data = await res.json();
        //makes sure we always work with an array.
        //If data is one object, wrap it in an array:
        /*
        if data is already an array:
              use data

          else if data exists:
              wrap it in an array

          else:
              use an empty array
        */
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        //converts every backend signature into the frontend shape we want.
        //same as: .filter((item) => Boolean(item))
        //It keeps only values that are “truthy” and removes values that are “falsy”.
        //This runs normalizeSignature on every item in the array.

        /*
        1. convert every backend object into your frontend format
        2. remove any invalid results such as null or undefined
        */
        const normalized = arr.map(normalizeSignature).filter(Boolean);

        //This updates the visible signature table/list with the fresh data.
        //Stores the cleaned array in React state, so your table/list shows
        // only valid normalized signatures.
        setItems(normalized);

        //This removes selected IDs that no longer exist after reload.
        setSelectedSignatureIds((prev) => {
          //This creates a Set containing only the IDs that exist in the newly loaded data.
          //gives: [1, 2, 3]
          const activeIds = new Set(normalized.map((s) => s.id));

          //This is the actual cleanup
          //This keeps only IDs that still exist in the new data
          return new Set([...prev].filter((id) => activeIds.has(id)));
        });
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    },
    [authHeaders],
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
          { headers: authHeaders },
        );
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        const normalized = arr
          .map((po) => ({
            id: po.id ?? po.paymentOrderId ?? po.payment_order_id,
          }))
          .filter((x) => x.id != null);

        setPoOptions(normalized);
      } catch (e) {
        console.error(e);
        setPoOptions([]);
      }
    },
    [authHeaders],
  );

  const fetchSignatureStatuses = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/signature-statuses/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();

      const normalized = (Array.isArray(data) ? data : []).map((s) => ({
        id: s.id ?? s.signatureStatusId ?? s.signature_status_id,
        label:
          s.signatureStatusName ??
          s.signature_status_name ??
          s.name ??
          s.statusName ??
          `Status #${s.id ?? s.signatureStatusId ?? s.signature_status_id}`,
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
        id: e.id ?? e.employeeId ?? e.employee_id,
        label:
          [e.firstName ?? e.first_name, e.lastName ?? e.last_name]
            .filter(Boolean)
            .join(" ") || `Employee #${e.id ?? e.employeeId ?? e.employee_id}`,
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

  const validateClientSide = (rowId, v) => {
    const fe = {};
    if (!v.signatureStatusId) fe.signatureStatusId = "Status is required.";
    if (!v.employeeId) fe.employeeId = "Employee is required.";
    if (!v.paymentOrderId) fe.paymentOrderId = "Payment order is required.";
    if (!v.signature || !String(v.signature).trim())
      fe.signature = "Signature is required.";

    if (Object.keys(fe).length > 0) {
      setFieldErrors((prev) => ({ ...prev, [rowId]: fe }));
      setFormError("Please fix the highlighted fields.");
      return false;
    }
    return true;
  };

  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    setFormError("");
    setFieldErrors((prev) => ({ ...prev, [id]: {} }));

    if (!validateClientSide(id, v)) return;

    const payload = {
      signatureStatusId: Number(v.signatureStatusId),
      employeeId: Number(v.employeeId),
      paymentOrderId: Number(v.paymentOrderId),
      signature: String(v.signature || "").trim(),
      signatureDate: v.signatureDate ? v.signatureDate : null,
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
        },
      );

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);

        if (data?.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, [id]: data.fieldErrors }));
        }

        const msg =
          data?.message ||
          (res.status === 409
            ? "Conflict: this item is locked."
            : `Failed to ${isCreate ? "create" : "update"} signature.`);

        setFormError(msg);
        return;
      }

      await fetchSignatures(selectedProjectId);
      cancel();
    } catch (e) {
      console.error(e);
      setFormError(
        e.message || `Failed to ${isCreate ? "create" : "update"} signature.`,
      );
    }
  };

  /*
  If one row checkbox is checked, add that row ID to selectedSignatureIds.
  If it is unchecked, remove that row ID from selectedSignatureIds.
  */
  const toggleSelectedSignature = (id, checked) => {
    if (!id) return;

    setSelectedSignatureIds((prev) => {
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
    setSelectedSignatureIds((prev) => {
      const next = new Set(prev);

      selectableSignatures.forEach((s) => {
        if (checked) {
          next.add(s.id);
        } else {
          next.delete(s.id);
        }
      });
      return next;
    });
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this signature?")) return;

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/signatures/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        const msg =
          data?.message ||
          (res.status === 409
            ? "Conflict: this item is locked."
            : "Delete failed.");
        setFormError(msg);
        return;
      }

      setSelectedSignatureIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await fetchSignatures(selectedProjectId);
    } catch (e) {
      console.error(e);
      setFormError("Delete failed.");
    }
  };

  const removeSelected = async () => {
    const ids = [...selectedSignatureIds];

    if (
      !window.confirm(
        //comma is just a trailing comma from formatting
        `Delete ${ids.length} selected signature${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/signatures/bulk-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const data = await safeParseJsonResponse(res);
        throw new Error(
          data?.message || "Failed to delete selected signatures.",
        );
      }
      setSelectedSignatureIds(new Set());
      await fetchSignatures(selectedProjectId);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to delete selected signatures.");
    }
  };

  const gridCols = useMemo(() => {
    const parts = BASE_COL_WIDTHS.map((w, i) =>
      visibleCols[i] ? `${w}px` : "0px",
    );
    return parts.join(" ");
  }, [visibleCols]);

  const selectableSignatures = useMemo(
    () => items.filter((s) => s?.id != null),
    [items],
  );

  const selectedSignatureCount = selectedSignatureIds.size;

  //Create a boolean variable.
  //The value will be used for something like a “select all” checkbox
  //Only say all visible rows are selected if there is at least one visible selectable row.
  //Is this signature’s ID inside the selected IDs set?
  //There is at least one selectable signature, and every selectable
  //signature’s ID exists in the selected IDs set.
  //From all loaded signatures, keep only rows that have a real ID and can be selected.
  const allVisibleSelected =
    selectableSignatures.length > 0 &&
    selectableSignatures.every((s) => selectedSignatureIds.has(s.id));

  const subtitle = selectedProjectId
    ? `Project #${selectedProjectId} • ${items.length} signature${
        items.length === 1 ? "" : "s"
      }`
    : "Select a project to see signatures";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <h3 className={styles.pageTitle}>Signatures</h3>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.dangerInlineBtm}
              onClick={removeSelected}
              disabled={selectedSignatureCount === 0}
              title="Delete selected signatures"
            >
              <FiTrash2></FiTrash2>
              Delete selsected{" "}
              {selectedSignatureCount > 0 ? `(${selectedSignatureCount})` : ""}
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
                    : "Create new signature"
              }
              type="button"
            >
              <FiPlus />
              New
            </button>
          </div>
        </div>

        {formError && <div className={styles.errorBanner}>{formError}</div>}

        <div className={styles.table} style={{ ["--sig-grid-cols"]: gridCols }}>
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
                      disabled={selectableSignatures.length === 0}
                      title="Select all visible signatures"
                      aria-label="Select all visible signatures"
                    ></input>
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
      </div>
    </div>
  );
}

export default Signatures;
