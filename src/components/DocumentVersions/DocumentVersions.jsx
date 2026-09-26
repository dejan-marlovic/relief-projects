import useTransientMessage from "../../hooks/useTransientMessage";
import React, { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/api";
import { readDocumentError, uploaderLabel, uploadTimeLabel } from "../../utils/documentMetadata";
import DocumentStatus, { statusLabel } from "../DocumentStatus/DocumentStatus";
import ErrorBanner from "../ErrorBanner/ErrorBanner";
import styles from "../../pages/Documents/Documents.module.scss";

export default function DocumentVersions({ document, authFetch, categories, canEdit, canDelete, onDownload, downloading, revision, onChanged, onClose, validateFile }) {
  const [chain, setChain] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [replacement, setReplacement] = useState(null);
  const [message, setMessage] = useTransientMessage("");
  const alive = useRef(true);
  const mutation = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setChain(null);
    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/documents/${document.id}/versions`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load version history."));
        const data = await res.json();
        if (!Array.isArray(data.versions)) throw new Error("Version history is unavailable. Update the backend and retry.");
        if (!controller.signal.aborted) setChain(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [document.id, authFetch, revision, refresh]);

  const refreshViews = () => { setRefresh((value) => value + 1); onChanged(); };
  const replace = async (event) => {
    event.preventDefault();
    if (!canEdit || mutation.current || !replacement) return;
    const validation = validateFile(replacement.file);
    if (validation) { setError(validation); return; }
    mutation.current = true;
    setBusy(true); setError(""); setMessage("");
    let receivedResponse = false;
    try {
      const body = new FormData();
      body.append("file", replacement.file);
      body.append("status", replacement.status);
      if (replacement.category) body.append("category", replacement.category);
      if (replacement.date) body.append("documentDate", replacement.date);
      const res = await authFetch(`${BASE_URL}/api/documents/${replacement.id}/replace`, { method: "POST", body });
      receivedResponse = true;
      if (!res.ok) {
        const reason = await readDocumentError(res, "Replacement upload failed.");
        if (alive.current && ([404, 409].includes(res.status) || res.status >= 500)) { setReplacement(null); refreshViews(); }
        throw new Error(reason);
      }
      if (alive.current) { setReplacement(null); setMessage("Replacement uploaded. The previous version is retained."); refreshViews(); }
    } catch (err) {
      if (alive.current) {
        if (!receivedResponse) { setReplacement(null); refreshViews(); }
        setError(receivedResponse ? err.message : "The upload outcome could not be confirmed. Refresh version history and check the current version before trying again.");
      }
    }
    finally { mutation.current = false; if (alive.current) setBusy(false); }
  };

  const changeDeletion = async (version) => {
    if (!canDelete || mutation.current) return;
    const restoring = version.isDeleted === true;
    const warning = restoring ? "Restore this version? Its position in the version history will not change."
      : version.isCurrent ? "Delete the current version? Older versions will not become current." : "Delete this historical version? Its history link will be retained.";
    if (!window.confirm(warning)) return;
    mutation.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const res = await authFetch(`${BASE_URL}/api/documents/${version.id}${restoring ? "/restore" : ""}`, { method: restoring ? "PUT" : "DELETE" });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not change document availability."));
      if (alive.current) { setReplacement(null); refreshViews(); }
    } catch (err) { if (alive.current) { setError(err.message); refreshViews(); } }
    finally { mutation.current = false; if (alive.current) setBusy(false); }
  };

  return <section className={styles.metadataEditor} aria-label="Document version history">
    <div className={styles.docActions}><h3>Version history · {document.documentName}</h3><button type="button" className={styles.downloadLink} disabled={busy} onClick={onClose}>Close history</button><button type="button" className={styles.downloadLink} disabled={busy || loading} onClick={() => { setError(""); setReplacement(null); setRefresh((value) => value + 1); }}>Refresh history</button></div>
    <p className={styles.infoText}>Final is a document label, not approval or proof of signing. Earlier versions are read-only.</p>
    {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}
    {message && <p role="status">{message}</p>}
    {loading && <p>Loading version history…</p>}
    {chain?.currentDocumentDeleted && <p role="status">The current version is deleted. There is no active current version; older versions have not been promoted.</p>}
    {chain && <ol className={styles.versionList}>{chain.versions.map((version) => <li key={version.id} className={styles.documentItem}>
      <div className={styles.docInfo}>
        <strong>Version {version.versionNumber} · {version.documentName}</strong>
        <span>{statusLabel(version.status)} · {version.isCurrent ? "Current version" : "Historical version"} · {version.isDeleted === true ? "Deleted" : version.isDeleted === false ? "Active" : "Availability unknown"}</span>
        <span className={styles.uploadedBy}>{categories.find((item) => item.id === version.category)?.label || version.category} · Document date: {version.documentDate || "Unknown"}</span>
        <span className={styles.uploadedBy}>Uploaded by {uploaderLabel(version)} · Uploaded: {uploadTimeLabel(version.uploadedAt)}</span>
      </div>
      <div className={styles.docActions}>
        {version.isDeleted === false && <button type="button" className={styles.downloadLink} disabled={downloading.includes(version.id)} onClick={() => onDownload(version.id)}>Download version {version.versionNumber}</button>}
        {canEdit && version.isCurrent === true && version.isDeleted === false && <button type="button" className={styles.downloadLink} disabled={busy || !categories.length} onClick={() => { setError(""); setReplacement({ id: version.id, name: version.documentName, category: "", date: "", status: "DRAFT", file: null }); }}>Upload replacement</button>}
        {canDelete && typeof version.isDeleted === "boolean" && <button type="button" className={styles.downloadLink} disabled={busy} onClick={() => changeDeletion(version)}>{version.isDeleted ? "Restore" : "Delete"} version {version.versionNumber}</button>}
      </div>
    </li>)}</ol>}
    {replacement && <form onSubmit={replace} className={styles.metadataEditor}>
      <h4>Replace {replacement.name}</h4>
      <p className={styles.infoText}>This creates a new version. Category is inherited unless changed; document date starts empty and status starts as Draft.</p>
      <div className={styles.metadataControls}>
        <label>Replacement category<select disabled={busy} value={replacement.category} onChange={(e) => setReplacement({ ...replacement, category: e.target.value })}><option value="">Inherit current category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Replacement document date<input type="date" min="1000-01-01" max="9999-12-31" disabled={busy} value={replacement.date} onChange={(e) => setReplacement({ ...replacement, date: e.target.value })} /></label>
        <DocumentStatus label="Replacement status" value={replacement.status} disabled={busy} onChange={(e) => setReplacement({ ...replacement, status: e.target.value })} />
        <label>Replacement file<input type="file" disabled={busy} onChange={(e) => setReplacement({ ...replacement, file: e.target.files?.[0] || null })} /></label>
      </div>
      <div className={styles.docActions}><button type="submit" className={styles.downloadLink} disabled={busy}>{busy ? "Uploading…" : "Save replacement"}</button><button type="button" className={styles.downloadLink} disabled={busy} onClick={() => setReplacement(null)}>Cancel replacement</button></div>
    </form>}
  </section>;
}
