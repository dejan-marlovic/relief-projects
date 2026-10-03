import CountryPicker from "./CountryPicker";
import { supportsGeography, geographyChanges, geographyExport, useCountryCatalogue } from "../../utils/projectGeography";
import React, { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/api";
import { projectMetadataPayload, projectApprovalLabel } from "../../utils/projectApproval";
import { classificationFields, classificationValues, classificationChanges, classificationErrors, supportsClassification } from "../../utils/projectClassification";
import { useUnsavedChange } from "../../context/UnsavedChangesContext";
import ClassificationFields from "./ClassificationFields";
import styles from "./ProjectClassification.module.scss";

const optionalValues = project => ({ ...classificationValues(project), operatingCountryCodes: project?.operatingCountryCodes || [] });
const optionalChanges = (draft, original) => ({ ...classificationChanges(draft, original), ...geographyChanges(draft, original) });

export default function ProjectClassification({ projectId, authFetch, canEdit, onSaved }) {
  const catalogue = useCountryCatalogue(authFetch);
  const [original, setOriginal] = useState(null), [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [errors, setErrors] = useState({}), [review, setReview] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const fetchRef = useRef(authFetch); fetchRef.current = authFetch;
  const alive = useRef(false), pending = useRef(false);
  const url = `${BASE_URL}/api/projects/${projectId}`;
  const dirty = Object.keys(optionalChanges(draft, original)).length > 0;
  useUnsavedChange(`classification-${projectId}`, dirty);
  async function read() {
    const response = await fetchRef.current(url);
    if (!response.ok) throw new Error("Unable to refresh optional project details.");
    return response.json();
  }
  useEffect(() => {
    alive.current = true;
    read().then(data => { if (alive.current) { setOriginal(data); setDraft(optionalValues(data)); } }).catch(e => { if (alive.current) setError(e.message); });
    return () => { alive.current = false; };
    // Parent keys the editor by project ID; changing callback identity must not discard drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  async function save() {
    if (pending.current || !canEdit || review || !supportsClassification(original)) return;
    const validation = classificationErrors(draft);
    if (draft.operatingCountryCodes?.length > catalogue.data?.maxSelections) validation.operatingCountryCodes = `Select at most ${catalogue.data.maxSelections} countries.`;
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const geographyDirty = Object.keys(geographyChanges(draft, original)).length > 0;
    if (geographyDirty && (!supportsGeography(original) || !catalogue.data || catalogue.loading || catalogue.error)) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const changes = optionalChanges(draft, original);
      const fresh = await read();
      if (geographyDirty && !supportsGeography(fresh)) throw new Error("Country coverage is no longer supported by the backend.");
      if (!supportsClassification(fresh)) throw new Error("The backend no longer supports these fields.");
      const response = await fetchRef.current(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...projectMetadataPayload(fresh), ...changes }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (alive.current) setErrors(data.fieldErrors || {});
        throw new Error(data.message || "Could not save optional details.");
      }
      const saved = await read();
      if (alive.current) { setOriginal(saved); setDraft(optionalValues(saved)); setRefreshed(false); onSaved?.(saved); window.dispatchEvent(new Event("project-metadata-updated")); }
    } catch (e) { if (alive.current) { setError(`${e.message} Your draft is retained. Refresh saved values before retrying; the previous save may have succeeded.`); setReview(true); } }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  async function refresh() {
    setBusy(true);
    try {
      const changes = optionalChanges(draft, original);
      const fresh = await read();
      if (alive.current) {
        setOriginal(fresh);
        setDraft({ ...optionalValues(fresh), ...(original ? changes : {}) });
        setReview(false);
        setRefreshed(true);
        setError("Saved values refreshed. Review your retained edits before saving again.");
      }
    }
    catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setBusy(false); }
  }
  return <section className={styles.section}>
    <h3>Language titles, target group & operating countries</h3>
    {error && <p role="alert">{error}</p>}
    {!original && !error && <p>Loading optional details…</p>}
    {original && !supportsClassification(original) && <p>Optional details are unavailable on this backend. You can add them after the backend is updated.</p>}
    {supportsClassification(original) && <>
      {canEdit ? <ClassificationFields values={draft} onChange={e => setDraft(d => ({ ...d, [e.target.name]: e.target.value }))} errors={errors} disabled={busy} /> : <dl>{classificationFields.map(f => <React.Fragment key={f.name}><dt>{f.label}</dt><dd>{original[f.name] || "Not recorded"}</dd></React.Fragment>)}</dl>}
      {supportsGeography(original) && (canEdit ? <CountryPicker codes={draft.operatingCountryCodes} savedCountries={original.operatingCountries} catalogue={catalogue} disabled={busy} error={errors.operatingCountryCodes} onChange={codes => setDraft(previous => ({ ...previous, operatingCountryCodes: codes }))} /> : <dl><dt>Operating countries/territories</dt><dd>{geographyExport(original)}</dd></dl>)}
      <p className={styles.hint}>{projectApprovalLabel(original)}</p>
      {canEdit && <><p className={styles.hint}>Save these optional details separately from the other project fields.</p><button type="button" disabled={busy || review || !dirty || (Object.keys(geographyChanges(draft, original)).length > 0 && (catalogue.loading || !!catalogue.error || !catalogue.data))} onClick={save}>Save optional details</button></>}
    </>}
    {(review || (!original && error)) && <button type="button" disabled={busy} onClick={refresh}>Refresh saved values for review</button>}
    {refreshed && supportsGeography(original) && <p>Saved operating countries/territories: {geographyExport(original)}</p>}
    {refreshed && <dl>{classificationFields.map(f => <React.Fragment key={f.name}><dt>Saved {f.label.toLowerCase()}</dt><dd>{original?.[f.name] || "Not recorded"}</dd></React.Fragment>)}</dl>}
  </section>;
}
