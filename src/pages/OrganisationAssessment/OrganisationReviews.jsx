import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { useManagementRead } from "../Management/managementApi";
import { Pagination, ReadState } from "../Results/ResultViews";
import { decisionLabel } from "./assessmentApi";
import styles from "../Travel/Travel.module.scss";

export default function OrganisationReviews({ organizationId, authFetch }) {
  const [page, setPage] = useState(0), [deleted, setDeleted] = useState(false), [refresh, setRefresh] = useState(0);
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
  const state = useManagementRead(authFetch, `${BASE_URL}/api/organizations/${organizationId}/assessments?page=${page}&size=20&includeDeleted=${deleted}`, refresh);
  return <section className={styles.page}><h3>Assessments across projects and roles</h3><p>Each outcome belongs to the stated project relationship. These reviews do not establish organisation-wide approval or verified due diligence.</p>
    <button onClick={() => setRefresh(n => n + 1)}>Refresh organisation reviews</button><label><input type="checkbox" checked={deleted} onChange={e => { setDeleted(e.target.checked); setPage(0); }} />Include deleted assessments</label><ReadState state={state} />
    {state.data?.content.map(row => <article className={styles.panel} key={row.scope.relationshipId}><h4>{row.scope.projectName} · {row.scope.organizationStatusLabel}</h4><p>Relationship #{row.scope.relationshipId} · {row.state}{row.deleted ? " · Assessment deleted" : ""}{!row.scopeAvailable ? " · Scope unavailable" : ""}{row.reviewRequired ? " · Review required" : ""}</p><p>{decisionLabel(row.currentDecision?.decision)}</p>{row.currentDecision?.basis?.context && <p>At decision: {row.currentDecision.basis.context.projectName} · {row.currentDecision.basis.context.organizationName} · {row.currentDecision.basis.context.organizationStatusLabel}</p>}<Link to={`/organisation-assessments/${row.scope.relationshipId}`} onClick={e => { if (!confirmDiscardUnsavedChanges()) e.preventDefault(); }}>Open relationship assessment #{row.scope.relationshipId}</Link></article>)}
    {state.data && !state.data.content.length && <p>No recorded assessments on this page.</p>}<Pagination data={state.data} page={page} setPage={setPage} label="organisation reviews" disabled={state.loading} />
  </section>;
}
