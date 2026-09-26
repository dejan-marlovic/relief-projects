import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import styles from "./BudgetCurrencyDialog.module.scss";

const value = (number) => number == null ? "Unavailable" : String(number);
export const currencyLabel = (currency) => currency?.label || (currency?.id ? `Currency #${currency.id}` : "Unknown currency");
export function RateSnapshot({ rate }) {
  if (!rate) return null;
  return <span>1 {currencyLabel(rate.base)} → {value(rate.value)} {currencyLabel(rate.quote)} · {rate.date ? String(rate.date).replace("T", " ") : "Date unknown"} (rate #{rate.id})</span>;
}
const columns = { unitPrice: "Unit price", amountLocalCurrency: "Local", amountReportingCurrency: "Reporting", amountGBP: "GBP", amountEuro: "EUR" };
function Pair({ pair }) { return <span>{value(pair?.oldValue)} → <strong>{value(pair?.newValue)}</strong></span>; }

export default function BudgetCurrencyDialog({ budget, currencies, rates, initialTargetId, dirty, onDiscard, keepReady, onKeep, onUpdated, onClose }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const dialog = useRef(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const id = useId();
  const [mode, setMode] = useState("");
  const [selection, setSelection] = useState({ targetCurrencyId: String(initialTargetId || "") === String(budget.localCurrencyId) ? "" : String(initialTargetId || ""), conversionExchangeRateId: "", reportingExchangeRateSekId: "", localExchangeRateToGbpId: "", reportingExchangeRateEurId: "" });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mustReload, setMustReload] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { alive.current = false; element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const name = (currencyId) => currencies.find((item) => String(item.id) === String(currencyId))?.name || `Currency #${currencyId || "?"}`;
  const invalidate = () => { setPreview(null); setAcknowledged(false); setError(""); };
  const change = (field, next) => {
    invalidate();
    setSelection((old) => field === "targetCurrencyId" ? { targetCurrencyId: next, conversionExchangeRateId: "", reportingExchangeRateSekId: "", localExchangeRateToGbpId: "", reportingExchangeRateEurId: "" } : { ...old, [field]: next });
  };
  const rateSlots = [
    ["conversionExchangeRateId", "Conversion rate", budget.localCurrencyId, selection.targetCurrencyId],
    ["reportingExchangeRateSekId", "Reporting rate", selection.targetCurrencyId, budget.reportingCurrencySekId],
    ["localExchangeRateToGbpId", "GBP rate", selection.targetCurrencyId, budget.localCurrencyToGbpId],
    ["reportingExchangeRateEurId", "EUR rate", selection.targetCurrencyId, budget.reportingCurrencyEurId],
  ];
  const ready = !dirty && !mustReload && Object.values(selection).every(Boolean);
  const request = async (confirm) => {
    if (pending.current || (confirm ? !preview?.eligible || !preview.previewToken || !acknowledged || dirty || mustReload : !ready)) return;
    pending.current = true; setBusy(true); setError("");
    const token = preview?.previewToken;
    setPreview(null); setAcknowledged(false);
    try {
      const response = await authFetch(`${BASE_URL}/api/budgets/${budget.id}/currency-conversion${confirm ? "" : "/preview"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirm ? { previewToken: token } : { sourceCurrencyId: Number(budget.localCurrencyId), ...Object.fromEntries(Object.entries(selection).map(([key, item]) => [key, Number(item)])) }),
      });
      const body = await safeReadJson(response);
      if (!alive.current) return;
      if (!response.ok) {
        if (confirm && (response.status === 409 || response.status >= 500)) setMustReload(true);
        setError(response.status === 503 ? "Currency conversion is not configured. Configure BUDGET_CONVERSION_SIGNING_SECRET in the backend environment and restart the backend before using conversion. Keeping entered values remains available."
          : response.status === 409 ? "The preview is no longer usable. Reload the saved budget and review a fresh preview before confirming again."
          : [body?.message || body?.detail || (response.status === 403 ? "You do not have permission to convert this budget." : "Unable to complete the request."), ...Object.values(body?.fieldErrors || {})].join(" "));
        return;
      }
      if (confirm) {
        if (!body?.id) throw new Error("Missing updated budget");
        onUpdated(body); onClose();
      } else if (body && typeof body.eligible === "boolean") setPreview(body);
      else setError("The server did not return a usable preview. Please try again.");
    } catch {
      if (alive.current) {
        if (confirm) setMustReload(true);
        setError(confirm ? "The conversion outcome could not be confirmed. It may have been saved. Reload the budget before taking further action; do not submit the conversion again." : "The preview could not be loaded. Check your connection and try again.");
      }
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  const reload = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      const response = await authFetch(`${BASE_URL}/api/budgets/${budget.id}`);
      const body = await safeReadJson(response);
      if (!response.ok || !body?.id) throw new Error("Unavailable");
      if (alive.current) { onUpdated(body); onClose(); }
    } catch { if (alive.current) setError("The saved budget could not be reloaded. Refresh the page before making further changes."); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} onCancel={(event) => { event.preventDefault(); if (!pending.current && !mustReload) onClose(); }}>
    <h2 id={`${id}-title`}>Change budget currency</h2>
    <p>Saved local currency: <strong>{name(budget.localCurrencyId)}</strong>. Choose how the budget limit and cost-detail unit prices should change.</p>
    <fieldset disabled={busy || mustReload} className={styles.choices}>
      <legend>Currency change method</legend>
      <label><input type="radio" name={`${id}-mode`} checked={mode === "KEEP_VALUES"} onChange={() => { setMode("KEEP_VALUES"); invalidate(); }} /> Keep entered values — no conversion</label>
      <label><input type="radio" name={`${id}-mode`} checked={mode === "CONVERT"} onChange={() => { setMode("CONVERT"); invalidate(); }} /> Convert the saved limit and cost details</label>
    </fieldset>
    {mode === "KEEP_VALUES" && <section>
      <p>The entered budget limit and every retained cost-detail unit price are already in the selected local currency. Their numbers stay unchanged; calculated amounts are recalculated using the selected output rates.</p>
      {keepReady ? <><p>You are confirming the entered limit and retained unit prices are in <strong>{name(initialTargetId)}</strong>. No currency conversion will be performed.</p>
        <button disabled={busy || mustReload} onClick={onKeep}>Confirm and save entered values</button></>
        : <><p>Select the new local currency, enter its budget limit and choose its output rates in the budget form, then use Save changes to confirm.</p><button disabled={busy || mustReload} onClick={onClose}>Return to budget form</button></>}
    </section>}
    {mode === "CONVERT" && <section>
      <p>Conversion uses saved values. Quantities, periods and allocated percentages stay unchanged. Reporting, GBP and EUR target currencies are preserved.</p>
      {dirty && <div className={styles.notice}><p>There are unsaved header edits. Save unrelated edits separately, or discard the header edits before previewing conversion.</p><button disabled={busy} onClick={() => { invalidate(); onDiscard(); }}>Discard header edits for conversion</button></div>}
      <fieldset disabled={busy || mustReload} className={styles.fields}><legend>Explicit currency and rates</legend>
        <label>New local currency<select value={selection.targetCurrencyId} onChange={(event) => change("targetCurrencyId", event.target.value)}><option value="">Select currency</option>{currencies.filter((item) => String(item.id) !== String(budget.localCurrencyId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {rateSlots.map(([field, label, base, quote]) => {
          const matching = rates.filter((rate) => base && quote && String(rate.baseCurrencyId) === String(base) && String(rate.quoteCurrencyId) === String(quote));
          return <label key={field}>{label}: {name(base)} → {name(quote)}<select value={selection[field]} onChange={(event) => change(field, event.target.value)}><option value="">Select rate</option>{matching.map((rate) => <option key={rate.id} value={rate.id}>1 {name(base)} → {rate.rate} {name(quote)} · {rate.rateDate ? String(rate.rateDate).replace("T", " ") : "Date unknown"} (#{rate.id})</option>)}</select>{base && quote && !matching.length && <small>No matching rate is available. Add a rate in this direction before continuing.</small>}</label>;
        })}
      </fieldset>
      <button disabled={busy || !ready} onClick={() => request(false)}>Preview conversion</button>
      {preview && <section className={styles.preview} aria-label="Conversion preview">
        <h3>{currencyLabel(preview.sourceCurrency)} → {currencyLabel(preview.targetCurrency)}</h3>
        <p><RateSnapshot rate={preview.conversionRate} /></p>
        <ul>{(preview.outputRates || []).map((rate, index) => <li key={index}>{rate.slot}: <RateSnapshot rate={rate} /></li>)}</ul>
        <dl className={styles.totals}>{[["Budget limit", "budgetLimit"], ["Planned costs", "plannedCosts"], ["Remaining to allocate", "remainingToAllocate"]].map(([label, field]) => <div key={field}><dt>{label}</dt><dd><Pair pair={preview[field]} /></dd></div>)}</dl>
        <p>Excess: {value(preview.excess)} · Limit rounding adjustment: {value(preview.budgetLimitRoundingDelta)}</p>
        <p className={styles.muted}>Before → after. Unit prices are rounded to 12 decimal places; limits and calculated amounts to 3, using HALF_UP. Rounding adjustments are in the new local currency. Remaining is planning capacity.</p>
        {(preview.costDetails || []).map((row) => <details key={row.costDetailId} className={styles.row}><summary>Cost detail #{row.costDetailId} · Local: <Pair pair={row.amountLocalCurrency} /></summary><dl>{Object.entries(columns).map(([key, label]) => <div key={key}><dt>{label}</dt><dd><Pair pair={row[key]} /></dd></div>)}</dl><p>Unit-price rounding adjustment: {value(row.unitPriceRoundingDelta)}</p></details>)}
        {(preview.blockingIssues || []).map((issue, index) => <p role="alert" key={index}>{issue.message}{issue.costDetailIds?.length > 0 && ` (Cost details: ${issue.costDetailIds.join(", ")})`}</p>)}
        {(preview.warnings || []).map((issue, index) => <p key={index}>Warning: {issue.message}{issue.costDetailIds?.length > 0 && ` (Cost details: ${issue.costDetailIds.join(", ")})`}</p>)}
        {preview.eligible && preview.previewToken && <><p>Preview expires: {preview.expiresAt ? new Date(preview.expiresAt).toLocaleString() : "Unknown"}.</p><label className={styles.acknowledge}><input type="checkbox" checked={acknowledged} disabled={busy} onChange={(event) => setAcknowledged(event.target.checked)} /> I have reviewed the rates, converted values and rounding, and want to convert the saved budget and cost details.</label><button disabled={busy || dirty || !acknowledged || mustReload} onClick={() => request(true)}>Confirm conversion</button></>}
      </section>}
    </section>}
    {error && <p role="alert" className={styles.notice}>{error}</p>}
    {mustReload && <button disabled={busy} onClick={reload}>Reload saved budget</button>}
    {busy && <p role="status">Loading…</p>}
    <div className={styles.actions}><button disabled={busy || mustReload} onClick={onClose}>Close</button></div>
  </dialog>, document.body);
}
