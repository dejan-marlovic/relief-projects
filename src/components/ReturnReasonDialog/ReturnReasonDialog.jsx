import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import { formatApiError } from "../../utils/apiErrors";
import styles from "./ReturnReasonDialog.module.scss";

// Java Character.isWhitespace / isSpaceChar (the backend normalization policy).
// eslint-disable-next-line no-control-regex -- Java also trims the U+001C–U+001F separators.
export const normalizeReturnReason = (value) => value.replace(/^[\u0009-\u000d\u001c-\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g, "");

export default function ReturnReasonDialog({ endpoint, recordLabel, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const dialog = useRef(null);
  const input = useRef(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const id = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const normalized = normalizeReturnReason(reason);
  const count = Array.from(normalized).length;

  useEffect(() => {
    alive.current = true;
    const previousFocus = document.activeElement;
    const element = dialog.current;
    element.showModal();
    input.current.focus();
    return () => {
      alive.current = false;
      element.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    const validation = !count ? "A return reason is required." : count > 2000 ? "Return reason must be at most 2000 characters." : "";
    setFieldError(validation);
    if (validation) { input.current.focus(); return; }
    pending.current = true;
    setBusy(true);
    try {
      const response = await authFetch(`${BASE_URL}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: normalized }),
      });
      const body = await safeReadJson(response);
      if (!alive.current) return;
      if (!response.ok) {
        setFieldError(body?.fieldErrors?.reason || "");
        setError(formatApiError(body, response.status === 403 ? "You do not have permission to return this record."
          : response.status === 404 ? "This record is unavailable."
          : response.status === 409 ? "This record has changed. Refresh it before trying again."
          : "The record could not be returned. Please try again."));
        input.current.focus();
        return;
      }
      if (!body?.id) throw new Error("The return succeeded but the updated record was unavailable. Close this dialog and refresh the page.");
      onSuccess(body);
    } catch (failure) {
      if (alive.current) setError(failure.message || "The record could not be returned. Please try again.");
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };

  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`}
    onCancel={(event) => { event.preventDefault(); if (!pending.current) onCancel(); }}>
    <form onSubmit={submit} noValidate>
      <h2 id={`${id}-title`}>Return {recordLabel}</h2>
      <p>Explain what needs to change before this record is resubmitted. The reason will appear in its history.</p>
      <label htmlFor={`${id}-reason`}>Return reason (required)</label>
      <textarea ref={input} id={`${id}-reason`} rows={6} value={reason} readOnly={busy} required
        aria-invalid={Boolean(fieldError)} aria-describedby={`${id}-count ${id}-field`}
        onChange={(event) => { setReason(event.target.value); setFieldError(""); }} />
      <div id={`${id}-count`}>{count} / 2000 characters</div>
      <div id={`${id}-field`} className={styles.error}>{fieldError}</div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={busy}>{busy ? "Returning…" : "Confirm return"}</button>
      </div>
    </form>
  </dialog>, document.body);
}
