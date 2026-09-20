import React, { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { readDocumentError } from "../../utils/documentMetadata";
import { budgetLimitError } from "../../utils/budgetLimit";
import styles from "./BudgetPlanning.module.scss";
const labels = { WITHIN_LIMIT: "Within limit", AT_LIMIT: "At limit", OVER_LIMIT: "Over limit — correction needed", UNCONFIRMED: "Local-currency meaning not confirmed", UNAVAILABLE: "Planning total unavailable" };
export default function BudgetPlanning({ budget, refreshKey = 0, disabled = false, onUpdated }) {
  const { hasAnyRole } = useAuth();
  const [summary, setSummary] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const alive = useRef(true), pending = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`${BASE_URL}/api/budgets/${budget.id}/planning-summary`, { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }, signal: controller.signal })
      .then(async (res) => { if (!res.ok) throw new Error(await readDocumentError(res, "Could not load planning summary.")); return res.json(); })
      .then((data) => { if (!data.status || !Object.hasOwn(data, "limitCurrencyConfirmed")) throw new Error("Could not load planning summary."); if (!controller.signal.aborted) { setSummary(data); setAmount(data.budgetLimit ?? ""); setConfirmed(false); } })
      .catch((err) => { if (!controller.signal.aborted) { setSummary(null); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [budget.id, budget.totalAmount, budget.localCurrencyId, budget.budgetLimitCurrencyId, budget.lifecycleStatus, refreshKey, refresh]);
  const editable = hasAnyRole("ADMIN", "FINANCE") && ["DRAFT", "RETURNED"].includes(budget.lifecycleStatus || "DRAFT");
  const save = async (event) => {
    event.preventDefault();
    if (pending.current || disabled || !confirmed || !summary?.localCurrency?.id || !editable) return;
    const invalid = budgetLimitError(amount); if (invalid) { setError(invalid); return; }
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(`${BASE_URL}/api/budgets/${budget.id}/limit`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}`, "Content-Type": "application/json" }, body: JSON.stringify({ totalAmount: amount.trim(), confirmedLocalCurrencyId: summary.localCurrency.id }) });
      if (!res.ok) throw new Error(await readDocumentError(res, "Could not update budget limit."));
      const updated = await res.json();
      if (alive.current) { onUpdated?.(updated); setMessage("Budget limit saved. Review the refreshed planning status below."); setRefresh((v) => v + 1); }
    } catch (err) { if (alive.current) setError(err.message); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  return <section className={styles.panel} aria-label="Budget planning">
    <h3>Budget planning</h3>
    <p className={styles.muted}>Remaining to allocate is room for planned costs, not cash or a payment balance.</p>
    <button type="button" disabled={busy || loading} onClick={() => setRefresh((v) => v + 1)}>Refresh planning summary</button>
    {loading && <p role="status">Loading planning summary…</p>}{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {summary && <>
      <p><strong>{labels[summary.status] || summary.status}</strong></p>
      <dl className={styles.totals}><div><dt>Budget limit ({summary.localCurrency?.name || "currency unavailable"}){!summary.limitCurrencyConfirmed ? " — meaning unconfirmed" : ""}</dt><dd>{summary.budgetLimit ?? "Unavailable"}</dd></div><div><dt>Planned costs</dt><dd>{summary.plannedCosts ?? "Unavailable"}</dd></div><div><dt>Remaining to allocate</dt><dd>{summary.remainingToAllocate ?? "Unavailable"}</dd></div></dl>
      {!summary.limitCurrencyConfirmed && <p>Confirm or correct the limit in the local currency before cost edits, recalculation or submission. Confirmation declares its meaning now; it does not convert the value. Approved budgets remain read-only; submitted budgets must first be returned.</p>}
      {summary.status === "OVER_LIMIT" && <p>Reduce planned costs or increase the limit. Additions and restorations are blocked during repair; existing commitments may prevent reductions.</p>}
      {summary.status === "UNAVAILABLE" && <p>Check the limit, currency and saved cost amounts. Known valid subtotal: {summary.knownPlannedCosts ?? "Unavailable"} (partial, not total). Invalid cost-detail IDs: {summary.invalidCostDetailIds?.join(", ") || "None reported"}. Unknown amounts do not create capacity.</p>}
      {editable && <form onSubmit={save}>
        <label>Set or confirm budget limit<input type="number" min="0.001" step="any" value={amount} disabled={busy || disabled || loading} onChange={(e) => { setAmount(e.target.value); setConfirmed(false); }} /></label>
        <label><input type="checkbox" checked={confirmed} disabled={busy || disabled || loading} onChange={(e) => setConfirmed(e.target.checked)} /> I confirm this amount is in {summary.localCurrency?.name || "the configured local currency"}. No currency conversion will be performed.</label>
        <button type="submit" disabled={busy || disabled || loading || !confirmed || !summary.localCurrency?.id}>Save budget limit</button>
        <p className={styles.muted}>Saves only the limit and its currency confirmation; cost details are not recalculated. Finish other edits first.</p>
      </form>}
    </>}
  </section>;
}
