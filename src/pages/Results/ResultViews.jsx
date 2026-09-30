import React from "react";
import { showValue, targetDirection, words } from "./indicatorApi";
import { uploadTimeLabel } from "../../utils/documentMetadata";
import styles from "./Results.module.scss";

export function Issues({ issues = [] }) { return issues.map((issue, i) => <p className={styles.muted} key={i}>{issue.message}</p>); }
export function ReadState({ state }) { return <>{state.loading && <p role="status">Loading…</p>}{state.error && <p role="alert">{state.error} Use Refresh to try again.</p>}</>; }
export function Pagination({ data, page, setPage, label, disabled }) {
  return <div className={styles.actions}><button type="button" disabled={disabled || !page} onClick={() => setPage(n => n - 1)}>Previous {label}</button><span>{data?.totalElements ?? "…"} entries · Page {data?.totalPages ? page + 1 : 0} of {data?.totalPages ?? "…"}</span><button type="button" disabled={disabled || !data || page + 1 >= data.totalPages} onClick={() => setPage(n => n + 1)}>Next {label}</button></div>;
}
export function ResultSummary({ summary, unit, direction }) {
  if (!summary) return <p>Latest report unavailable.</p>;
  const latest = summary.latestResult;
  return <section className={styles.summary} aria-label="Latest reported result">
    <h4>Latest user-reported result</h4>
    {summary.inactive && <p>Inactive indicator or project · historical summary</p>}
    {!latest ? <p>No effective report. This does not mean zero.</p> : <>
      <p><strong>{showValue(latest.value)} {latest.basis?.unit || unit}</strong> · Through {latest.asOfDate}</p>
      <p>Recorded target: {targetDirection(latest.basis?.direction || direction)} {showValue(summary.recordedTargetValue ?? latest.basis?.targetValue)} {latest.basis?.unit || unit}</p>
      {summary.comparisonStatus === "TARGET_CHANGED" ? <p role="note">Target changed. Current target: {showValue(summary.currentTargetValue)} {unit}. This report keeps its earlier target; comparison with the current target is unavailable. Recorded target: {summary.recordedBasisTargetMet == null ? "comparison unavailable" : summary.recordedBasisTargetMet ? "met numerically" : "not met numerically"}.</p>
        : <p>{summary.reportedTargetMet == null ? "Target comparison unavailable." : summary.reportedTargetMet ? "Reported value meets the numeric target." : "Reported value has not met the numeric target."}</p>}
    </>}
    <p className={styles.muted}>Latest by reporting date across all effective reports, regardless of filters or pages. Reports are not added together. Numeric comparison is not verification.</p>
  </section>;
}
export function MeasurementBasis({ basis }) {
  if (!basis || basis.version !== 1) return <p>Recorded measurement basis unavailable or unsupported.</p>;
  return <dl className={styles.snapshot}>
    <dt>Name at reporting</dt><dd>{basis.name}</dd><dt>Definition</dt><dd>{basis.definition}</dd>
    <dt>Type / unit</dt><dd>{words(basis.measurementType)} · {basis.unit}</dd>
    <dt>Reporting window</dt><dd>{basis.periodStart} through {basis.periodEnd}, inclusive</dd>
    <dt>Baseline</dt><dd>{basis.baselineKnown ? `${showValue(basis.baselineValue)} ${basis.unit} · ${basis.baselineDate}` : "Unknown"}</dd>
    <dt>Recorded target</dt><dd>{targetDirection(basis.direction)} {showValue(basis.targetValue)} {basis.unit} · Target revision {basis.targetRevision}</dd>
  </dl>;
}
export function Attribution({ at, actor }) { return <span>{uploadTimeLabel(at)} · {actor?.username || "Unknown actor"}</span>; }
export function HistorySnapshot({ value }) {
  if (value == null) return <span>Not set</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (Array.isArray(value)) return value.length ? <ul>{value.map((row, i) => <li key={i}><HistorySnapshot value={row} /></li>)}</ul> : <span>None</span>;
  return <dl className={styles.snapshot}>{Object.entries(value).filter(([key]) => key !== "version").map(([key, item]) => <React.Fragment key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd><HistorySnapshot value={item} /></dd></React.Fragment>)}</dl>;
}
