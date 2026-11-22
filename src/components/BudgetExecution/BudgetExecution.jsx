import GuidanceNote from "../GuidanceNote/GuidanceNote";
import ActionButton from "../ActionButton/ActionButton";
import { budgetOptionLabel } from "../../utils/budgetDisplay";
import useRefreshLoading from "../../hooks/useRefreshLoading";
import useAutomaticRefresh from "../../hooks/useAutomaticRefresh";
import ScrollToForm from "../ScrollToForm/ScrollToForm";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readExecution, executionChanged, exactAmount } from "../../utils/budgetExecution";
import useFinancialRefresh from "../../hooks/useFinancialRefresh";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import styles from "../ProjectCloseout/ProjectCloseout.module.scss";

export function CapacityBasis({ rows = [] }) {
  return <div>{rows.map(row => <div className={styles.card} key={row.bucketId}>
    <strong>Cost bucket #{row.bucketId} · {row.costDescription || row.name || "Name unavailable"}</strong>
    <dl className={styles.fields}><dt>Ceiling</dt><dd>{exactAmount(row.cap)}</dd><dt>Retained obligations</dt><dd>{exactAmount(row.obligations)}</dd><dt>Uncommitted planned capacity</dt><dd>{exactAmount(row.remaining)}</dd></dl>
  </div>)}</div>;
}

