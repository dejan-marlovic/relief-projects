import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../config/api";
import { createAuthFetch, safeReadJson } from "../../utils/http";
import styles from "./ReviewAttribution.module.scss";

const actorName = actor => actor?.employeeName || actor?.displayName || actor?.username || "Not recorded";

export default function ReviewAttribution({ submission, approval, approvalLabel = "Approved by", status }) {
  if (status && !["SUBMITTED", "APPROVED", "REVIEWED", "ACCEPTED"].includes(status)) return null;
  if (!submission && !approval) return null;
  return <div className={styles.attribution} aria-label="Review attribution">
    {submission && <span>Submitted by <strong>{actorName(submission.actor)}</strong></span>}
    {approval && <span>{approvalLabel} <strong>{actorName(approval.actor)}</strong></span>}
  </div>;
}

// Financial audit pages are newest first. Only use the current lifecycle cycle;
// never reuse an approval or submission from before a return/withdrawal.
export function currentReview(events, status) {
  const transitions = events.filter(e => e.previousState && e.newState && e.previousState !== e.newState);
  const latest = transitions[0];
  if (!latest || latest.newState !== status) return {};
  const decision = e => ({ actor: { displayName: e.performedByDisplay || (e.performedBy != null ? `User #${e.performedBy}` : null) } });
  if (status === "SUBMITTED" && latest.action === "SUBMIT") return { submission: decision(latest) };
  if (status !== "APPROVED" || latest.action !== "APPROVE") return {};
  const previous = transitions[1];
  return { approval: decision(latest), ...(previous?.action === "SUBMIT" && previous.newState === "SUBMITTED" ? { submission: decision(previous) } : {}) };
}

export function FinancialReviewAttribution({ entityType, entityId, status, refreshKey }) {
  const navigate = useNavigate();
  const authFetch = useMemo(() => createAuthFetch(navigate), [navigate]);
  const [result, setResult] = useState(null);
  const identity = `${entityType}:${entityId}:${status}:${refreshKey}`;
  useEffect(() => {
    if (!entityId || !["SUBMITTED", "APPROVED"].includes(status)) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const events = [];
        let page = 0;
        do {
          const query = new URLSearchParams({ entityType, entityId: String(entityId), includeChildren: "false", page: String(page), size: "50" });
          const response = await authFetch(`${BASE_URL}/api/audit-events?${query}`, { signal: controller.signal });
          const body = await safeReadJson(response);
          if (!response.ok || !Array.isArray(body?.content)) return;
          events.push(...body.content.filter(e => e.entityType === entityType && String(e.entityId) === String(entityId)));
          const transitions = events.filter(e => e.previousState && e.newState && e.previousState !== e.newState);
          if (transitions.length >= (status === "APPROVED" ? 2 : 1) || !body.content.length || !Number.isInteger(body.totalPages) || ++page >= body.totalPages || page >= 20) break;
        } while (!controller.signal.aborted);
        if (!controller.signal.aborted) setResult({ identity, ...currentReview(events, status) });
      } catch { /* Attribution is optional; do not guess when history is unavailable. */ }
    })();
    return () => controller.abort();
  }, [authFetch, entityType, entityId, status, refreshKey, identity]);
  return result?.identity === identity ? <ReviewAttribution {...result} /> : null;
}
