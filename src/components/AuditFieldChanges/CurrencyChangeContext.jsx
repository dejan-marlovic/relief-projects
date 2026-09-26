import React from "react";
import { currencyLabel, RateSnapshot } from "../BudgetCurrencyDialog/BudgetCurrencyDialog";

export default function CurrencyChangeContext({ context }) {
  if (!context) return null;
  if (context.version !== 1 || !["CONVERT", "KEEP_VALUES"].includes(context.mode)) return <p>Currency change details use an unsupported format.</p>;
  return <section aria-label="Recorded currency change">
    <p><strong>{context.mode === "CONVERT" ? "Currency conversion" : "Currency changed — values retained"}</strong>: {currencyLabel(context.sourceCurrency)} → {currencyLabel(context.targetCurrency)}</p>
    {context.mode === "KEEP_VALUES" ? <p>No conversion: the entered limit and retained unit prices were interpreted in the new local currency.</p> : <p><RateSnapshot rate={context.conversionRate} /></p>}
    <details><summary>Recorded conversion and rate details</summary>
      <ul>{(context.outputRates || []).map((rate, index) => <li key={index}>{rate.slot}: <RateSnapshot rate={rate} /></li>)}</ul>
      <p>Unit-price scale: {context.unitPriceScale}; amount scale: {context.amountScale}; rounding: {context.roundingMode}.</p>
      <p>Operation: {context.operationId}</p>
    </details>
  </section>;
}
