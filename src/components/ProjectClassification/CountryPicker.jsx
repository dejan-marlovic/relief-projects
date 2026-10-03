import React, { useState } from "react";
import { countryLabel } from "../../utils/projectGeography";
import styles from "./ProjectClassification.module.scss";

export default function CountryPicker({ codes = [], savedCountries = [], catalogue, onChange, disabled, error }) {
  const [search, setSearch] = useState("");
  const choices = catalogue.data?.countries || [];
  const locked = disabled || catalogue.loading || !!catalogue.error || !catalogue.data;
  const selected = codes.map(code => choices.find(entry => entry.code === code) || savedCountries.find(entry => entry.code === code) || { code, label: null, issue: true });
  return <fieldset className={styles.countries}>
    <legend>Operating countries/territories (optional)</legend>
    <p className={styles.hint}>Where project activities are intended to operate. This is separate from Address and beneficiary nationality. Empty means not recorded, not global coverage.</p>
    {codes.length ? <ul>{selected.map(entry => <li key={entry.code}>{countryLabel(entry)} <button type="button" disabled={locked} onClick={() => onChange(codes.filter(code => code !== entry.code))}>Remove {entry.code}</button></li>)}</ul> : <p>Not recorded</p>}
    {catalogue.loading && <p>Loading countries…</p>}
    {catalogue.error && <p role="alert">{catalogue.error} <button type="button" onClick={catalogue.retry}>Retry country lookup</button></p>}
    {error && <p role="alert">{error}</p>}
    {catalogue.data && <>
      <label>Search countries or codes<input type="search" value={search} onChange={e => setSearch(e.target.value)} disabled={locked} /></label>
      <p className={styles.hint}>{codes.length} / {catalogue.data.maxSelections} selected</p>
      <div className={styles.countryChoices}>{choices.filter(entry => entry.selectable && !codes.includes(entry.code) && `${entry.label} ${entry.code}`.toLowerCase().includes(search.toLowerCase())).map(entry => <label key={entry.code}><input type="checkbox" checked={false} disabled={locked || codes.length >= catalogue.data.maxSelections} onChange={() => onChange([...codes, entry.code])} />{entry.label} ({entry.code})</label>)}</div>
    </>}
    <p className={styles.hint}>Changing operating countries may require assessment resubmission or review. It does not change the project's address.</p>
  </fieldset>;
}
