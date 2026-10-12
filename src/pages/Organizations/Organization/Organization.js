import { Link, useNavigate } from "react-router-dom";
import { useUnsavedChanges } from "../../../context/UnsavedChangesContext";
import { createAuthFetch } from "../../../utils/http";
import OrganisationReviews from "../../OrganisationAssessment/OrganisationReviews";
// src/pages/Organizations/Organization/Organization.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../../config/api";
import styles from "./Organization.module.scss";
import {
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
} from "react-icons/fi";
import BankDetails from "./BankDetails";
import AddressDetails from "./AddressDetails";

const Organization = ({
  saving = false,
  editingLocked = false,
  link, // { id, projectId, organizationId, organizationStatusId }
  isEditing,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  organizations = [], // [{id, name}]
  statuses = [], // [{id, organizationStatusName}]
  fieldErrors = {},
  canManage = false,
  canManageAddresses = false,
  canViewBankDetails = false,
  canManageBankDetails = false,
}) => {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const { confirmDiscardUnsavedChanges } = useUnsavedChanges();
  const [expanded, setExpanded] = useState(false);
  const [assessment, setAssessment] = useState("Loading assessment…");
  useEffect(() => {
    if (link.id === "new") return;
    const controller = new AbortController();
    authFetch(`${BASE_URL}/api/project-organizations/${link.id}/assessment`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      const record = data.assessment;
      if (!controller.signal.aborted) setAssessment(!record ? "Not started" : record.deleted ? "Deleted assessment · history retained" : `${record.state?.replaceAll("_", " ").toLowerCase() || "Recorded"}${record.reviewRequired ? " · Review required" : ""}`);
    }).catch(() => { if (!controller.signal.aborted) setAssessment("Assessment status unavailable"); });
    return () => controller.abort();
  }, [authFetch, link.id]);
  const [showReviews, setShowReviews] = useState(false);
  const ev = editedValues || {};
  const isCreate = (link?.id ?? "") === "new";


  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showAddressDetails, setShowAddressDetails] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const toNum = (v) => (v === "" ? "" : Number(v));

  const getFieldError = (name) => fieldErrors?.[name];
  const hasError = (name) => Boolean(getFieldError(name));
  const inputClass = (name) =>
    `${styles.input} ${hasError(name) ? styles.inputError : ""}`;

  const FieldError = ({ name }) =>
    hasError(name) ? (
      <div className={styles.fieldError}>{getFieldError(name)}</div>
    ) : null;

  const selectOrg = () => (
    <>
      <select
        aria-label="Organization"
        disabled={saving}
        value={ev.organizationId ?? link.organizationId ?? ""}
        onChange={(e) => onChange("organizationId", toNum(e.target.value))}
        className={inputClass("organizationId")}
      >
        <option value="">Select organization</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <FieldError name="organizationId" />
    </>
  );

  const selectStatus = () => (
    <>
      <select
        aria-label="Role in this project"
        disabled={saving}
        value={ev.organizationStatusId ?? link.organizationStatusId ?? ""}
        onChange={(e) =>
          onChange("organizationStatusId", toNum(e.target.value))
        }
        className={inputClass("organizationStatusId")}
      >
        <option value="">Select role</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.organizationStatusName}
          </option>
        ))}
      </select>
      <FieldError name="organizationStatusId" />
    </>
  );

  const orgName = (id) =>
    organizations.find((o) => o.id === id)?.name || (id ?? "-");

  const statusName = (id) =>
    statuses.find((s) => s.id === id)?.organizationStatusName || (id ?? "-");

  const open = expanded || isEditing;
  return <article className={styles.relationshipCard}>
    <header className={styles.cardHeader}>
      <div><h3>{isCreate ? "Add organisation to this project" : orgName(link.organizationId)}</h3>
        {!isCreate && <p><strong>Role in this project:</strong> {statusName(link.organizationStatusId)}</p>}
        {!isCreate && <p>Assessment: {assessment}</p>}
      </div>
      <div className={styles.cardActions}>
        {!isCreate && <Link to={`/organisation-assessments/${link.id}`} onClick={e => { if (!confirmDiscardUnsavedChanges()) e.preventDefault(); }}>Open assessment</Link>}
        {!isEditing && <button type="button" aria-expanded={open} onClick={() => { if (open && !confirmDiscardUnsavedChanges()) return; setExpanded(!open); }}>{open ? "Hide details" : "Show details"}</button>}
      </div>
    </header>
    {open && <div className={styles.cardBody}>
      <section><h4>Project relationship</h4><p>This role belongs to the selected project. An organisation can have other roles in other projects.</p>
        {isEditing ? <>
          <label>Organisation{selectOrg()}</label><label>Role in this project{selectStatus()}</label>
          <div className={styles.cardActions}>
            {canManage && isCreate && <button type="button" disabled={saving} onClick={submit} aria-label="Save"><FiSave /> Add relationship</button>}
            <button type="button" disabled={saving} onClick={onCancel}><FiX />{isCreate ? "Cancel" : "Done editing"}</button>
          </div>
        </> : null}
        <div className={styles.relationshipActions}>
          {!isEditing && canManage && <button type="button" disabled={saving || editingLocked} onClick={onEdit} aria-label="Edit"><FiEdit /> Edit relationship</button>}
          {!isCreate && <button type="button" onClick={() => setShowReviews(v => !v)} aria-expanded={showReviews}>Assessments across projects and roles</button>}
        </div>
        {!isCreate && showReviews && <div className={styles.reviewsPanel}><OrganisationReviews organizationId={link.organizationId} authFetch={authFetch} /></div>}
      </section>
      {!isCreate && link.organizationId && <section><h4>Addresses</h4><p>Addresses belong to the organisation and are shared across its projects.</p>
        <button type="button" aria-expanded={showAddressDetails} onClick={() => { if (showAddressDetails && !confirmDiscardUnsavedChanges()) return; setShowAddressDetails(v => !v); }}>{showAddressDetails ? "Hide address details" : "Show address details"}</button>
        {showAddressDetails && <AddressDetails organizationId={link.organizationId} canManage={canManageAddresses} />}
      </section>}
      {!isCreate && link.organizationId && canViewBankDetails && <section><h4>Bank details</h4><p>Bank details belong to the organisation and are shared across its projects. Recording them does not authorise a payment.</p>
        <button type="button" aria-expanded={showBankDetails} onClick={() => { if (showBankDetails && !confirmDiscardUnsavedChanges()) return; setShowBankDetails(v => !v); }}>{showBankDetails ? "Hide bank details" : "Show bank details"}</button>
        {showBankDetails && <BankDetails organizationId={link.organizationId} canManage={canManageBankDetails} />}
      </section>}
      {!isCreate && canManage && <footer className={styles.removal}><button type="button" disabled={saving || editingLocked} onClick={() => onDelete(link.id)} aria-label="Delete organization relation"><FiTrash2 /> Remove from this project</button><small>Removes this project relationship, not the organisation itself.</small></footer>}
    </div>}
  </article>;
};
export default Organization;
