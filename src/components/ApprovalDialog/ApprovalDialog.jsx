import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { formatApiError } from "../../utils/apiErrors";
import styles from "../ReturnReasonDialog/ReturnReasonDialog.module.scss";

// Eligibility belongs to one reviewed submission, never to a whole list or account.
export default function ApprovalDialog({ endpoint, recordLabel, onRefresh, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const request = useMemo(() => createAuthFetch(navigate), [navigate]);
  const dialog = useRef(null);
  const alive = useRef(false);
  const pending = useRef(false);
  const callbacks = useRef({ onRefresh, onSuccess });
  callbacks.current = { onRefresh, onSuccess };
  const id = useId();
  const [basis, setBasis] = useState(null);
  const [busy, setBusy] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setBasis(null); setReviewed(false); setError("");
    try {
      const results = await Promise.all([endpoint, `${endpoint}/approval-eligibility`].map(async path => {
        const response = await request(`${BASE_URL}${path}`);
        const body = await safeReadJson(response);
        if (!response.ok) throw new Error(formatApiError(body, "Approval information could not be loaded."));
        return body;
      }));
      if (!alive.current) return;
      const [record, eligibility] = results;
      if (!record?.id || String(record.id) !== String(eligibility?.entityId)) throw new Error("Approval information is incomplete. Refresh before reviewing.");
      setBasis({ record, eligibility });
      callbacks.current.onRefresh(record);
    } catch (failure) {
      if (alive.current) setError(failure.message || "Approval information could not be loaded.");
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };

  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    load();
    return () => { alive.current = false; element.close(); if (previous?.isConnected) previous.focus(); };
    // The parent keys this dialog by record; callbacks stay current without reloading a reviewed token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, request]);

  const eligibility = basis?.eligibility;
  const validToken = Number.isSafeInteger(eligibility?.submissionId) && eligibility.submissionId > 0;
  const allowed = eligibility?.canAttemptApproval === true && validToken && basis?.record.lifecycleStatus === "SUBMITTED";
  const approve = async event => {
    event.preventDefault();
    if (pending.current || !allowed || !reviewed) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await request(`${BASE_URL}${endpoint}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedSubmissionId: eligibility.submissionId }),
      });
      const body = await safeReadJson(response);
      if (!response.ok) throw new Error(formatApiError(body, "Approval failed."));
      if (!body?.id || body.lifecycleStatus !== "APPROVED") throw new Error("Approval could not be confirmed.");
      if (alive.current) callbacks.current.onSuccess(body);
    } catch (failure) {
      if (alive.current) {
        setBasis(null); setReviewed(false);
        setError(`${failure.message || "Approval could not be confirmed."} Refresh and review the current record before another attempt.`);
      }
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };

  const record = basis?.record;
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); if (!pending.current) onCancel(); }}>
    <form onSubmit={approve}>
      <h2 id={`${id}-title`}>Approval review: {recordLabel}</h2>
      {busy && <p role="status">Checking approval…</p>}
      {record && <><p>{record.budgetName || record.paymentOrderDescription || record.description || recordLabel}</p>
        <p>Status: {record.lifecycleStatus}</p>
        {record.approvedAmount != null && <p>Approved funding: {record.approvedAmount}</p>}
        {record.amount != null && <p>Amount: {record.amount}</p>}
        <p>Review the record and its supporting details before confirming. Financial prerequisites are checked again when you approve.</p></>}
      {eligibility?.issues?.map((issue, index) => <p role="alert" key={index}>{issue.message}</p>)}
      {basis && !allowed && !eligibility?.issues?.length && <p role="alert">Approval is unavailable for this submission.</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {allowed && <label><input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} /> I have reviewed this submission and its supporting details.</label>}
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={onCancel}>Close</button>
        <button type="button" disabled={busy} onClick={load}>Refresh for review</button>
        {allowed && <button type="submit" disabled={busy || !reviewed}>Confirm approval</button>}
      </div>
    </form>
  </dialog>, document.body);
}
