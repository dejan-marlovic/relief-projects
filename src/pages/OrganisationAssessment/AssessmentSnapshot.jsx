import RecordReference, { isRecordReference } from "../../components/RecordReference/RecordReference";
import React from "react";
import { fields } from "./assessmentApi";
import styles from "./OrganisationAssessment.module.scss";

const titles = { ...fields, fields: "Assessment text", context: "Project and organisation", contributors: "Assessment contributors", actor: "Recorded by", evidence: "Evidence considered", basis: "Captured assessment and evidence", capturedName: "Document name", versionNumber: "Document version", organizationStatusLabel: "Role in this project", employeeName: "Employee", username: "Account", linkedBy: "Linked by", linkedAt: "Linked on" };
const title = key => titles[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

export default function AssessmentSnapshot({ value }) {
  if (value == null) return <span>Not set</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (Array.isArray(value)) return value.length ? <ul className={styles.snapshotList}>{value.map((item, index) => <li key={index}><AssessmentSnapshot value={item} /></li>)}</ul> : <span>None</span>;
  const entries = Object.entries(value).filter(([key]) => key !== "version");
  const references = entries.filter(([key]) => /Id$|^id$|Generation$/.test(key));
  const content = entries.filter(([key]) => !references.some(([reference]) => reference === key));
  return <div className={styles.snapshotGroup}>
    <dl className={styles.snapshotFields}>{content.map(([key, item]) => <div key={key}><dt>{title(key)}</dt><dd>{isRecordReference(key) && (item == null || typeof item !== "object") ? <RecordReference field={key} value={item} record={value} /> : <AssessmentSnapshot value={item} />}</dd></div>)}</dl>
    {!!references.length && <details className={styles.references}><summary>Record references</summary><dl className={styles.snapshotFields}>{references.map(([key, item]) => <div key={key}><dt>{title(key)}</dt><dd>{isRecordReference(key) && (item == null || typeof item !== "object") ? <RecordReference field={key} value={item} record={value} /> : <AssessmentSnapshot value={item} />}</dd></div>)}</dl></details>}
  </div>;
}
