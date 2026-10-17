import React, { useEffect, useRef, useState } from "react";
import { FiUploadCloud, FiDownload, FiLink } from "react-icons/fi";
import { BASE_URL } from "../../config/api";
import { readDocumentError, uploadTimeLabel } from "../../utils/documentMetadata";
import { downloadDocument } from "../../utils/documentDownload";
import { validateDocumentFile, FILE_INPUT_ACCEPT, ALLOWED_FORMATS_LABEL, MAX_UPLOAD_MB } from "../../utils/documentFile";
import { notifySuccess } from "../../utils/successNotifications";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import useDocumentCategories from "../../hooks/useDocumentCategories";
import { statusLabel } from "../../components/DocumentStatus/DocumentStatus";
import styles from "./FollowUps.module.scss";

const issues = {
  ACTIVE_USER_REQUIRED: "An active account is required to change attachments.",
  MANAGER_ROLE_REQUIRED: "Only project managers and administrators can change attachments.",
  ACTIVE_PROJECT_REQUIRED: "Attachments are read-only for an inactive project.",
  RESTORE_FOLLOW_UP_REQUIRED: "Restore this follow-up before changing attachments.",
  REOPEN_FOLLOW_UP_REQUIRED: "Reopen this follow-up before changing attachments.",
  UPLOAD_ACTIVE_EMPLOYEE_REQUIRED: "An active employee identity is required to upload. You may still link existing documents.",
};
const actor = value => value?.employeeName || value?.username || (value?.userId ? `User #${value.userId}` : "Not recorded");
function recoveryKey(task) {
  try {
    const subject = JSON.parse(atob(localStorage.getItem("authToken").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub;
    return subject ? `follow-up-attachment:${encodeURIComponent(subject)}:${task.projectId}:${task.id}` : null;
  } catch { return null; }
}

export default function FollowUpAttachments({ task, authFetch, disabled = false, onOperation, observation }) {
  const key = recoveryKey(task);
  const [recovered] = useState(() => { try { return key ? JSON.parse(sessionStorage.getItem(key)) : null; } catch { return null; } });
  const root = `${BASE_URL}/api/projects/${task.projectId}/follow-ups/${task.id}/attachments`;
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const readController = useRef(null);
  const [reviewRequired, setReviewRequired] = useState(!!recovered);
  const [uploaded, setUploaded] = useState(recovered?.uploaded || null);
  const [uncertainUpload, setUncertainUpload] = useState(!!recovered?.uncertainUpload);
  const [showExisting, setShowExisting] = useState(false);
  const [documents, setDocuments] = useState(null);
  const [documentsError, setDocumentsError] = useState("");
  const [documentAttempt, setDocumentAttempt] = useState(0);
  const [selected, setSelected] = useState("");
  const [category, setCategory] = useState("UNCATEGORIZED");
  const [status, setStatus] = useState("DRAFT");
  const [date, setDate] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [chosenFile, setChosenFile] = useState(null);
  const uploadReady = useRef(null);
  const input = useRef(null);
  const { categories, categoryError, retryCategories } = useDocumentCategories(authFetch);
  useUnsavedChange(`follow-up-attachments-${task.projectId}-${task.id}`, busy || !!chosenFile || !!uploaded || uncertainUpload || reviewRequired);
  useEffect(() => {
    try {
      if (!key) return;
      if (uploaded || uncertainUpload || reviewRequired) sessionStorage.setItem(key, JSON.stringify({ uploaded, uncertainUpload }));
      else sessionStorage.removeItem(key);
    } catch { /* The visible recovery reference remains available in this tab. */ }
  }, [key, uploaded, uncertainUpload, reviewRequired]);

  useEffect(() => { setPage(0); }, [task.revision]);
  useEffect(() => {
    const controller = new AbortController(); readController.current = controller;
    setLoading(true); setReadError("");
    (async () => {
      try {
        const response = await authFetch(`${root}?page=${page}&size=20`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(await readDocumentError(response, "Could not load attachments."));
        const result = await response.json();
        if (result.projectId !== task.projectId || result.followUpId !== task.id || !Array.isArray(result.content) || !Number.isSafeInteger(result.followUpRevision)) throw new Error("Could not read attachments.");
        if (!controller.signal.aborted) {
          if (page > 0 && !result.content.length) { setPage(0); return; }
          setData(result);
        }
      } catch (err) { if (!controller.signal.aborted) setReadError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, root, task.id, task.projectId, task.revision, page, attempt, observation]);

  useEffect(() => {
    if (!showExisting) return;
    const controller = new AbortController(); setDocuments(null); setDocumentsError("");
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/documents/project/${task.projectId}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(await readDocumentError(response, "Could not load project documents."));
        const result = await response.json();
        if (!Array.isArray(result)) throw new Error("Could not read project documents.");
        if (!controller.signal.aborted) setDocuments(result);
      } catch (err) { if (!controller.signal.aborted) setDocumentsError(err.message); }
    })();
    return () => controller.abort();
  }, [authFetch, task.projectId, showExisting, documentAttempt]);

  const blocked = disabled || busy || loading || !!readError || reviewRequired || !onOperation;
  const canUpload = !blocked && data?.permissions?.canUpload && !uploaded && !uncertainUpload && categories.some(item => item.id === category);
  const command = async (documentId, remove = false) => {
    const response = await authFetch(remove ? `${root}/${documentId}?expectedRevision=${data.followUpRevision}` : root, {
      method: remove ? "DELETE" : "POST", silentSuccess: true,
      ...(!remove ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, expectedRevision: data.followUpRevision }) } : {}),
    });
    if (!response.ok) throw new Error(await readDocumentError(response, "Could not change the attachment link."));
    const result = await response.json();
    if (result.id !== task.id || result.projectId !== task.projectId || !Number.isSafeInteger(result.revision)) throw new Error("The attachment result could not be confirmed.");
    return result;
  };
  const run = async (operation, message = "Attachment linked to follow-up.") => {
    if (blocked || running.current) return;
    running.current = true; setBusy(true); setError(""); readController.current?.abort();
    try {
      await onOperation(operation);
      setSelected(""); setUploaded(null); setReviewRequired(false);
      notifySuccess(message);
    } catch (err) {
      setError(`${err.message} No request was automatically retried. Review the refreshed attachments before trying again.`);
      setReviewRequired(true);
    } finally { running.current = false; setBusy(false); setAttempt(value => value + 1); }
  };
  const upload = file => {
    if (!canUpload || running.current) return;
    const validation = validateDocumentFile(file);
    if (validation) { setError(validation); return; }
    if (date && !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date)) { setError("Enter a complete document date."); return; }
    run(async () => {
      const body = new FormData(); body.append("file", file); body.append("projectId", task.projectId);
      body.append("category", category); body.append("status", status); if (date) body.append("documentDate", date);
      let document;
      let knownRejection = false;
      try {
        const response = await authFetch(`${BASE_URL}/api/documents/upload`, { method: "POST", body });
        if (!response.ok) {
          knownRejection = response.status >= 400 && response.status < 500;
          throw new Error(await readDocumentError(response, "Upload could not be confirmed."));
        }
        document = await response.json();
        if (!Number.isSafeInteger(document.id) || document.id <= 0 || document.projectId !== task.projectId) throw new Error("The uploaded document reference could not be confirmed.");
      } catch (err) { if (!knownRejection) setUncertainUpload(true); throw err; }
      setUploaded({ id: document.id, name: document.documentName || file.name });
      return command(document.id);
    });
  };
  // Returning from a native file picker can trigger a focus refresh. Keep the
  // user's selection until both the queue and attachment permissions are ready.
  uploadReady.current = upload;
  useEffect(() => {
    if (!chosenFile || !canUpload) return;
    setChosenFile(null);
    uploadReady.current(chosenFile);
  }, [chosenFile, canUpload]);
  const download = async documentId => {
    setDownloading(documentId); setError("");
    try { await downloadDocument(documentId, authFetch); } catch (err) { setError(err.message); }
    finally { setDownloading(null); }
  };

  return <section className={styles.attachments} aria-label="Follow-up attachments">
    <h4><FiLink aria-hidden="true" /> Attachments <span className={styles.attachmentCount}>{task.attachmentCount} attachment{task.attachmentCount === 1 ? "" : "s"}</span></h4>
    <p className={styles.muted}>Files stay in Project Documents. Removing a link only removes it from this card. Each link keeps the exact version selected.</p>
    {loading && !data && <p role="status">Loading attachments…</p>}
    {readError && <div role="alert"><p>{readError} {data ? "Showing previously loaded attachments." : "Attachments are unavailable."}</p><button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Retry attachments</button></div>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Saving attachment… Keep this page open.</p>}
    {chosenFile && <p role="status">Selected: {chosenFile.name}. Waiting for the current refresh or task action to finish. <button type="button" onClick={() => setChosenFile(null)}>Cancel selected file</button></p>}
    {uploaded && <div className={styles.recovery}><p>Uploaded to Project Documents: <strong>{uploaded.name}</strong> (document #{uploaded.id}). Linking has not been confirmed. Keep this reference; do not upload the file again.</p><button type="button" disabled={blocked || !data?.permissions?.canLink} onClick={() => run(() => command(uploaded.id))}>Link uploaded document</button><button type="button" disabled={busy} onClick={() => setUploaded(null)}>Keep in Project Documents only</button></div>}
    {uncertainUpload && <div className={styles.recovery}><p>The upload result is uncertain. Check Project Documents for the file before uploading again. You can link it here using its exact version.</p><button type="button" disabled={busy} onClick={() => { setShowExisting(true); setDocumentAttempt(value => value + 1); }}>Check existing project documents</button><button type="button" disabled={busy} onClick={() => { if (window.confirm("Have you checked Project Documents for this upload? Uploading again may create a duplicate.")) setUncertainUpload(false); }}>I checked the upload result</button></div>}
    {reviewRequired && <div className={styles.recovery}><p>Check the current links below. A request may already have succeeded. {data && `Observed task revision: ${data.followUpRevision}.`}</p><button type="button" disabled={busy || loading || !!readError || !data} onClick={() => { setReviewRequired(false); setError(""); }}>I reviewed the refreshed attachments</button></div>}
    {data && <>
      {!data.content.length && <p>No attachments on this page.</p>}
      <ul className={styles.attachmentList}>{data.content.map(item => <li key={item.documentId}>
        <strong>{item.documentName}</strong>
        <p className={styles.muted}>Version {item.versionNumber} · {item.isCurrent ? "Current version" : "Historical version"} · {statusLabel(item.status)} · {categories.find(c => c.id === item.category)?.label || item.category}<br />Document date: {item.documentDate || "Not recorded"}</p>
        <p className={styles.muted}>Uploaded: {uploadTimeLabel(item.uploadedAt)} · {actor(item.uploadedBy)}<br />Linked: {uploadTimeLabel(item.linkedAt)} · {actor(item.linkedBy)}</p>
        {item.hasNewerVersion && <p className={styles.muted}>A newer version exists. This card still links to version {item.versionNumber}.</p>}
        {!item.downloadEligible && <p>Document unavailable. The link is retained.</p>}
        <div className={styles.actions}><button type="button" disabled={!item.downloadEligible || downloading !== null} onClick={() => download(item.documentId)}><FiDownload aria-hidden="true" /> {downloading === item.documentId ? "Downloading…" : "Download linked version"}</button>{item.canUnlink && <button type="button" disabled={blocked || !data.permissions?.canUnlink} onClick={() => { if (window.confirm(`Remove the link to ${item.documentName}? The document will remain in Project Documents.`)) run(() => command(item.documentId, true), "Attachment link removed. The file remains in Project Documents."); }}>Remove link</button>}</div>
      </li>)}</ul>
      {data.totalPages > 1 && <div className={styles.actions}><button type="button" disabled={busy || loading || page === 0} onClick={() => setPage(value => value - 1)}>Previous attachments</button><span>{data.totalElements} attachments · Page {data.totalPages ? data.page + 1 : 0} of {data.totalPages}</span><button type="button" disabled={busy || loading || page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next attachments</button></div>}
      {(data.permissions?.issues || []).map(issue => <p className={styles.muted} key={issue}>{issues[issue] || "Attachment actions are currently unavailable."}</p>)}
      {data.permissions?.canLink && <>
        <button type="button" disabled={busy} onClick={() => setShowExisting(value => !value)}>{showExisting ? "Hide document selector" : "Link existing project document"}</button>
        {showExisting && <div className={styles.attachmentEditor}>
          {documentsError && <p role="alert">{documentsError} <button type="button" onClick={() => setDocumentAttempt(value => value + 1)}>Retry project documents</button></p>}
          {!documents && !documentsError && <p role="status">Loading project documents…</p>}
          {documents && <><label>Exact document version<select value={selected} disabled={blocked} onChange={event => setSelected(event.target.value)}><option value="">Select a document version</option>{documents.map(doc => <option key={doc.id} value={doc.id}>{doc.documentName} · Version {doc.versionNumber} · {doc.isCurrent ? "Current" : "Historical"} · #{doc.id}</option>)}</select></label>{!documents.length && <p>No active project documents available.</p>}<p className={styles.muted}>Includes active historical versions. Linking an already attached version does not create a duplicate.</p><button type="button" disabled={blocked || !selected} onClick={() => run(() => command(Number(selected)))}>Link selected version</button></>}
        </div>}
      </>}
      {data.permissions?.canUpload && <div className={styles.attachmentEditor}>
        <h5>Upload and attach</h5>
        {categoryError && <p role="alert">{categoryError} <button type="button" onClick={retryCategories}>Retry categories</button></p>}
        <div className={styles.grid}><label>Upload category<select value={category} disabled={blocked} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Upload status<select value={status} disabled={blocked} onChange={event => setStatus(event.target.value)}><option value="DRAFT">Draft</option><option value="FINAL">Final</option></select></label><label>Document date (optional)<input type="date" min="1000-01-01" max="9999-12-31" value={date} disabled={blocked} onChange={event => setDate(event.target.value)} /></label></div>
        <p className={styles.muted}>You can upload using the defaults: Uncategorized and Draft. Change the details first if needed; the date is optional. Final is a descriptive label, not approval or proof of signing.</p>
        <button type="button" className={styles.attachmentDrop} disabled={!canUpload || !!chosenFile} onClick={() => input.current?.click()} onDragOver={event => { event.preventDefault(); event.stopPropagation(); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); if (!canUpload || chosenFile) return; if (event.dataTransfer.files.length !== 1) { setError("Choose one file at a time."); return; } setChosenFile(event.dataTransfer.files[0]); }}><FiUploadCloud aria-hidden="true" /><span>Choose a file, or drag and drop it here</span><small>{ALLOWED_FORMATS_LABEL} · max {MAX_UPLOAD_MB}MB</small></button>
        <input ref={input} type="file" aria-label="Upload follow-up attachment" hidden accept={FILE_INPUT_ACCEPT} disabled={busy || !!uploaded || uncertainUpload || reviewRequired || !data.permissions?.canUpload} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) setChosenFile(file); }} />
      </div>}
    </>}
  </section>;
}
