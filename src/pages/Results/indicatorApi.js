/* global BigInt */
import { useEffect, useState } from "react";
import { safeReadJson } from "../../utils/http";
import { decimalUnits } from "../../utils/transactionFunding";

export async function readIndicator(response) {
  const data = await safeReadJson(response);
  if (!response.ok) {
    const error = new Error([...new Set([data?.message, ...Object.values(data?.fieldErrors || {})].filter(Boolean))].join(" ") || `Request failed (${response.status}).`);
    Object.assign(error, { status: response.status, code: data?.code, existingResultId: data?.existingResultId });
    throw error;
  }
  if (!data) throw new Error("The response could not be read. Check whether the operation succeeded before retrying.");
  return data;
}
export function useIndicatorRead(authFetch, url, refresh) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  useEffect(() => {
    if (!url) { setState({ data: null, loading: false, error: "" }); return undefined; }
    const controller = new AbortController();
    setState(previous => ({ data: previous.data, loading: true, error: "" }));
    authFetch(url, { signal: controller.signal, cache: "no-store" }).then(readIndicator)
      .then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: "" }); })
      .catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message }); });
    return () => controller.abort();
  }, [authFetch, url, refresh]);
  return state;
}
export function measurementError(value, type) {
  const text = String(value ?? "");
  if (text.length > 128 || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return "Enter a nonnegative plain decimal, for example 0 or 12.5.";
  const units = decimalUnits(text);
  if (units == null || units > BigInt("999999999999999999999999")) return "Use at most 18 integer digits and six meaningful decimal places. Values are not rounded.";
  if (type === "COUNT" && units % BigInt(1000000) !== BigInt(0)) return "Counts must be whole numbers.";
  if (type === "PERCENTAGE" && units > BigInt(100000000)) return "Percentages must be between 0 and 100.";
  return "";
}
export const showValue = value => value == null ? "Unknown" : String(value);
export const words = value => String(value || "").replaceAll("_", " ").toLowerCase();
export const targetDirection = value => value === "LOWER_IS_BETTER" ? "at most" : "at least";
export const blankIndicator = () => ({ name: "", definition: "", measurementType: "COUNT", unit: "", direction: "HIGHER_IS_BETTER", periodStart: "", periodEnd: "", baselineKnown: false, baselineValue: "", baselineDate: "", targetValue: "", notes: "" });
export function indicatorDraft(indicator) {
  return Object.fromEntries(Object.keys(blankIndicator()).map(key => [key, indicator?.[key] ?? blankIndicator()[key]]));
}
export function indicatorPayload(draft, frozen = false) {
  const editorial = { name: draft.name.trim(), targetValue: draft.targetValue, notes: draft.notes.trim() || null };
  return frozen ? editorial : { ...indicatorDraft(draft), ...editorial, definition: draft.definition.trim(), unit: draft.measurementType === "PERCENTAGE" ? "%" : draft.unit.trim(), baselineValue: draft.baselineKnown ? draft.baselineValue : null, baselineDate: draft.baselineKnown ? draft.baselineDate : null };
}
