import CountryPicker from "./CountryPicker";
import { supportsGeography, geographyExport, useCountryCatalogue } from "../../utils/projectGeography";
import React, { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/api";
import { projectApprovalLabel } from "../../utils/projectApproval";
import { classificationFields, classificationValues, classificationErrors, normalizeClassification, supportsClassification } from "../../utils/projectClassification";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import useProjectAutosave from "../../utils/useProjectAutosave";
import AutosaveStatus from "./AutosaveStatus";
import ClassificationFields from "./ClassificationFields";
import styles from "./ProjectClassification.module.scss";

const optionalValues = project => ({ ...classificationValues(project), operatingCountryCodes: project?.operatingCountryCodes || [] });

export default function ProjectClassification({ projectId, authFetch, canEdit, onSaved }) {
  const catalogue = useCountryCatalogue(authFetch);
  const [original, setOriginal] = useState(null), [draft, setDraft] = useState({});
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const fetchRef = useRef(authFetch); fetchRef.current = authFetch;
  const errors = classificationErrors(draft);
  const save = useProjectAutosave({
    projectId, authFetch, enabled: canEdit && supportsClassification(original),
    validate: (value, changes) => {
      if (!supportsClassification(value)) return "Optional details are no longer available.";
      const validation = classificationErrors(value);
      if (Object.keys(validation).length) return Object.values(validation).join(" ");
      if (value.operatingCountryCodes?.length > (catalogue.data?.maxSelections ?? 20)) return "Too many operating countries selected.";
      if (Object.prototype.hasOwnProperty.call(changes, "operatingCountryCodes") && (!supportsGeography(value) || !catalogue.data || catalogue.loading || catalogue.error)) return "Country choices are unavailable. Retry after refreshing the country list.";
      return "";
    },
    onSaved: (saved, sent) => {
      setOriginal(saved);
      setDraft(previous => {
        const next = { ...previous };
        for (const key of Object.keys(sent)) {
          const current = key === "operatingCountryCodes" ? previous[key] : normalizeClassification(previous[key]);
          if (JSON.stringify(current) === JSON.stringify(sent[key])) next[key] = optionalValues(saved)[key];
        }
        return next;
      });
      onSaved?.(saved);
    }
  });
  useUnsavedChange(`classification-${projectId}`, save.dirty);
  useEffect(() => {
    let active = true;
    setError("");
    fetchRef.current(`${BASE_URL}/api/projects/${projectId}`, { cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error("Unable to load optional project details."); return response.json(); })
      .then(data => { if (active) { setOriginal(data); setDraft(optionalValues(data)); } })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [projectId, attempt]);
  function change(name, value, immediate = false) {
    setDraft(previous => ({ ...previous, [name]: value }));
    save.edit({ [name]: name === "operatingCountryCodes" ? value : normalizeClassification(value) }, original, immediate);
  }
  return <section className={styles.section} onBlur={save.flush}>
    <h3>Language titles, target group & operating countries</h3>
    {error && <p role="alert">{error} <button onClick={() => setAttempt(n => n + 1)}>Retry loading optional details</button></p>}
    {!original && !error && <p>Loading optional details…</p>}
    {original && !supportsClassification(original) && <p>Optional details are unavailable on this backend. You can add them after the backend is updated.</p>}
    {supportsClassification(original) && <>
      {canEdit ? <ClassificationFields values={draft} onChange={e => change(e.target.name, e.target.value)} errors={errors} /> : <dl>{classificationFields.map(f => <React.Fragment key={f.name}><dt>{f.label}</dt><dd>{original[f.name] || "Not recorded"}</dd></React.Fragment>)}</dl>}
      {supportsGeography(original) && (canEdit ? <CountryPicker codes={draft.operatingCountryCodes} savedCountries={original.operatingCountries} catalogue={catalogue} onChange={codes => change("operatingCountryCodes", codes, true)} /> : <dl><dt>Operating countries/territories</dt><dd>{geographyExport(original)}</dd></dl>)}
      <p className={styles.hint}>{projectApprovalLabel(original)}</p>
      {canEdit && <><p className={styles.hint}>These details save automatically. Wait for “Saved” before leaving.</p><AutosaveStatus save={save} /></>}
    </>}
  </section>;
}
