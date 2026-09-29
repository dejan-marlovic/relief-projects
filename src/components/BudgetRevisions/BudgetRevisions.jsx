import BudgetExecution from "../BudgetExecution/BudgetExecution";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { useAuth } from "../../context/AuthContext";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import { stockholmToday } from "../../utils/fundingReceipts";
import { downloadDocument } from "../../utils/documentDownload";
import { budgetOptionLabel } from "../../utils/budgetDisplay";
import styles from "../ProjectCloseout/ProjectCloseout.module.scss";

async function read(response) {
  const data = await safeReadJson(response);
  if (!response.ok) throw new Error([...new Set([data?.message, ...Object.values(data?.fieldErrors || {})].filter(Boolean))].join(" ") || `Request failed (${response.status}).`);
  if (!data) throw new Error("The response could not be read. Refresh before trying again.");
  return data;
}
const words = value => String(value || "").replaceAll("_", " ").toLowerCase();

export function RevisionPanel({ budget, onChanged, disabled = false }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { hasAnyRole, hasRole } = useAuth();
  const editor = hasAnyRole("ADMIN", "FINANCE"), reviewer = hasAnyRole("ADMIN", "APPROVER"), admin = hasRole("ADMIN");
  const [data, setData] = useState(null), [history, setHistory] = useState(null), [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false);
  const [documents, setDocuments] = useState([]), [donors, setDonors] = useState([]), [optionsError, setOptionsError] = useState("");
  const pending = useRef(false);
  useUnsavedChange(`budget-revisions-${budget.id}`, Boolean(form));
  const endpoint = `${BASE_URL}/api/budgets/${budget.id}/revisions`;
  useEffect(() => {
    const listener = () => setRefresh(n => n + 1);
    window.addEventListener("focus", listener);
    window.addEventListener("budget-revisions-changed", listener);
    return () => { window.removeEventListener("focus", listener); window.removeEventListener("budget-revisions-changed", listener); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setHistory(null);
    (async () => {
      const next = await read(await authFetch(endpoint, { signal: controller.signal, cache: "no-store" }));
      if (!next.budget || !Array.isArray(next.members)) throw new Error("Invalid revision response.");
      if (!controller.signal.aborted) setData(next);
      const events = next.family ? await read(await authFetch(`${BASE_URL}/api/budget-revision-families/${next.family.id}/decisions?page=${page}&size=20`, { signal: controller.signal, cache: "no-store" })) : { content: [], totalPages: 0, totalElements: 0 };
      if (!Array.isArray(events.content)) throw new Error("Decision history could not be read.");
      if (!controller.signal.aborted) setHistory(events);
    })().catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authFetch, endpoint, refresh, page, budget.contentRevision]);
  const needsOptions = form && ["decision", "correct", "add"].includes(form.action);
  useEffect(() => {
    if (!needsOptions) return undefined;
    const controller = new AbortController(); setOptionsError(""); setDocuments([]); setDonors([]);
    Promise.all([
      authFetch(`${BASE_URL}/api/documents/project/${budget.projectId}`, { signal: controller.signal }).then(read),
      authFetch(`${BASE_URL}/api/organizations/active`, { signal: controller.signal }).then(read),
    ]).then(([docs, orgs]) => {
      if (!Array.isArray(docs) || !Array.isArray(orgs)) throw new Error("Evidence or donors unavailable.");
      if (!controller.signal.aborted) { setDocuments(docs.filter(d => d.isDeleted !== true && String(d.projectId) === String(budget.projectId))); setDonors(orgs); }
    }).catch(err => { if (!controller.signal.aborted) setOptionsError(err.message); });
    return () => controller.abort();
  }, [authFetch, budget.projectId, needsOptions]);
  const family = data?.family, current = data?.budget || budget;
  const members = data?.members || [], decisions = data?.donorDecisions || [];
  const approved = current.lifecycleStatus === "APPROVED";
  const unfinished = members.some(m => m.isDeleted !== true && ["DRAFT", "RETURNED", "SUBMITTED"].includes(m.lifecycleStatus));
  const highestApproved = members.filter(m => m.isDeleted !== true && m.lifecycleStatus === "APPROVED").at(-1);
  const open = (action, decision = null) => {
    setError(""); setBlocked(false);
    setForm({ action, decision, expectedFamilyRevision: family?.revision, expectedSourceRevision: current.contentRevision,
      budgetName: "", reason: "", kind: decision?.kind || "APPROVED", donorOrganizationId: "", decisionDate: stockholmToday(), reference: "", explanation: "", documentIds: [], donorDecisionId: "", confirmed: false });
  };
  const change = (name, value) => setForm(old => ({ ...old, [name]: value }));
  const stale = form && (form.action === "copy" ? form.expectedSourceRevision !== current.contentRevision : form.expectedFamilyRevision !== family?.revision);
  const submit = async event => {
    event.preventDefault();
    if (pending.current || disabled || blocked || stale || loading || !form) return;
    let path, method = "POST", body;
    const replacement = { kind: form.kind, donorOrganizationId: Number(form.donorOrganizationId), decisionDate: form.decisionDate, reference: form.reference.trim() || null, explanation: form.explanation.trim(), documentIds: form.documentIds.map(Number) };
    if (form.action === "copy") {
      path = `/api/budgets/${budget.id}/revisions`;
      body = { expectedSourceRevision: form.expectedSourceRevision, budgetName: form.budgetName.trim(), reason: form.reason.trim() };
      if (form.confirmed) body.confirmedLocalCurrencyId = current.localCurrencyId;
    } else {
      body = { expectedFamilyRevision: form.expectedFamilyRevision };
      if (form.action === "decision") { path = `/api/budgets/${budget.id}/donor-decisions`; Object.assign(body, replacement); }
      if (form.action === "correct") { path = `/api/budget-donor-decisions/${form.decision.id}/corrections`; Object.assign(body, { reason: form.reason.trim(), replacement }); }
      if (form.action === "void") { path = `/api/budget-donor-decisions/${form.decision.id}/void`; body.reason = form.reason.trim(); }
      if (["add", "remove"].includes(form.action)) { path = `/api/budget-donor-decisions/${form.decision.id}/documents${form.action === "remove" ? "/remove" : ""}`; Object.assign(body, { reason: form.reason.trim(), documentIds: form.documentIds.map(Number) }); }
      if (form.action === "select") { path = `/api/budget-revision-families/${family.id}/current-plan`; method = "PUT"; Object.assign(body, { budgetId: budget.id, donorDecisionId: Number(form.donorDecisionId), reason: form.reason.trim() }); }
    }
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await read(await authFetch(`${BASE_URL}${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      if (!result.family || !result.budget) throw new Error("Uncertain result. Review state and history.");
      setForm(null); setBlocked(false); onChanged?.(result); window.dispatchEvent(new Event("budget-revisions-changed"));
    } catch (err) { setBlocked(true); setError(`${err.message} Your draft is retained. Review refreshed state and history before retrying; no command is retried automatically.`); }
    finally { pending.current = false; setBusy(false); setPage(0); setRefresh(n => n + 1); }
  };
  const evidenceChoices = form?.action === "remove" ? (form.decision.currentEvidence || []).map(d => ({ id: d.documentId, documentName: d.capturedName })) : documents;
  const decisionFields = form && ["decision", "correct"].includes(form.action);
  return <div className={styles.panel}>
    <p className={styles.hint}>Selecting a current plan changes planning displays. Financial execution requires separate activation with shared cost ceilings; existing awards and commitments retain their original references.</p>
    <button type="button" disabled={busy || loading} onClick={() => { setError(""); setRefresh(n => n + 1); }}>Refresh revisions and history</button>
    {loading && <p role="status">Loading revisions…</p>}{error && <p role="alert">{error}</p>}
    {data && <>
      {family ? <><p>Current plan: <strong>{family.currentPlanBudgetId ? `Budget #${family.currentPlanBudgetId}` : "Not selected — family planning total unavailable"}</strong></p><p>Original financial budget: <strong>Budget #{family.financialBudgetId}</strong> · Latest revision: Budget #{family.latestRevisionBudgetId}</p>
        <ul>{members.map(m => <li key={m.id}>{budgetOptionLabel(m)} · Internal status: {words(m.lifecycleStatus)}{m.isDeleted ? " · Deleted" : ""}{m.id === family.currentPlanBudgetId ? " · Current plan" : ""}</li>)}</ul>
      </> : <p>Standalone budget. Creating a revision registers it as the original financial basis. No historical approval or family relationship is inferred.</p>}
      {(data.issues || []).map((issue, i) => <p key={i} className={styles.hint}>{issue.code === "PLANNING_FINANCIAL_BASIS_DIFFER" ? "The current plan differs from the original budget. Financial execution below determines new funding eligibility; existing references are retained." : issue.message}</p>)}
      {family && <BudgetExecution familyId={family.id} budgetId={budget.id} disabled={disabled || Boolean(form)} refreshKey={refresh} />}
      {!form && <div className={styles.actions}>
        {editor && approved && !unfinished && (!highestApproved || highestApproved.id === budget.id) && <button disabled={disabled || loading} onClick={() => open("copy")}>Create planning revision</button>}
        {editor && family && approved && <button disabled={disabled || loading} onClick={() => open("decision")}>Record donor decision / addendum</button>}
        {reviewer && family && approved && <button disabled={disabled || loading} onClick={() => open("select")}>Select as current plan</button>}
      </div>}
      {form && <form className={styles.form} onSubmit={submit}><h4>{({ copy: "Create planning revision", decision: "Record one donor’s decision", correct: "Correct recorded decision", void: "Void recorded decision", select: "Select current plan", add: "Add exact-version evidence", remove: "Remove selected evidence" })[form.action]}</h4>
        <fieldset disabled={busy || disabled}>
          {form.action === "copy" && <><label>New budget name<input required maxLength={150} value={form.budgetName} onChange={e => change("budgetName", e.target.value)} /></label><label><input type="checkbox" checked={form.confirmed} onChange={e => change("confirmed", e.target.checked)} /> I confirm the copied limit is in local currency #{current.localCurrencyId}. Required for legacy unconfirmed limits; this does not change the original.</label></>}
          {decisionFields && <><p className={styles.hint}>This records one selected donor’s decision, not approval by all financiers. Corrections do not inherit evidence.</p><label>Decision<select value={form.kind} onChange={e => change("kind", e.target.value)}><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ADDENDUM_RECORDED">Addendum recorded</option></select></label><label>Governing donor<select required value={form.donorOrganizationId} onChange={e => change("donorOrganizationId", e.target.value)}><option value="">Select donor</option>{donors.map(d => <option key={d.id} value={d.id}>{d.organizationName || d.name}</option>)}</select></label><label>Decision date<input required type="date" min="1000-01-01" max={stockholmToday()} value={form.decisionDate} onChange={e => change("decisionDate", e.target.value)} /></label><label>Reference (optional)<input maxLength={150} value={form.reference} onChange={e => change("reference", e.target.value)} /></label><label>Explanation<textarea required maxLength={1000} value={form.explanation} onChange={e => change("explanation", e.target.value)} /></label></>}
          {(decisionFields || ["add", "remove"].includes(form.action)) && <fieldset><legend>Exact document versions</legend>{optionsError && <p role="alert">{optionsError}</p>}{evidenceChoices.map(d => <label key={d.id}><input type="checkbox" checked={form.documentIds.includes(String(d.id))} onChange={e => change("documentIds", e.target.checked ? [...form.documentIds, String(d.id)] : form.documentIds.filter(id => id !== String(d.id)))} />{d.documentName} · Document #{d.id}{d.versionNumber ? ` · Version ${d.versionNumber}` : ""}</label>)}{!form.documentIds.length && <p className={styles.hint}>No evidence selected. A decision without evidence is an unverified recorded assertion.</p>}</fieldset>}
          {form.action === "select" && <><p>Select a nonvoid approval for this budget. This changes planning displays only.</p><label>Governing approval<select required value={form.donorDecisionId} onChange={e => change("donorDecisionId", e.target.value)}><option value="">Select approval</option>{decisions.filter(d => d.budgetId === budget.id && d.kind === "APPROVED" && !d.voided).map(d => <option key={d.id} value={d.id}>Decision #{d.id} · {d.details?.donor?.capturedName} · {d.details?.decisionDate}</option>)}</select></label></>}
          {form.action !== "decision" && <label>Reason<textarea required maxLength={1000} value={form.reason} onChange={e => change("reason", e.target.value)} /></label>}
          {(blocked || stale) && <p role="alert">Review the refreshed family and retained history. Cancel if your command already succeeded. To retry deliberately, confirm review below.</p>}
          {(blocked || stale) && <button type="button" disabled={loading || !history} onClick={() => { setForm(f => ({ ...f, expectedFamilyRevision: family?.revision, expectedSourceRevision: current.contentRevision })); setBlocked(false); setError(""); }}>I reviewed state and history; use current revision</button>}
          <div className={styles.actions}><button type="submit" disabled={blocked || stale || loading || Boolean(optionsError && needsOptions)}>Save {form.action === "copy" ? "revision" : "decision"}</button><button type="button" onClick={() => { setForm(null); setBlocked(false); setError(""); }}>Cancel</button></div>
        </fieldset></form>}
      {family && <><h4>Recorded donor decisions and addenda</h4>{!decisions.length && <p>No donor decisions recorded.</p>}{decisions.map(d => <article className={styles.card} key={d.id}><strong>Decision #{d.id} · {words(d.kind)} · Budget #{d.budgetId}{d.voided ? " · Voided" : ""}</strong><p>{d.details?.donor?.capturedName} · {d.details?.decisionDate} · Reference: {d.details?.reference || "None"}</p><p>{d.details?.explanation}</p><p className={styles.hint}>Recorded {d.occurredAt} by {d.actor?.username}{d.details?.correctionOfDecisionId ? ` · Corrects decision #${d.details.correctionOfDecisionId}` : ""}</p>{(d.issues || []).map((issue, i) => <p key={i}>{issue.message}</p>)}{(d.currentEvidence || []).map(doc => <p key={doc.documentId}>{doc.capturedName} · Document #{doc.documentId} <button disabled={!doc.downloadEligible || busy} onClick={async () => { try { await downloadDocument(doc.documentId, authFetch); } catch (err) { setError(err.message); } }}>{doc.downloadEligible ? "Download" : "Unavailable"}</button></p>)}{!d.voided && !form && <div className={styles.actions}>{editor && <><button disabled={disabled || loading} onClick={() => open("add", d)}>Add evidence #{d.id}</button><button disabled={disabled || loading || !d.currentEvidence?.length} onClick={() => open("remove", d)}>Remove evidence #{d.id}</button></>}{admin && <><button disabled={disabled || loading} onClick={() => open("correct", d)}>Correct decision #{d.id}</button><button disabled={disabled || loading} onClick={() => open("void", d)}>Void decision #{d.id}</button></>}</div>}</article>)}
        <h4>Retained family history</h4>{history?.content.map(event => <details className={styles.card} key={event.id}><summary>{words(event.kind)} · Budget #{event.budgetId} · Revision {event.revision} · {event.occurredAt} · {event.actor?.username}</summary><HistoryDetails details={event.details} /></details>)}<div className={styles.actions}><button disabled={loading || !page} onClick={() => setPage(p => p - 1)}>Previous decisions</button><span>Page {history?.totalPages ? page + 1 : 0} of {history?.totalPages ?? "…"}</span><button disabled={loading || !history || page + 1 >= history.totalPages} onClick={() => setPage(p => p + 1)}>Next decisions</button></div>
      </>}
    </>}
  </div>;
}
function HistoryDetails({ details }) {
  if (details == null) return <span>Not set</span>;
  if (typeof details !== "object") return <span>{String(details)}</span>;
  if (Array.isArray(details)) return <ul>{details.map((entry, i) => <li key={i}><HistoryDetails details={entry} /></li>)}</ul>;
  return <dl className={styles.fields}>{Object.entries(details).filter(([key]) => key !== "version").map(([key, value]) => <React.Fragment key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd><HistoryDetails details={value} /></dd></React.Fragment>)}</dl>;
}
export default function BudgetRevisions(props) {
  const [opened, setOpened] = useState(false);
  return <details className={styles.section} onToggle={e => { if (e.currentTarget.open) setOpened(true); }}><summary>Revisions & donor decisions · Budget #{props.budget.id}</summary>{opened && <RevisionPanel {...props} />}</details>;
}
