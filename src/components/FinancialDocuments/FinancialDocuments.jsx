import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readDocumentError } from "../../utils/documentMetadata";
import { downloadDocument } from "../../utils/documentDownload";
import useDocumentCategories from "../../hooks/useDocumentCategories";
import { statusLabel } from "../DocumentStatus/DocumentStatus";
import DocumentVersions from "../DocumentVersions/DocumentVersions";
import styles from "./FinancialDocuments.module.scss";

const routes = { BUDGET: "budgets", TRANSACTION: "transactions", PAYMENT_ORDER: "payment-orders" };
const labels = { BUDGET: "Budget", TRANSACTION: "Transaction", PAYMENT_ORDER: "Payment order" };

function DocumentsPanel({ entityType, entityId, locked, lifecycleStatus, refreshKey, editingLocked }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { hasAnyRole } = useAuth();
  const roleCanManage = hasAnyRole("ADMIN", "FINANCE");
  const { categories, categoryError, retryCategories } = useDocumentCategories(authFetch);
  const [revision, setRevision] = useState(0);
  const [links, setLinks] = useState([]);
  const [target, setTarget] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [ownershipMessage, setOwnershipMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidateError, setCandidateError] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const [downloading, setDownloading] = useState([]);
  const downloads = useRef(new Map());
  const pending = useRef(false);
  const alive = useRef(true);
  const endpoint = `${BASE_URL}/api/${routes[entityType]}/${entityId}`;
  const refresh = () => setRevision((value) => value + 1);
  useEffect(() => {
    alive.current = true;
    const requests = downloads.current;
    const onFocus = () => setRevision((value) => value + 1);
    window.addEventListener("focus", onFocus);
    return () => { alive.current = false; window.removeEventListener("focus", onFocus); requests.forEach((request) => request.abort()); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const json = async (url) => {
      const res = await authFetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not load record documents."));
      return res.json();
    };
    setLoading(true); setListError(""); setTarget(null); setProjectId(null); setSelectedId(""); setOwnershipMessage("");
    (async () => {
      const results = await Promise.allSettled([json(`${endpoint}/documents`), json(endpoint)]);
      if (controller.signal.aborted) return;
      const [associations, record] = results;
      if (associations.status === "fulfilled" && Array.isArray(associations.value)) setLinks(associations.value);
      else { setLinks([]); setListError(associations.reason?.message || "Could not load supporting documents."); }
      if (record.status === "fulfilled") {
        setTarget(record.value);
        try {
          let owner = record.value.projectId;
          if (entityType === "PAYMENT_ORDER") {
            if (!record.value.transactionId) throw new Error("This payment order needs an active header transaction before documents can be linked. Payment-order lines do not establish the document project.");
            const transaction = await json(`${BASE_URL}/api/transactions/${record.value.transactionId}`);
            owner = transaction.projectId;
          }
          if (!owner) throw new Error("An active owning project is required to link documents.");
          await json(`${BASE_URL}/api/projects/${owner}`);
          if (!controller.signal.aborted) setProjectId(owner);
        } catch (err) {
          if (!controller.signal.aborted) setOwnershipMessage(entityType === "PAYMENT_ORDER" ? `An active header transaction and project are required to add links. ${err.message}` : "The owning project is unavailable; new documents cannot be linked.");
        }
      } else setOwnershipMessage("This financial record is unavailable for changes. Retained document links are shown where permitted.");
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [authFetch, endpoint, entityType, revision, lifecycleStatus, locked, refreshKey]);

  const canManage = roleCanManage && !loading && !listError && target && target.isDeleted !== true
    && ["DRAFT", "RETURNED"].includes(target.lifecycleStatus)
    && !(entityType === "PAYMENT_ORDER" && (locked || target.locked)) && !editingLocked;
  const canLink = Boolean(canManage && projectId);

  useEffect(() => {
    const controller = new AbortController();
    setCandidates([]); setSelectedId(""); setCandidateError(""); setCandidateLoading(false);
    if (!canLink) return;
    setCandidateLoading(true);
    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/documents/project/${projectId}${includeHistorical ? "" : "?currentOnly=true"}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load eligible documents."));
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Could not load eligible documents.");
        if (!controller.signal.aborted) setCandidates(data.filter((doc) => doc.isDeleted === false && String(doc.projectId) === String(projectId)));
      } catch (err) { if (!controller.signal.aborted) setCandidateError(err.message); }
      finally { if (!controller.signal.aborted) setCandidateLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, projectId, includeHistorical, revision, canLink]);

  const mutate = async (documentId, unlink = false) => {
    if (pending.current || !canManage || (!unlink && !canLink)) return;
    if (unlink && !window.confirm("Remove this link? The document and its file will be kept.")) return;
    pending.current = true; setBusy(true); setActionError(""); setMessage("");
    try {
      const res = await authFetch(`${endpoint}/documents${unlink ? `/${documentId}` : ""}`, unlink ? { method: "DELETE" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: Number(documentId) }) });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not change the document link."));
      if (alive.current) setMessage(unlink ? "Link removed. The document is unchanged." : "Exact document version linked.");
    } catch (err) { if (alive.current) setActionError(`${err.message} The list has been refreshed; check the result before retrying.`); }
    finally { pending.current = false; if (alive.current) { setBusy(false); refresh(); } }
  };
  const download = async (id) => {
    if (downloads.current.has(id)) return;
    const controller = new AbortController(); downloads.current.set(id, controller);
    setDownloading((previous) => [...previous, id]); setActionError("");
    try { await downloadDocument(id, authFetch, controller.signal); }
    catch (err) { if (alive.current && !controller.signal.aborted) setActionError(err.message); }
    finally { downloads.current.delete(id); if (alive.current) setDownloading((previous) => previous.filter((item) => item !== id)); }
  };
  const categoryLabel = (value) => categories.find((item) => item.id === value)?.label || value || "Uncategorized";
  const selectable = candidates.filter((doc) => !links.some((link) => link.documentId === doc.id));
  return <div className={styles.panel}>
    <p className={styles.hint}>Links keep the exact file version you select. A replacement never changes existing supporting evidence. Draft and Final are descriptive labels.</p>
    <button type="button" onClick={refresh} disabled={loading || busy}>Refresh supporting documents</button>
    {loading && <p role="status">Loading supporting documents…</p>}
    {listError && <p role="alert">{listError}</p>}
    {actionError && <p role="alert">{actionError}</p>}
    {message && <p role="status">{message}</p>}
    {categoryError && <p role="alert">{categoryError} <button type="button" onClick={retryCategories}>Retry categories</button></p>}
    {!loading && <>
      {ownershipMessage && <p className={styles.hint}>{ownershipMessage}</p>}
      {!roleCanManage && <p className={styles.hint}>Only Admin and Finance can change supporting-document links.</p>}
      {roleCanManage && !canManage && <p className={styles.hint}>{editingLocked ? "Finish editing this record before changing document links." : "Links can be changed only on active Draft or Returned records. Submitted, Approved and Booked records are read-only."}</p>}
      {!listError && links.length === 0 && <p>No supporting documents linked.</p>}
      <ul className={styles.list}>{links.map((link) => <li key={link.documentId}>
        <div className={styles.info}>
          <strong>{link.documentName}</strong>
          <span>Version {link.versionNumber} · {statusLabel(link.status)} · {categoryLabel(link.category)} · Document date: {link.documentDate || "Unknown"}</span>
          {link.hasNewerVersion && <span className={styles.notice}>Newer version exists: #{link.currentDocumentId} · {statusLabel(link.currentDocumentStatus)}{link.currentDocumentDeleted === true ? " · Deleted" : ""}. This link still uses version {link.versionNumber}.</span>}
          {!link.downloadEligible && <span>Unavailable for download{link.documentDeleted === true ? " · Document deleted" : link.projectDeleted === true ? " · Project deleted" : " · Availability unknown"}.</span>}
          {link.targetDeleted === true && <span>Financial record deleted · link retained.</span>}
        </div>
        <div className={styles.actions}>
          <button type="button" disabled={link.downloadEligible !== true || downloading.includes(link.documentId)} onClick={() => download(link.documentId)}>Download linked version</button>
          <button type="button" onClick={() => setHistory({ id: link.documentId, documentName: link.documentName })}>Version history</button>
          {canManage && <button type="button" disabled={busy} onClick={() => mutate(link.documentId, true)}>Remove link</button>}
        </div>
      </li>)}</ul>
      {canLink && <form className={styles.picker} onSubmit={(event) => { event.preventDefault(); if (selectedId) mutate(selectedId); }}>
        <label><input type="checkbox" checked={includeHistorical} disabled={busy} onChange={(event) => setIncludeHistorical(event.target.checked)} /> Include active historical versions</label>
        {candidateError && <p role="alert">{candidateError}</p>}
        <label>Project document<select value={selectedId} disabled={busy || candidateLoading} onChange={(event) => setSelectedId(event.target.value)}><option value="">{candidateLoading ? "Loading documents…" : "Select an exact document version"}</option>{selectable.map((doc) => <option key={doc.id} value={doc.id}>{doc.documentName} · Version {doc.versionNumber} · {statusLabel(doc.status)}{doc.isCurrent ? " · Current" : " · Historical"} (#{doc.id})</option>)}</select></label>
        <div className={styles.actions}><button type="submit" disabled={!selectedId || busy || candidateLoading}>Link selected version</button>{selectedId && <button type="button" onClick={() => { const doc = selectable.find((item) => String(item.id) === selectedId); if (doc) setHistory(doc); }}>Preview version history</button>}</div>
        {!candidateLoading && !candidateError && !selectable.length && <p>No unlinked documents in this view. Try including historical versions or upload a project document first.</p>}
        <p className={styles.hint}>To change evidence, link the new version first, then remove the old link. Removing a link does not delete the document. Uploads remain available in the project's Documents tab for users with upload permission.</p>
      </form>}
    </>}
    {history && <DocumentVersions key={history.id} document={history} authFetch={authFetch} categories={categories} canEdit={false} canDelete={false} onDownload={download} downloading={downloading} revision={revision} onChanged={refresh} onClose={() => setHistory(null)} />}
  </div>;
}

function Disclosure(props) {
  const [open, setOpen] = useState(false);
  return <details className={styles.section} onToggle={(event) => { if (event.currentTarget === event.target) setOpen(event.currentTarget.open); }}>
    <summary>Supporting documents · {labels[props.entityType]} #{props.entityId}</summary>
    {open && <DocumentsPanel {...props} />}
  </details>;
}

export default function FinancialDocuments(props) {
  if (!routes[props.entityType] || !Number.isSafeInteger(Number(props.entityId)) || Number(props.entityId) <= 0) return null;
  return <Disclosure key={`${props.entityType}-${props.entityId}`} {...props} />;
}
