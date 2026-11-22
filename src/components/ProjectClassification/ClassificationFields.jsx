import { ErrorState } from "../ReadState/ReadState";
import GuidanceNote from "../GuidanceNote/GuidanceNote";
import React from "react";
import { classificationFields } from "../../utils/projectClassification";
import styles from "./ProjectClassification.module.scss";

export default function ClassificationFields({ values, onChange, errors = {}, disabled = false }) {
  return <div className={styles.fields}>
    <GuidanceNote className={styles.hint}>Optional language titles supplement the project name used in headings and selectors. Blank means not recorded.</GuidanceNote>
    {classificationFields.map(({ name, label, max }) => <label key={name}>
      {label} (optional)
      {name === "targetGroupDescription" ? <textarea name={name} value={values[name] || ""} onChange={onChange} disabled={disabled} aria-invalid={!!errors[name]} placeholder="Not recorded" /> : <input name={name} value={values[name] || ""} onChange={onChange} disabled={disabled} aria-invalid={!!errors[name]} placeholder="Not recorded" />}
      <small>{(values[name] || "").length} / {max} characters</small>
      {errors[name] && <ErrorState as="span" >{errors[name]}</ErrorState>}
    </label>)}
    <GuidanceNote className={styles.hint}>Changing the target group can require assessment resubmission before approval, or review of an existing approval. Language titles alone do not affect assessment decisions.</GuidanceNote>
  </div>;
}
