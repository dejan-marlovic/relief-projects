import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit, FiLink, FiPlus, FiSave, FiX } from "react-icons/fi";
import { BASE_URL } from "../../../config/api";
import styles from "./BankDetails.module.scss";

const blankBankDetail = { bankName: "", accountNumber: "", branchName: "", swiftCode: "" };

async function safeParseJsonResponse(response) {
  const raw = await response.text().catch(() => "");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const formatBankDetailLabel = (value) =>
  [value?.bankName, value?.accountNumber, value?.branchName].filter(Boolean).join(" — ");

const BankDetails = ({ organizationId, canManage = false }) => {
  const [rows, setRows] = useState([]);
  const [unlinkedOptions, setUnlinkedOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busyAction, setBusyAction] = useState("");

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(() => ({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  }), [token]);

  const loadForOrg = useCallback(async () => {
    if (!organizationId) return;
    setFormError("");
    try {
      const requests = [fetch(`${BASE_URL}/api/organizations/${organizationId}/bank-details`, { headers: authHeaders })];
      if (canManage) requests.push(fetch(`${BASE_URL}/api/bank-details/unlinked`, { headers: authHeaders }));
      const [linkedResponse, unlinkedResponse] = await Promise.all(requests);
      if (!linkedResponse.ok) {
        const data = await safeParseJsonResponse(linkedResponse);
        throw new Error(data?.message || "Failed to load bank details for this organization.");
      }
      const linked = await linkedResponse.json();
      setRows(Array.isArray(linked) ? linked : []);
      if (unlinkedResponse?.ok) {
        const unlinked = await unlinkedResponse.json();
        setUnlinkedOptions(Array.isArray(unlinked) ? unlinked : []);
      } else setUnlinkedOptions([]);
      setSelectedId("");
    } catch (error) {
      console.error("Error fetching bank details:", error);
      setRows([]);
      setUnlinkedOptions([]);
      setFormError(error.message || "Failed to load bank details for this organization.");
    }
  }, [authHeaders, canManage, organizationId]);

  useEffect(() => {
    setEditingId(null);
    setEditedValues({});
    setFieldErrors({});
    setFormError("");
    loadForOrg();
  }, [loadForOrg]);

  const rowKeyOf = (row) => row.bankId ?? row.id;
  const startEdit = (row) => {
    if (!canManage) return;
    const id = rowKeyOf(row);
    setEditingId(id);
    setEditedValues({ [id]: {
      bankName: row.bankName || "", accountNumber: row.accountNumber || "",
      branchName: row.branchName || "", swiftCode: row.swiftCode || "",
    } });
    setFieldErrors({});
    setFormError("");
  };
  const startCreate = () => {
    if (!canManage) return;
    setEditingId("new");
    setEditedValues({ new: { ...blankBankDetail } });
    setFieldErrors({});
    setFormError("");
  };
  const cancel = () => {
    setEditingId(null); setEditedValues({}); setFieldErrors({}); setFormError("");
  };
  const onChange = (field, value) => setEditedValues((current) => ({
    ...current, [editingId]: { ...current[editingId], [field]: value },
  }));

  const request = async (url, options, fallbackMessage) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await safeParseJsonResponse(response);
      const error = new Error(data?.message || fallbackMessage);
      error.fieldErrors = data?.fieldErrors;
      throw error;
    }
    return response;
  };

  const save = async () => {
    if (!canManage || !editingId) return;
    const id = editingId;
    const values = editedValues[id];
    if (!values) return;
    setBusyAction(`save-${id}`); setFormError(""); setFieldErrors({});
    try {
      const body = JSON.stringify({
        ...(id === "new" ? {} : { bankId: id, organizationId: Number(organizationId) }),
        bankName: values.bankName || "", accountNumber: values.accountNumber || "",
        branchName: values.branchName || null, swiftCode: values.swiftCode || null,
      });
      if (id === "new") {
        await request(`${BASE_URL}/api/organizations/${organizationId}/bank-details`,
          { method: "POST", headers: authHeaders, body }, "Failed to create and link bank detail.");
      } else {
        await request(`${BASE_URL}/api/bank-details/${id}`,
          { method: "PUT", headers: authHeaders, body }, "Failed to update bank detail.");
      }
      cancel(); await loadForOrg();
    } catch (error) {
      console.error(error);
      if (error.fieldErrors) setFieldErrors({ [id]: error.fieldErrors });
      setFormError(error.message || "Failed to save bank detail.");
    } finally { setBusyAction(""); }
  };

  const addExisting = async () => {
    if (!canManage || !selectedId) return;
    setBusyAction("link"); setFormError("");
    try {
      await request(`${BASE_URL}/api/organizations/${organizationId}/bank-details/${selectedId}`,
        { method: "POST", headers: authHeaders }, "Failed to link bank detail.");
      await loadForOrg();
    } catch (error) {
      console.error(error); setFormError(error.message || "Failed to link bank detail.");
    } finally { setBusyAction(""); }
  };

  const unlink = async (id) => {
    if (!canManage) return;
    if (!window.confirm("Remove this bank detail from the organization? The bank-detail record will remain available.")) return;
    setBusyAction(`unlink-${id}`); setFormError("");
    try {
      await request(`${BASE_URL}/api/organizations/${organizationId}/bank-details/${id}`,
        { method: "DELETE", headers: authHeaders }, "Failed to remove bank detail from organization.");
      await loadForOrg();
    } catch (error) {
      console.error(error); setFormError(error.message || "Failed to remove bank detail from organization.");
    } finally { setBusyAction(""); }
  };

  const getFieldError = (id, field) => fieldErrors?.[id]?.[field];
  const inputClassFor = (id, field) => `${styles.input} ${getFieldError(id, field) ? styles.inputError : ""}`;
  const renderField = (id, row, field, placeholder) => {
    if (String(editingId) !== String(id)) return row?.[field] || "-";
    return <>
      <input className={inputClassFor(id, field)} value={editedValues[id]?.[field] ?? ""}
        onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} />
      {getFieldError(id, field) && <div className={styles.fieldError}>{getFieldError(id, field)}</div>}
    </>;
  };

  const renderRow = (row, index, isNew = false) => {
    const id = isNew ? "new" : rowKeyOf(row);
    const editing = String(editingId) === String(id);
    const disabled = Boolean(busyAction);
    return <div key={id} className={`${styles.gridRow} ${styles.dataRow} ${index % 2 === 0 ? styles.zebraEven : ""} ${styles.hoverable}`}>
      <div className={`${styles.cell} ${styles.stickyCol}`}>
        {editing ? <div className={styles.actions}>
          <button type="button" className={styles.iconCircleBtn} onClick={save} disabled={disabled} aria-label={`Save bank detail ${id}`}><FiSave /></button>
          <button type="button" className={styles.dangerIconBtn} onClick={cancel} disabled={disabled} aria-label={`Cancel bank detail ${id}`}><FiX /></button>
        </div> : <div className={styles.actions}>
          {canManage && <button type="button" className={styles.iconCircleBtn} onClick={() => startEdit(row)} disabled={Boolean(editingId) || disabled} aria-label={`Edit bank detail ${id}`}><FiEdit /></button>}
          {canManage && <button type="button" className={styles.unlinkBtn} onClick={() => unlink(id)} disabled={Boolean(editingId) || disabled} title="Remove from organization" aria-label={`Remove bank detail ${id} from organization`}><FiLink /></button>}
        </div>}
      </div>
      <div className={styles.cell}>{renderField(id, row, "bankName", "Bank name")}</div>
      <div className={styles.cell}>{renderField(id, row, "accountNumber", "Account number")}</div>
      <div className={styles.cell}>{renderField(id, row, "branchName", "Branch")}</div>
      <div className={styles.cell}>{renderField(id, row, "swiftCode", "SWIFT")}</div>
    </div>;
  };

  return <div className={styles.container}>
    <div className={styles.header}>
      <div><div className={styles.title}>Bank details for organization #{organizationId}</div>
        <div className={styles.subtitle}>{rows.length} linked bank detail{rows.length === 1 ? "" : "s"}</div></div>
      {canManage && <div className={styles.headerRight}>
        <select className={styles.select} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}
          disabled={!unlinkedOptions.length || Boolean(editingId) || Boolean(busyAction)} aria-label="Existing bank detail">
          <option value="">Add an existing bank detail…</option>
          {unlinkedOptions.map((value) => <option key={value.bankId} value={value.bankId}>#{value.bankId} — {formatBankDetailLabel(value)}</option>)}
        </select>
        <button type="button" className={styles.secondaryBtn} onClick={addExisting} disabled={!selectedId || Boolean(editingId) || Boolean(busyAction)}><FiLink /> Add existing</button>
        <button type="button" className={styles.primaryBtn} onClick={startCreate} disabled={Boolean(editingId) || Boolean(busyAction)}><FiPlus /> New Bank Detail</button>
      </div>}
    </div>
    {formError && <div className={styles.errorBanner} role="alert">{formError}</div>}
    {!rows.length && editingId !== "new" && <p className={styles.noData}>No bank details linked to this organization.</p>}
    <div className={styles.table}>
      <div className={`${styles.gridRow} ${styles.headerRow}`}>
        <div className={`${styles.headerCell} ${styles.stickyColHeader}`}>Actions</div>
        <div className={styles.headerCell}>Bank name</div><div className={styles.headerCell}>Account number</div>
        <div className={styles.headerCell}>Branch</div><div className={styles.headerCell}>SWIFT</div>
      </div>
      {rows.map((row, index) => renderRow(row, index))}
      {editingId === "new" && renderRow(blankBankDetail, rows.length, true)}
    </div>
  </div>;
};

export default BankDetails;
