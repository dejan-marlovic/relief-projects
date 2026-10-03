import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { ProjectContext } from "../../context/ProjectContext";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../utils/http";
import { ReadState } from "../Results/ResultViews";
import { label, useTravelRead } from "./travelApi";
import styles from "./Travel.module.scss";

const states = ["PLANNED", "ALL", "DRAFT", "SUBMITTED", "APPROVED", "RETURNED", "CANCELLED"];
const fields = ["from", "to", "projectId", "travellerEmployeeId", "state"];
const filtersFrom = params => Object.fromEntries(fields.map(key => [key, params.get(key) || (key === "state" ? "PLANNED" : "")]));
export function scheduleQuery(filters, page = 0, travellers = false) {
  return new URLSearchParams({ ...Object.fromEntries(fields.filter(key => !(travellers && key === "travellerEmployeeId")).filter(key => filters[key]).map(key => [key, filters[key]])), page, size: 50 }).toString();
}
export function windowError(filters) {
  if (!!filters.from !== !!filters.to) return "Choose both window dates, or leave both blank for the default window.";
  if (!filters.from) return "";
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1000-01-01" && value <= "9999-12-31" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(filters.from) || !valid(filters.to)) return "Enter valid dates between years 1000 and 9999.";
  const days = (Date.parse(filters.to) - Date.parse(filters.from)) / 86400000 + 1;
  return days < 1 ? "The end date must be on or after the start date." : days > 366 ? "Choose a window of at most 366 inclusive days." : "";
}
function Pages({ data, loading, onPage, name }) {
  if (!data) return null;
  const start = data.content.length ? data.page * data.size + 1 : 0;
  return <div className={styles.actions}>
    <button disabled={loading || data.page === 0} onClick={() => onPage(data.page - 1)}>Previous {name}</button>
    <span>{start ? `Showing ${start}–${start + data.content.length - 1} of ${data.totalElements} matching ${name}` : `${data.totalElements} matching ${name}`} · Page {data.totalPages ? data.page + 1 : 0} of {data.totalPages}</span>
    <button disabled={loading || !data.hasNext} onClick={() => onPage(data.page + 1)}>Next {name}</button>
    {!data.content.length && data.page > 0 && <button onClick={() => onPage(0)}>Return to first {name} page</button>}
  </div>;
}
export function Schedule({ authFetch }) {
  const { setSelectedProjectId } = useContext(ProjectContext);
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
  const navigate = useNavigate(), location = useLocation();
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const filters = useMemo(() => filtersFrom(new URLSearchParams(search)), [search]);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const [draft, setDraft] = useState(filters), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), [lookupPage, setLookupPage] = useState(0), [lookupOpen, setLookupOpen] = useState(false);
  useEffect(() => { setDraft(filters); setError(""); setLookupPage(0); }, [filters]);
  useEffect(() => {
    const update = () => { if (document.visibilityState !== "hidden") setRefresh(n => n + 1); };
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const invalid = windowError(filters);
  const result = useTravelRead(authFetch, invalid ? null : `${BASE_URL}/api/travel-schedule?${scheduleQuery(filters, page)}`, refresh);
  const projects = useTravelRead(authFetch, `${BASE_URL}/api/projects/ids-names`, refresh);
  const people = useTravelRead(authFetch, lookupOpen && !invalid ? `${BASE_URL}/api/travel-schedule/travellers?${scheduleQuery(filters, lookupPage, true)}` : null, refresh);
  const data = result.data;
  const change = (key, value) => setDraft(f => ({ ...f, [key]: value }));
  const apply = event => { event.preventDefault(); const message = windowError(draft); setError(message); if (!message) setParams(scheduleQuery(draft)); };
  const open = row => {
    if (!confirmDiscardUnsavedChanges()) return;
    setSelectedProjectId(String(row.project.id));
    navigate(`/travel?projectId=${row.project.id}&requestId=${row.id}`, { state: { scheduleUrl: `${location.pathname}${location.search}` } });
  };
  return <section className={styles.page}>
    <h2>Travel schedule</h2>
    <p>Travel across projects. This view is independent of the project selected in the header.</p>
    <p className={styles.muted}>Review planned trips that intersect your date window. Approval is separate from travel actually taking place. Open a request to manage its plan, decisions and post-trip report.</p>
    <form onSubmit={apply}>
      <div className={styles.filters}>
        <label>Window from<input type="date" min="1000-01-01" max="9999-12-31" value={draft.from} onChange={e => change("from", e.target.value)} /></label>
        <label>Window through<input type="date" min="1000-01-01" max="9999-12-31" value={draft.to} onChange={e => change("to", e.target.value)} /></label>
        <label>Schedule project<select value={draft.projectId} onChange={e => change("projectId", e.target.value)}><option value="">All active projects</option>{draft.projectId && !projects.data?.some(p => String(p.id) === draft.projectId) && <option value={draft.projectId}>Project #{draft.projectId} (not in current lookup)</option>}{projects.data?.map(p => <option key={p.id} value={p.id}>{p.projectName || p.name}</option>)}</select></label>
        <label>Plan state<select value={draft.state} onChange={e => change("state", e.target.value)}>{states.map(state => <option key={state} value={state}>{state === "PLANNED" ? "Submitted and approved" : state === "ALL" ? "All states" : label(state)}</option>)}</select></label>
        <label>Traveller employee ID<input type="number" min="1" step="1" value={draft.travellerEmployeeId} onChange={e => change("travellerEmployeeId", e.target.value)} /></label>
      </div>
      <p className={styles.muted}>Leave both dates blank for the default window: 30 days before through 90 days after today in Stockholm. Custom windows can cover up to 366 days.</p>
      {(error || invalid) && <p role="alert">{error || invalid}</p>}
      <div className={styles.actions}><button type="submit">Apply schedule filters</button><button type="button" onClick={() => { setParams({}); setDraft(filtersFrom(new URLSearchParams())); setError(""); }}>Reset schedule filters</button></div>
    </form>
    <ReadState state={projects} />
    <button aria-expanded={lookupOpen} onClick={() => setLookupOpen(v => !v)}>Find a traveller by name</button>
    {lookupOpen && <section className={styles.panel} aria-label="Traveller lookup"><p>Travellers represented in the applied date, project and state filters. Selecting one fills the employee ID; apply the filters to use it. Your selected ID is kept even if it is outside this lookup.</p><ReadState state={people} /><ul className={styles.list}>{people.data?.content.map(person => <li key={person.employeeId}>{person.displayName} · Employee #{person.employeeId}{!person.active && " · Inactive traveller"} <button onClick={() => change("travellerEmployeeId", String(person.employeeId))}>Select employee #{person.employeeId}</button></li>)}</ul>{people.data && !people.data.content.length && <p>No travellers on this lookup page.</p>}<Pages data={people.data} loading={people.loading} onPage={setLookupPage} name="travellers" /></section>}
    <div className={styles.actions}><button onClick={() => setRefresh(n => n + 1)}>Refresh schedule</button></div>
    <ReadState state={result} />
    {data && <>
      <p><strong>{data.from} through {data.to}</strong> · {data.businessTimezone}{data.rangeDefaulted && " · Default window"}</p>
      <p className={styles.muted}>Observed {data.observedAt}. Other plans may change between pages. Overlaps count other submitted or approved plans, including outside these filters; they are warnings, not reservations. Zero overlaps does not guarantee availability.</p>
      <ul className={styles.list}>{data.content.map(row => <li key={row.id}>
        <div className={styles.heading}><h3>{row.purpose}</h3><button disabled={result.loading} onClick={() => open(row)}>Open travel request #{row.id}</button></div>
        <p>{row.project.name} · Project #{row.project.id}</p>
        <span className={`${styles.statusBadge} ${styles[`status${row.state}`] || ""}`}>{row.state}</span>
        <p>{row.traveller.displayName} · {row.destination}{!row.traveller.active && " · Inactive traveller"}</p>
        <p>Planned: {row.departureDate} through {row.returnDate}</p>
        <p>{row.hasCurrentAuthorization ? "Current travel approval recorded" : "No current travel approval"} · Overlapping plans: {row.overlapCount}</p>
        <p>Post-trip report: <span className={styles.statusBadge}>{row.reportSummary ? row.reportSummary.isDeleted ? "Report deleted (retained history)" : label(row.reportSummary.state) : "No report recorded"}</span>{row.reportSummary && !row.reportSummary.isDeleted && row.reportSummary.outcome && ` · ${label(row.reportSummary.outcome)}`}</p>
        {row.issues?.map(issue => <p key={issue.code} className={styles.muted}>{issue.message}</p>)}
      </li>)}</ul>
      {!data.content.length && <p>{data.totalElements ? "No plans on this page. Return to the first page to see matching plans." : "No matching planned travel in this window"}</p>}
      {!data.allMatchesIncluded && data.totalElements > 0 && <p className={styles.muted}>This page does not contain the complete matching schedule.</p>}
      <Pages data={data} loading={result.loading} onPage={next => setParams(scheduleQuery(filters, next))} name="plans" />
    </>}
  </section>;
}
export default function TravelSchedule() {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  return <Schedule authFetch={authFetch} />;
}
