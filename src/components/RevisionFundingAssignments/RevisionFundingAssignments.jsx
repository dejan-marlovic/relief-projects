import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch } from "../../utils/http";
import { readExecution, executionChanged, exactAmount, assignmentAmountError } from "../../utils/budgetExecution";
import { decimalUnits } from "../../utils/transactionFunding";
import useFinancialRefresh from "../../hooks/useFinancialRefresh";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import styles from "../ProjectCloseout/ProjectCloseout.module.scss";

export function AssignmentPanel({ transactionId, originBudgetId, disabled = false, refreshKey, onChanged }) {
  const navigate = useNavigate(), authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const eventRevision = useFinancialRefresh(), pending = useRef(false);
  const [tick, setTick] = useState(0), [loading, setLoading] = useState(true), [data, setData] = useState(null), [error, setError] = useState("");
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false);
  const endpoint = `${BASE_URL}/api/transactions/${transactionId}/revision-funding-assignments`;
  useUnsavedChange(`funding-assignment-${transactionId}`, Boolean(form));
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null);
    authFetch(endpoint, { signal: controller.signal, cache: "no-store" }).then(readExecution).then(value => {
      if (!Array.isArray(value.assignments) || !Array.isArray(value.targets) || !value.eligibility) throw new Error("Funding assignments unavailable.");
      if (!controller.signal.aborted) setData(value);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, authFetch, tick, eventRevision, refreshKey]);
  const open = (assignment = null, release = false) => {
    setError(""); setBlocked(false);
    setForm({ id: assignment?.id, expectedAssignmentRevision: assignment?.revision, expectedFamilyRevision: data.familyRevision, expectedExecutionRevision: data.executionRevision,
      targetCostDetailId: assignment?.targetCostDetailId ? String(assignment.targetCostDetailId) : "", amount: release ? "0" : assignment?.amount || "", reason: "", acknowledged: false });
  };
  const change = (field, value) => setForm(old => ({ ...old, [field]: value }));
  const assignment = data?.assignments.find(a => a.id === form?.id);
  const target = data?.targets.find(t => String(t.targetCostDetailId) === form?.targetCostDetailId);
  const stale = form && data && (form.expectedFamilyRevision !== data.familyRevision || form.expectedExecutionRevision !== data.executionRevision || (form.id && form.expectedAssignmentRevision !== assignment?.revision));
  const submit = async event => {
    event.preventDefault();
    if (!data || !form || pending.current || blocked || stale || disabled || loading) return;
    const invalid = assignmentAmountError(form.amount, !form.id);
    if (invalid) { setError(invalid); return; }
    if (!form.reason.trim() || !form.acknowledged) { setError("Enter a reason and acknowledge the assignment boundaries."); return; }
    const amount = decimalUnits(form.amount);
    if (form.id) {
      const previous = decimalUnits(assignment?.amount);
      if (previous == null || (amount > previous && !assignment?.eligibility.canIncrease) || (amount < previous && !assignment?.eligibility.canReduce)) { setError("This amount change is not currently permitted. Refresh and review assignment eligibility."); return; }
    } else if (!target?.canAssign || !data.eligibility.canCreateAssignment) { setError("Select an eligible target on the executable revision."); return; }
    const body = { amount: form.amount.trim(), expectedFamilyRevision: form.expectedFamilyRevision, expectedExecutionRevision: form.expectedExecutionRevision, reason: form.reason.trim() };
    if (form.id) body.expectedAssignmentRevision = form.expectedAssignmentRevision;
    else body.targetCostDetailId = Number(form.targetCostDetailId);
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await readExecution(await authFetch(form.id ? `${BASE_URL}/api/revision-funding-assignments/${form.id}/amount` : endpoint, { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      if (!Array.isArray(result.assignments)) throw new Error("Assignment result is uncertain.");
      setForm(null); setBlocked(false); onChanged?.(); executionChanged();
    } catch (err) {
      setBlocked(true); setError(`${err.message} Your draft and original revisions are retained. Review the refreshed assignment list and transaction history; nothing is retried automatically.`);
      onChanged?.(); executionChanged();
    } finally { pending.current = false; setBusy(false); setTick(n => n + 1); }
  };
  return <div className={styles.panel}>
    <p className={styles.hint}>Use unused approved funding from this existing award on revised costs. Each assignment is one allocation, not a new award or another balance. Receipts and actual payments do not change this capacity.</p>
    <p className={styles.hint}>Original allocations on an APPROVED transaction remain reserved even when uncommitted. This workflow cannot release those allocations. Recorded governing approval does not verify every award's donor conditions.</p>
    <button disabled={busy || loading} onClick={() => { setError(""); setTick(n => n + 1); }}>Refresh funding assignments</button>
    {loading && <p role="status">Loading assignments…</p>}{error && <p role="alert">{error}</p>}
    {data && <><dl className={styles.fields}><dt>Original award budget</dt><dd>#{originBudgetId ?? "unavailable"}</dd><dt>Executable use plan</dt><dd>{data.eligibility.targetBudgetId == null ? "Not activated" : `Budget #${data.eligibility.targetBudgetId}`}</dd><dt>Currency</dt><dd>{data.funding.currency ? `${data.funding.currency.name || "Currency"} (#${data.funding.currency.id})` : "Unavailable"}</dd><dt>Approved funding</dt><dd>{exactAmount(data.funding.approved)}</dd><dt>Obligations counted once</dt><dd>{exactAmount(data.funding.obligations)}</dd><dt>Unused approved funding</dt><dd>{exactAmount(data.funding.unassignedApprovedFunding)}</dd></dl>
      <p className={styles.hint}>Unused approved funding is not cash. Target-row and shared family ceilings also apply. Currency is the current configured denomination, not verified historical meaning.</p>
      {(data.issues || []).map((issue, i) => <p key={i}>{issue.message}</p>)}
      {!form && data.eligibility.canCreateAssignment && <button disabled={disabled || busy || loading} onClick={() => open()}>Assign unused funding to revised costs</button>}
      {!data.assignments.length && <p>No revision funding assignments.</p>}
      {data.assignments.map(row => <article className={styles.card} key={row.id}>
        <h4>Assignment #{row.id} · {row.state === "RELEASED" ? "Released" : "Assigned"}</h4>
        <p>Original budget #{row.originBudgetId} → Use plan #{row.targetBudgetId} · Cost detail #{row.targetCostDetailId} · Allocation #{row.allocationId}</p>
        <dl className={styles.fields}><dt>Assigned amount</dt><dd>{exactAmount(row.amount)}</dd><dt>Minimum to cover commitments</dt><dd>{exactAmount(row.minimumAmount)}</dd><dt>Maximum additional assignment now</dt><dd>{exactAmount(row.maximumAdditionalAmount)}</dd></dl>
        <p className={styles.hint}>Creation authorized by execution decision #{row.executionDecisionId}. This historical reference does not change when another plan is activated.</p>
        {!row.eligibility.canIncrease && <p className={styles.hint}>Increase unavailable; current target, execution and capacity restrictions apply.</p>}
        {!form && <div className={styles.actions}>{(row.eligibility.canIncrease || row.eligibility.canReduce) && <button disabled={disabled || busy || loading} onClick={() => open(row)}>Change amount #{row.id}</button>}{row.eligibility.canRelease && <button disabled={disabled || busy || loading} onClick={() => open(row, true)}>Release assignment #{row.id}</button>}</div>}
      </article>)}
    </>}
    {form && <form className={styles.form} onSubmit={submit}><h4>{form.id ? `Change assignment #${form.id}` : "Assign unused approved funding"}</h4><fieldset disabled={busy || disabled}>
      {!form.id ? <label>Revised cost row<select required value={form.targetCostDetailId} onChange={e => change("targetCostDetailId", e.target.value)}><option value="">Select revised cost</option>{(data?.targets || []).filter(row => row.canAssign).map(row => <option key={row.targetCostDetailId} value={row.targetCostDetailId}>Budget #{row.targetBudgetId} · Cost detail #{row.targetCostDetailId} · Additional maximum {exactAmount(row.maximumAdditionalAmount)}</option>)}</select></label> : <p>Target cost #{form.targetCostDetailId} is fixed. Reduce and separately assign elsewhere if permitted; no capacity is reserved between commands.</p>}
      {target && <p>Additional maximum: {exactAmount(target.maximumAdditionalAmount)} — limited by unused award funding, the concrete row and the shared family ceiling.</p>}
      <label>Assignment amount<input required type="text" inputMode="decimal" value={form.amount} onChange={e => change("amount", e.target.value)} /></label>
      <label>Assignment reason<textarea required maxLength={1000} value={form.reason} onChange={e => change("reason", e.target.value)} /></label>
      <label><input type="checkbox" required checked={form.acknowledged} onChange={e => change("acknowledged", e.target.checked)} /> I understand this uses unused approved funding, not cash, and cannot release original approved allocations. Zero releases only this managed assignment subject to commitment coverage.</label>
      {(blocked || stale) && <><p role="alert">Review refreshed assignments and transaction history. If creation already succeeded, cancel this draft and use the existing assignment's amount control.</p><button type="button" disabled={loading || !data || Boolean(form.id && !assignment)} onClick={() => { setForm(old => ({ ...old, expectedFamilyRevision: data.familyRevision, expectedExecutionRevision: data.executionRevision, expectedAssignmentRevision: assignment?.revision })); setBlocked(false); setError(""); }}>I reviewed state and history; use current revisions</button></>}
      <div className={styles.actions}><button disabled={busy || blocked || stale || loading || !data}>Save assignment</button><button type="button" onClick={() => { setForm(null); setBlocked(false); setError(""); }}>Cancel assignment</button></div>
    </fieldset></form>}
  </div>;
}

export default function RevisionFundingAssignments(props) {
  const [opened, setOpened] = useState(false);
  return <details className={styles.section} onToggle={e => { if (e.currentTarget.open) setOpened(true); }}><summary>Revision funding assignments · Transaction #{props.transactionId}</summary>{opened && <AssignmentPanel {...props} />}</details>;
}
