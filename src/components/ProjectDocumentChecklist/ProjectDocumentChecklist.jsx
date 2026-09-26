import React, { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/api";
import { readDocumentError, uploadTimeLabel } from "../../utils/documentMetadata";
import { downloadDocument } from "../../utils/documentDownload";
import { statusLabel } from "../DocumentStatus/DocumentStatus";
import DocumentVersions from "../DocumentVersions/DocumentVersions";
import styles from "./ProjectDocumentChecklist.module.scss";

const states = { NEEDS_ASSESSMENT: "Needs assessment", MISSING_EVIDENCE: "Missing evidence", EVIDENCE_RECORDED: "Evidence recorded", EVIDENCE_UNAVAILABLE: "Evidence unavailable", NOT_APPLICABLE: "Not applicable" };
const nextSteps = {
  NEEDS_ASSESSMENT: "Decide whether this item applies to the project",
  MISSING_EVIDENCE: "Choose a document to record evidence",
  EVIDENCE_RECORDED: "Review linked documents or add more evidence",
  EVIDENCE_UNAVAILABLE: "Review unavailable evidence and link an available version",
  NOT_APPLICABLE: "Explanation recorded · reopen to change the decision",
};
const settled = (state) => ["EVIDENCE_RECORDED", "NOT_APPLICABLE"].includes(state);
const counts = { needsAssessment: "Needs assessment", missingEvidence: "Missing evidence", evidenceRecorded: "Evidence recorded", evidenceUnavailable: "Evidence unavailable", notApplicable: "Not applicable" };
const actor = (value) => value?.username || (value?.userId ? `User #${value.userId}` : "Unknown");

function Item({ item, generation, editable, documents, categories, busy, mutate, download, downloading, showHistory }) {
  const [applicability, setApplicability] = useState(item.applicability);
  const [reason, setReason] = useState(item.notApplicableReason || "");
  const [selected, setSelected] = useState("");
  const [validation, setValidation] = useState("");
  useEffect(() => { setApplicability(item.applicability); setReason(item.notApplicableReason || ""); setSelected(""); setValidation(""); }, [generation, item.applicability, item.notApplicableReason]);
  const evidence = item.evidence || [];
  const save = (event) => {
    event.preventDefault();
    if (applicability === "NOT_APPLICABLE" && (!reason.trim() || [...reason.trim()].length > 1000)) {
      setValidation("Explain why this item is not applicable using 1 to 1,000 characters."); return;
    }
    setValidation("");
    mutate(item, "applicability", "PUT", { applicability, ...(applicability === "NOT_APPLICABLE" ? { reason: reason.trim() } : {}) });
  };
  return <details className={styles.item} data-state={item.state}>
    <summary>
      <span className={styles.checkmark} aria-hidden="true">{item.state === "EVIDENCE_RECORDED" ? "✓" : item.state === "NOT_APPLICABLE" ? "−" : item.state === "EVIDENCE_UNAVAILABLE" ? "!" : ""}</span>
      <span className={styles.itemHeading}><span>{item.label}</span><small>{nextSteps[item.state] || "Open to review this item"}</small></span>
      <span className={styles.badge}>{states[item.state] || item.state}{evidence.length > 0 ? ` · ${evidence.length} linked` : ""}</span>
    </summary>
    <div className={styles.body}>
      <p>{item.guidance}</p>
      <p className={styles.muted}>{item.applicabilitySource === "DEFAULT" ? "Default applicability — no user decision recorded." : `Explicit decision by ${actor(item.applicabilityChangedBy)} · ${uploadTimeLabel(item.applicabilityChangedAt)}`}</p>
      {item.notApplicableReason && <p><strong>Not applicable because:</strong> {item.notApplicableReason}</p>}
      {item.lastChangedAt && <p className={styles.muted}>Last checklist change: {actor(item.lastChangedBy)} · {uploadTimeLabel(item.lastChangedAt)}</p>}
      {editable && <form onSubmit={save} className={styles.form}>
        <label>Applicability<select value={applicability} disabled={busy} onChange={(e) => setApplicability(e.target.value)}><option value="APPLICABLE">Applicable</option><option value="NOT_ASSESSED">Needs assessment</option><option value="NOT_APPLICABLE">Not applicable</option></select></label>
        {applicability === "NOT_APPLICABLE" && <label>Explanation<textarea value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} rows={3} /><small>Required, up to 1,000 characters. This replaces the current explanation.</small></label>}
        {validation && <p role="alert">{validation}</p>}
        <button disabled={busy} type="submit">Save applicability</button>
      </form>}
      <h4>Evidence</h4>
      {item.applicability === "NOT_APPLICABLE" && <p className={styles.muted}>Existing links are retained. Change applicability before adding evidence.</p>}
      {!evidence.length && <p className={styles.muted}>No evidence linked.</p>}
      <ul className={styles.evidence}>{evidence.map((doc) => <li key={doc.documentId}>
        <strong>{doc.documentName}</strong>
        <span>Version {doc.versionNumber} · {statusLabel(doc.status)} · {categories.find((c) => c.id === doc.category)?.label || doc.category || "Uncategorized"} · Document date: {doc.documentDate || "Unknown"}</span>
        <span className={styles.muted}>Linked by {doc.linkedByUsername || `User #${doc.linkedByUserId}`} · {uploadTimeLabel(doc.linkedAt)}</span>
        {doc.hasNewerVersion && <span>Newer version exists (#{doc.currentDocumentId}{doc.currentDocumentDeleted ? ", deleted" : ""}). This link keeps version {doc.versionNumber}.</span>}
        {doc.downloadEligible !== true && <span>Evidence unavailable for download.</span>}
        <div className={styles.actions}>
          <button type="button" disabled={doc.downloadEligible !== true || downloading.includes(doc.documentId)} onClick={() => download(doc.documentId)}>Download linked version</button>
          <button type="button" onClick={() => showHistory({ id: doc.documentId, documentName: doc.documentName })}>Version history</button>
          {editable && <button type="button" disabled={busy} onClick={() => { if (window.confirm("Remove this evidence link? The document and file will be kept.")) mutate(item, `evidence/${doc.documentId}`, "DELETE"); }}>Remove evidence link</button>}
        </div>
      </li>)}</ul>
      {editable && item.applicability !== "NOT_APPLICABLE" && <form className={styles.form} onSubmit={(e) => { e.preventDefault(); if (selected) mutate(item, "evidence", "POST", { documentId: Number(selected) }); }}>
        <label>Document evidence<select value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}><option value="">Select an exact document version</option>{documents.filter((doc) => !evidence.some((link) => link.documentId === doc.id)).map((doc) => <option key={doc.id} value={doc.id}>{doc.documentName} · Version {doc.versionNumber} · {statusLabel(doc.status)} · {doc.isCurrent ? "Current" : "Historical"} (#{doc.id})</option>)}</select></label>
        <button type="submit" disabled={busy || !selected}>Link evidence</button>
      </form>}
    </div>
  </details>;
}

function Panel({ projectId, authFetch, categories, refreshKey }) {
  const [data, setData] = useState(null);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentError, setDocumentError] = useState("");
  const [historical, setHistorical] = useState(false);
  const [category, setCategory] = useState("");
  const [history, setHistory] = useState(null);
  const [downloading, setDownloading] = useState([]);
  const alive = useRef(true);
  const pending = useRef(false);
  const downloads = useRef(new Map());
  const endpoint = `${BASE_URL}/api/projects/${projectId}/document-checklist`;
  useEffect(() => {
    alive.current = true;
    const requests = downloads.current;
    const focus = () => { if (!pending.current) setRevision((v) => v + 1); };
    window.addEventListener("focus", focus);
    return () => { alive.current = false; window.removeEventListener("focus", focus); requests.forEach((c) => c.abort()); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    (async () => {
      try {
        const res = await authFetch(endpoint, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load checklist."));
        const result = await res.json();
        if (!Array.isArray(result.items) || !result.summary) throw new Error("Could not load checklist.");
        if (!controller.signal.aborted) { setData(result); setGeneration((v) => v + 1); }
      } catch (err) { if (!controller.signal.aborted) { setData(null); setError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [authFetch, endpoint, revision, refreshKey]);
  useEffect(() => {
    const controller = new AbortController();
    setDocuments([]); setDocumentError("");
    if (!data?.editable || loading) return;
    const query = new URLSearchParams();
    if (!historical) query.set("currentOnly", "true");
    if (category) query.set("category", category);
    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/documents/project/${projectId}?${query}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readDocumentError(res, "Could not load project documents."));
        const result = await res.json();
        if (!Array.isArray(result)) throw new Error("Could not load project documents.");
        if (!controller.signal.aborted) setDocuments(result.filter((doc) => doc.isDeleted === false && String(doc.projectId) === String(projectId)));
      } catch (err) { if (!controller.signal.aborted) setDocumentError(err.message); }
    })();
    return () => controller.abort();
  }, [authFetch, projectId, data, loading, historical, category]);
  const mutate = async (item, path, method, body) => {
    if (pending.current || loading || !data?.editable) return;
    pending.current = true; setBusy(true); setNotice("");
    try {
      const url = `${endpoint}/${item.itemKey}/${path}${method === "DELETE" ? `?expectedRevision=${item.revision}` : ""}`;
      const res = await authFetch(url, { method, ...(method !== "DELETE" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, expectedRevision: item.revision }) } : {}) });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not update checklist."));
      if (method !== "DELETE") {
        const updated = await res.json();
        if (alive.current) setData((previous) => ({ ...previous, items: previous.items.map((value) => value.itemKey === item.itemKey ? updated : value) }));
      }
      if (alive.current) setNotice("Checklist updated.");
    } catch (err) { if (alive.current) setNotice(`${err.message} Reloading the checklist. Review the current state before trying again; your change has not been retried.`); }
    finally { pending.current = false; if (alive.current) { setBusy(false); setRevision((v) => v + 1); } }
  };
  const download = async (id) => {
    if (downloads.current.has(id)) return;
    const controller = new AbortController(); downloads.current.set(id, controller); setDownloading((v) => [...v, id]);
    try { await downloadDocument(id, authFetch, controller.signal); }
    catch (err) { if (alive.current && !controller.signal.aborted) setNotice(err.message); }
    finally { downloads.current.delete(id); if (alive.current) setDownloading((v) => v.filter((value) => value !== id)); }
  };
  return <div className={styles.panel}>
    <p className={styles.intro}>Work through each item: decide whether it applies, then link the supporting document. A checkmark means evidence is recorded, not reviewed or approved.</p>
    <button type="button" disabled={loading || busy} onClick={() => setRevision((v) => v + 1)}>Refresh checklist</button>
    {loading && <p role="status">Loading checklist…</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {data && <>
      <div className={styles.progressCard}>
        <div><strong>{data.summary.evidenceRecorded} of {Math.max(0, data.summary.totalItems - data.summary.notApplicable)} applicable or unassessed items have evidence</strong><span>{data.summary.notApplicable} marked not applicable</span></div>
        <progress aria-label="Items with evidence recorded" value={data.summary.evidenceRecorded} max={Math.max(1, data.summary.totalItems - data.summary.notApplicable)} />
        <small>Evidence coverage only. Missing evidence is not an overdue deadline; file availability is checked when downloading.</small>
      </div>
      <div className={styles.counts}>{Object.entries(counts).map(([key, label]) => <span key={key}><strong>{data.summary[key]}</strong> {label}</span>)}</div>
      <p className={styles.muted}>{data.summary.totalItems} items · {data.summary.evidenceLinks} evidence links · {data.summary.unavailableEvidenceLinks} unavailable links · Definition {data.definitionVersion}</p>
      {!data.editable && <p className={styles.muted}>Read-only. Only Admin and Project Manager can change a checklist on an active project.</p>}
      {data.editable && <div className={styles.form}>
        <label>Evidence category<select value={category} disabled={busy} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label><input type="checkbox" checked={historical} disabled={busy} onChange={(e) => setHistorical(e.target.checked)} /> Include active historical versions</label>
        <p className={styles.muted}>These filters only help find documents. Upload files below, then select evidence explicitly. Uploads remain if linking fails. To switch versions, link the new version before removing the old one; if removal fails, both links remain.</p>
        {documentError && <p role="alert">{documentError}</p>}
      </div>}
      <div className={styles.checklistToolbar}><strong>Checklist items</strong><label><input type="checkbox" checked={attentionOnly} onChange={(event) => setAttentionOnly(event.target.checked)} /> Needs attention only</label></div>
      {attentionOnly && data.items.every((item) => settled(item.state)) && <p className={styles.muted}>No items need attention. Turn off the filter to review recorded evidence and not-applicable decisions.</p>}
      {[...data.items].filter((item) => !attentionOnly || !settled(item.state)).sort((a, b) => a.order - b.order).map((item) => <Item key={item.itemKey} generation={generation} item={item} editable={data.editable} documents={documents} categories={categories} busy={busy || loading} mutate={mutate} download={download} downloading={downloading} showHistory={setHistory} />)}
      <p className={styles.muted}>Attribution shows the latest decisions and current links, not a full change history. Earlier explanations are replaced.</p>
    </>}
    {history && <DocumentVersions key={history.id} document={history} authFetch={authFetch} categories={categories} canEdit={false} canDelete={false} onDownload={download} downloading={downloading} revision={revision + refreshKey} onChanged={() => setRevision((v) => v + 1)} onClose={() => setHistory(null)} />}
  </div>;
}
export default function ProjectDocumentChecklist(props) {
  const [open, setOpen] = useState(false);
  return <details className={styles.section} onToggle={(e) => { if (e.target === e.currentTarget) setOpen(e.currentTarget.open); }}>
    <summary>Project document checklist</summary>
    {open && <Panel key={props.projectId} {...props} />}
  </details>;
}

