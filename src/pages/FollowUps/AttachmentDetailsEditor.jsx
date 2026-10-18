import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../config/api";
import useRecordAutosave from "../../utils/useRecordAutosave";
import { readDocumentError } from "../../utils/documentMetadata";
import { notifySuccess } from "../../utils/successNotifications";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import AutosaveStatus from "../../components/ProjectClassification/AutosaveStatus";
import styles from "./FollowUps.module.scss";

export default function AttachmentDetailsEditor({ item, projectId, authFetch, categories, disabled, onOperation, onSaved, onClose }) {
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const read = async () => {
    const response = await authFetch(`${BASE_URL}/api/documents/project/${projectId}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await readDocumentError(response, "Could not read document details."));
    const rows = await response.json();
    const doc = Array.isArray(rows) && rows.find(row => row.id === item.documentId && row.projectId === projectId);
    if (!doc || doc.isCurrent !== true || doc.isDeleted === true) throw new Error("This document is no longer an active current version. Close the editor and review Project Documents.");
    return { ...doc, category: doc.category || "UNCATEGORIZED", status: doc.status || "", documentDate: doc.documentDate || "" };
  };
  useEffect(() => {
    let active = true;
    read().then(doc => { if (active) { setOriginal(doc); setForm(doc); setError(""); } }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
    // Reload only on an explicit retry; background observations must not replace edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.documentId, projectId, attempt]);
  const save = useRecordAutosave({
    recordKey: `document-${projectId}-${item.documentId}`,
    enabled: !!original && !disabled && !!onOperation && categories.length > 0,
    read,
    write: (fresh, changes) => onOperation(async () => {
      const response = await authFetch(`${BASE_URL}/api/documents/${fresh.id}`, {
        method: "PUT", silentSuccess: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fresh.id, projectId: fresh.projectId, employeeId: fresh.employeeId, documentName: fresh.documentName,
          ...changes, ...(Object.hasOwn(changes, "documentDate") ? { documentDate: changes.documentDate || null } : {}) }),
      });
      if (!response.ok) throw new Error(await readDocumentError(response, "Could not save document details."));
    }),
    validate: value => !categories.some(c => c.id === value.category) ? "Choose an available category." : !["DRAFT", "FINAL", ""].includes(value.status) ? "Choose Draft or Final." : value.documentDate && !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value.documentDate) ? "Enter a complete document date." : "",
    onSaved: (doc, changes, pending) => {
      setOriginal(doc); setForm({ ...doc, ...pending }); onSaved(doc);
      notifySuccess("Document details saved.");
    },
  });
  useUnsavedChange(`attachment-details-${projectId}-${item.documentId}`, save.dirty || save.busy);
  // A background refresh may briefly disable actions when the debounce expires.
  useEffect(() => { if (!disabled && save.dirty && !save.busy && !save.error) save.flush(); }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const edit = (field, value) => { setForm(current => ({ ...current, [field]: value })); save.edit({ [field]: value }, original); };
  const close = () => { if (!save.dirty || window.confirm("Discard unsaved document details? Previously saved changes will remain.")) onClose(); };
  return <form className={styles.attachmentEditor} aria-label={`Edit details for ${item.documentName}`} onSubmit={event => {
    event.preventDefault();
    if (!save.dirty) notifySuccess("All document details are already saved.");
    else save.flush();
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) save.flush(); }}>
    <h5>Edit details · {item.documentName}</h5>
    <p className={styles.muted}>These document details are shared everywhere this version is linked. Changes save after a short pause or when you leave the form. Final is a label, not approval or proof of signing.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(n => n + 1)}>Retry document details</button></p>}
    {!form && !error && <p role="status">Loading document details…</p>}
    <div className={styles.saveFeedback}><AutosaveStatus save={save} /></div>
    {form && <><div className={styles.grid}>
      <label>Category<select autoFocus value={form.category} disabled={disabled || save.busy} onChange={e => edit("category", e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <label>Status<select value={form.status} disabled={disabled || save.busy} onChange={e => edit("status", e.target.value)}>{!original.status && <option value="">Not recorded</option>}<option value="DRAFT">Draft</option><option value="FINAL">Final</option></select></label>
      <label>Document date<input type="date" min="1000-01-01" max="9999-12-31" value={form.documentDate} disabled={disabled || save.busy} onChange={e => edit("documentDate", e.target.value)} /></label>
    </div><div className={styles.actions}><button type="submit" disabled={disabled || save.busy || !!save.error}>{save.busy ? "Saving details…" : "Save details"}</button></div></>}
    <button type="button" disabled={save.busy} onClick={close}>Close details</button>
  </form>;
}