export default function BudgetExecution({ familyId, budgetId, budgets = [], disabled = false, refreshKey }) {
  const budgetReference = id => { const budget = budgets.find(item => String(item.id) === String(id)); return budget ? budgetOptionLabel(budget) : `Budget #${id} · Name unavailable`; };
  const navigate = useNavigate(), authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const eventRevision = useFinancialRefresh();
  const [tick, setTick] = useState(0), [data, setData] = useState(null), [loading, setLoading, initialLoading] = useRefreshLoading(true, familyId);
  const [preview, setPreview] = useState(null), [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false);
  const pending = useRef(false);
  const endpoint = `${BASE_URL}/api/budget-revision-families/${familyId}`;
  useUnsavedChange(`execution-${familyId}-${budgetId}`, Boolean(preview));
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    authFetch(`${endpoint}/execution`, { signal: controller.signal, cache: "no-store" }).then(readExecution).then(value => {
      if (!value.executionStatus || !value.eligibility) throw new Error("Execution status unavailable.");
      if (!controller.signal.aborted) setData(value);
    }).catch(err => { if (!controller.signal.aborted) { setData(null); setError(err.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, authFetch, tick, eventRevision, refreshKey, setLoading]);
  const getPreview = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const value = await readExecution(await authFetch(`${endpoint}/execution-candidates/${budgetId}`, { cache: "no-store" }));
      if (!Array.isArray(value.blockingIssues) || !value.eligibility) throw new Error("Activation preview unavailable.");
      setPreview(value); setBlocked(false);
    } catch (err) { setError(err.message); setBlocked(true); }
    finally { pending.current = false; setBusy(false); }
  };
  const stale = preview && data && (preview.expectedFamilyRevision !== data.familyRevision || preview.expectedExecutionRevision !== data.executionRevision);
  const confirm = async event => {
    event.preventDefault();
    if (pending.current || loading || !data || blocked || stale || disabled || !preview?.eligibility.canActivate || !reason.trim()) return;
    const { expectedFamilyRevision, expectedExecutionRevision, expectedBudgetRevision, donorDecisionId } = preview;
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await readExecution(await authFetch(`${endpoint}/execution-activations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedFamilyRevision, expectedExecutionRevision, expectedBudgetRevision, donorDecisionId, budgetId, reason: reason.trim() }) }));
      if (!result.executionStatus) throw new Error("Activation result is uncertain.");
      setPreview(null); setReason(""); executionChanged();
    } catch (err) { setBlocked(true); setError(`${err.message} Review refreshed execution and retained family history. Your reason is retained; no automatic retry. Request a fresh preview only if you intend to try again.`); executionChanged(); }
    finally { pending.current = false; setBusy(false); setTick(n => n + 1); }
  };
  useAutomaticRefresh(() => setTick(v => v + 1), loading || busy || !!preview || !!reason);
  return <section className={styles.card} aria-label="Financial execution">
    <h4>Financial execution</h4>
    <GuidanceNote className={styles.hint}>Activation applies one set of shared cost ceilings. Existing funding and commitments keep their original references. Uncommitted planned capacity is not available cash or funding.</GuidanceNote>
    {(error || blocked) && <ActionButton disabled={loading || busy} onClick={() => setTick(n => n + 1)}>Retry execution</ActionButton>}
    {initialLoading && <p role="status">Loading execution…</p>}{error && <p role="alert">{error}</p>}
    {data && <><dl className={styles.fields}><dt>Status</dt><dd>{data.executionStatus.replaceAll("_", " ")}</dd><dt>Origin budget</dt><dd>{budgetReference(data.originBudgetId)}</dd><dt>Current plan</dt><dd>{data.currentPlanBudgetId == null ? "Not selected" : budgetReference(data.currentPlanBudgetId)}</dd><dt>Executable budget</dt><dd>{data.executableBudgetId == null ? "Not activated; original-budget rules apply" : budgetReference(data.executableBudgetId)}</dd><dt>Currency</dt><dd>{data.currency?.name || "Unknown"} {data.currency?.id != null && `(#${data.currency.id})`}</dd><dt>Coverage</dt><dd>{data.coverage?.capacity?.replaceAll("_", " ") || "Unavailable"}</dd><dt>Retained obligations</dt><dd>{exactAmount(data.obligations)}</dd><dt>Uncommitted planned capacity</dt><dd>{exactAmount(data.uncommittedPlannedCapacity)}</dd></dl>
      {data.executionStatus === "SUSPENDED" && <p role="alert">Execution suspended. New or increased commitments need explicit reaffirmation with valid donor approval. Retained history and otherwise permitted reductions remain available.</p>}
      {data.executableBudgetId != null && data.executableBudgetId !== data.currentPlanBudgetId && <p>Current planning and financial execution use different revisions.</p>}
      {(data.issues || []).map((issue, i) => <p key={i}>{issue.message}</p>)}
      <details><summary>Shared cost ceilings</summary><CapacityBasis rows={data.buckets} /></details>
      {data.eligibility.mayManageActivation && <ActionButton disabled={disabled || busy || loading || !data.eligibility.canRequestActivation} onClick={getPreview}>{preview ? "Request fresh activation preview" : "Preview activation of this budget"}</ActionButton>}
    </>}
    {preview && <ScrollToForm className={styles.form} onSubmit={confirm}>
      <h4>Activation preview · {budgetReference(budgetId)}</h4><p>This observation is not a reservation. Saving revalidates all obligations.</p>
      <p>Budget limit: {exactAmount(preview.limit)} · Planned costs: {exactAmount(preview.plannedCosts)} · Governing donor decision #{preview.donorDecisionId ?? "unavailable"} · {preview.donorName || "Name unavailable"}</p>
      {preview.blockingIssues.map((issue, i) => <p role="alert" key={i}>{issue.message}</p>)}
      <CapacityBasis rows={preview.basis} />
      {(stale || blocked) && <p role="alert">This preview cannot be submitted. Review refreshed state/history and request a fresh preview.</p>}
      <label>Activation reason<textarea required maxLength={1000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label>
      <div data-action-group="section" className={styles.actions}><ActionButton disabled={disabled || busy || loading || !data || blocked || stale || !preview.eligibility.canActivate}>Confirm activation / reaffirmation</ActionButton><ActionButton type="button" disabled={busy} onClick={() => { setPreview(null); setReason(""); setBlocked(false); }}>Cancel activation</ActionButton></div>
    </ScrollToForm>}
  </section>;
}
