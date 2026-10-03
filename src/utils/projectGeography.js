import { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../config/api";

export const supportsGeography = project => Array.isArray(project?.operatingCountryCodes) && Array.isArray(project?.operatingCountries);
export const countrySet = codes => [...new Set((codes || []).map(code => code.trim().toUpperCase()))].sort();
export const geographyChanges = (draft, original) => JSON.stringify(countrySet(draft.operatingCountryCodes)) === JSON.stringify(countrySet(original?.operatingCountryCodes)) ? {} : { operatingCountryCodes: countrySet(draft.operatingCountryCodes) };
export const countryLabel = entry => `${entry.label || "Label unavailable"} (${entry.code})${entry.issue ? " — review required" : entry.selectable === false ? " — retired" : ""}`;
export const geographyExport = project => project.operatingCountryCodes?.length ? project.operatingCountryCodes.map(code => countryLabel(project.operatingCountries.find(entry => entry.code === code) || { code, label: null, issue: true })).join("; ") : "Not recorded";

export function useCountryCatalogue(authFetch) {
  const ref = useRef(authFetch); ref.current = authFetch;
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, loading: true, error: "" }));
    (async () => {
      try {
        const response = await ref.current(`${BASE_URL}/api/projects/geography/countries`);
        if (!response.ok) throw new Error("Country lookup is unavailable. Your selections have been retained.");
        const data = await response.json();
        if (!Array.isArray(data.countries) || !Number.isInteger(data.maxSelections) || data.maxSelections < 1) throw new Error("Country lookup returned an unsupported response.");
        if (active) setState({ data, loading: false, error: "" });
      } catch (error) { if (active) setState(previous => ({ ...previous, loading: false, error: error.message })); }
    })();
    return () => { active = false; };
  }, [revision]);
  return { ...state, retry: () => setRevision(n => n + 1) };
}
