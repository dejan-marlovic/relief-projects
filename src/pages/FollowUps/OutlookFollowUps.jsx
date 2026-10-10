import React, { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/api";
import { safeReadJson } from "../../utils/http";
import styles from "./FollowUps.module.scss";

const label = value => value ? String(value).replaceAll("_", " ").toLowerCase() : "Unavailable";
const time = value => value ? new Date(value).toLocaleString() : "Not recorded";
const attentionActions = {
  REVIEW_MANUAL_UPDATE: "Review the existing Outlook appointment manually; do not create or import a replacement copy.",
  REVIEW_FOR_MANUAL_REMOVAL: "Review only the known app-created appointment for manual removal in Outlook.",
  REVIEW_OWNERSHIP: "Review the appointment’s ownership and location. Do not recreate or remove an uncertain entry.",
  REVIEW_UNCERTAIN_CREATION: "Creation is uncertain. Check the existing calendar entry before taking further action; do not create a duplicate."
};
export default function OutlookFollowUps({ authFetch, beforeConnect = () => true }) {
  const [data, setData] = useState(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [ack, setAck] = useState(false);
  const [notice, setNotice] = useState("");
  const alive = useRef(true), pending = useRef(false), sequence = useRef(0);
  const endpoint = `${BASE_URL}/api/me/outlook-follow-ups`;
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const response = await authFetch(endpoint, { cache: "no-store", credentials: "include" });
      const value = await safeReadJson(response);
      if (!response.ok) throw new Error(value?.message || "Outlook connection status is unavailable. Refresh before taking an action.");
      if (value?.capabilities?.outlookFollowUpVersion !== 1 || !Number.isInteger(value.revision) || !value.permissions) throw new Error("This backend does not provide a supported Outlook connection status.");
      if (alive.current && request === sequence.current) setData(value);
    } catch (err) {
      if (alive.current && request === sequence.current) { setData(null); setError(err.message); }
    } finally { if (alive.current && request === sequence.current) setLoading(false); }
  }, [authFetch, endpoint]);
  useEffect(() => {
    alive.current = true; refresh();
    const update = () => { if (!pending.current && document.visibilityState !== "hidden") refresh(); };
    window.addEventListener("focus", update); const timer = setInterval(update, 60000);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener("focus", update); };
  }, [refresh]);
  useEffect(() => { setAck(false); }, [data?.revision, data?.state]);
  const command = async (action, extra = {}) => {
    if (pending.current || loading || !data) return;
    if (["connect", "confirm"].includes(action) && !ack) return;
    if (action === "connect" && !beforeConnect()) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await authFetch(`${endpoint}/${action}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: data.revision, ...extra }) });
      const result = await safeReadJson(response);
      if (!response.ok) throw new Error(result?.message || "The Outlook request could not be completed.");
      if (action === "connect") {
        const url = new URL(result?.authorizationUrl);
        if (url.protocol !== "https:" || url.hostname !== "login.microsoftonline.com" || url.username || url.password || url.port || !url.pathname.endsWith("/oauth2/v2.0/authorize")) throw new Error("The connection returned an unexpected sign-in address. Refresh status before continuing.");
        window.location.assign(url.href);
      } else setNotice(action === "check" ? "Check requested. This does not confirm calendar delivery." : "Request accepted. Review the refreshed connection and cleanup status below.");
    } catch (err) {
      if (alive.current) setError(`${err.message} Status will be refreshed. Review it before trying again; the command will not be replayed automatically.`);
    } finally {
      if (alive.current) { setAck(false); await refresh(); setBusy(false); }
      pending.current = false;
    }
  };
  const disabled = busy || loading;
  const capabilities = data?.capabilities;
  const credentialDeadline = data?.cleanup?.deadline || data?.cleanupDeadline;
  const canPublish = data?.configured && capabilities?.creationSupported !== false;
  const canConfirm = data?.permissions.canConfirm && !!data?.account;
  return <section className={styles.form} aria-label="Outlook follow-up publication">
    <h3>Outlook follow-up publication · Test preview</h3>
    <p><strong>Creation only · Updates blocked · Removal manual.</strong> Full synchronization is not ready. Published appointments may remain outdated after editing, completing or deleting a task. Review existing copies manually in Outlook; do not import ICS or create replacement copies to resolve a blocked update.</p>
    <p>Only titles and deadlines of your employee’s open follow-ups are published to your own default calendar. No task descriptions or project names are copied. Calendar sharing may expose titles. Microsoft consent permits calendar access broader than these app-managed entries.</p>
    <p>Outlook changes do not update Relief Projects. No reminders or invitations are created. Existing imported ICS copies are separate and may cause duplicates. Use nonsensitive test tasks.</p>
    <button type="button" disabled={disabled} onClick={() => { setError(""); refresh(); }}>Refresh Outlook status</button>
    {loading && <p role="status">Loading connection status…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {data && <>
      {!data.configured && <p>Outlook publication is not configured. Microsoft app registration and secure backend configuration are required before connection.</p>}
      {capabilities.creationSupported === false && <p>Calendar entry creation is not supported by this backend.</p>}
      {capabilities.creationSupported === true && <p>Creating entries is supported, subject to configuration, account confirmation and task eligibility. This does not confirm delivery.</p>}
      {capabilities.updateBlocker === "MEETING_AND_MOVE_RACES_UNVERIFIED" && <p>Automatic updates are blocked because safety when an appointment is moved or changed into a meeting has not been verified.</p>}
      <p><strong>Connection: {label(data.state)}</strong> · Employee mapping: {label(data.mappingStatus)}</p>
      {data.account && <p>Microsoft account: <strong>{data.account.displayName || "Unnamed account"}</strong> · {label(data.account.accountType)}</p>}
      {data.authorization && <p>Account authorization: {label(data.authorization.phase)}{data.authorization.expiresAt ? ` · Expires: ${time(data.authorization.expiresAt)}` : ""}.</p>}
      {data.state === "AWAITING_CONFIRMATION" && !data.account && <p>Microsoft account setup has not completed. Refresh status after returning from Microsoft. No account is ready to confirm.</p>}
      {data.authorization?.recovery === "DISCONNECT_FORGET_NOW_THEN_CONNECT" && <p>To abandon this incomplete attempt, choose Forget access now, refresh status and start a new connection. Do not reuse an old Microsoft sign-in link.</p>}
      <p>Observed: {time(data.observedAt)}. This is an observation, not a live delivery guarantee. While the backend is stopped, Outlook copies remain unchanged.</p>
      <p>Last attempt: {time(data.lastAttemptAt)} · Last successful full synchronization: not available in this release.</p>
      <p>Discovered mappings: {data.managedCount ?? "Unknown"} managed · {data.pendingCount ?? "Unknown"} pending · {data.failedCount ?? "Unknown"} failed. These counts do not include tasks not yet discovered; zero is not proof of completion.</p>
      {credentialDeadline && <p>Credential retention deadline: {time(credentialDeadline)}. This is not a scheduled calendar cleanup. No use is permitted after this deadline. Expired encrypted credentials are scrubbed on startup if the backend was stopped; retained backups are not erased by disconnect.</p>}
      {data.removal && <div aria-label="Manual Outlook removal">
        <h4>Manual calendar removal</h4>
        <p>Discovered mappings to review: {data.removal.reviewCount ?? "Unknown"}. This is not a current Outlook inventory or proof that an appointment still exists. Counts can include uncertain or already manually removed entries.</p>
        {data.removal.mayRequireManualRemoval && <p>Some entries may require manual removal. Review only known app-created appointments; do not delete unrelated appointments or meetings.</p>}
        {data.removal.message && <p>{data.removal.message}</p>}
      </div>}
      {data.cleanup && <div aria-label="Outlook credentials">
        <h4>Stored access and disconnect</h4>
        <p>Credentials retained: {data.cleanup.credentialsRetained === true ? "Yes" : data.cleanup.credentialsRetained === false ? "No" : "Unknown"}. Credential erasure does not remove calendar entries.</p>
        {data.cleanup.message && <p>{data.cleanup.message}</p>}
      </div>}
      {data.issues?.map((issue, index) => <p key={index}>{issue.message || label(issue.code)}</p>)}
      {data.lastIssue && <p>Last issue: {label(data.lastIssue)}</p>}
      {!!data.itemsRequiringAttention?.length && <><h4>Items requiring attention (up to 20 discovered mappings)</h4><ul>{data.itemsRequiringAttention.map((item, index) => <li key={index}>
        <strong>Follow-up #{item.taskId}</strong> · {label(item.state)} · {label(item.code)}
        {item.message && <p>{item.message}</p>}
        {item.action && <p>{attentionActions[item.action] || `Suggested action: ${label(item.action)}`}</p>}
        <p>Last observed: {time(item.observedAt)}</p>
      </li>)}</ul></>}
      {canPublish && (data.permissions.canConnect || canConfirm) && <label><input type="checkbox" checked={ack} disabled={disabled} onChange={e => setAck(e.target.checked)} /> {canConfirm ? "I confirm this Microsoft account is mine. " : "I want to connect my own Microsoft account. "}I understand task titles will be copied, automatic updates are blocked and removal is manual; I will manually manage stale test appointments.</label>}
      <div className={styles.actions}>
        {canPublish && data.permissions.canConnect && <button disabled={disabled || !ack} onClick={() => command("connect")}>Connect Microsoft account</button>}
        {canPublish && canConfirm && <button disabled={disabled || !ack} onClick={() => command("confirm", { confirmAccount: true })}>Confirm account and test publication</button>}
        {data.permissions.canCheck && <button disabled={disabled} onClick={() => command("check")}>Check now</button>}
        {data.permissions.canDisconnect && <button disabled={disabled} onClick={() => command("disconnect", { mode: "CLEANUP_THEN_DISCONNECT" })}>Disconnect · retain credentials up to 24 hours</button>}
        {data.permissions.canDisconnect && data.cleanup?.forgetAvailable !== false && <button disabled={disabled} onClick={() => command("disconnect", { mode: "FORGET_NOW" })}>Forget access now</button>}
      </div>
      <p>Check now requests an observation; it does not apply blocked edits or remove appointments.</p>
      <p>Disconnect stops new publication. The existing policy retains encrypted credentials for up to 24 hours solely for cleanup, but automatic removal is unsupported and those credentials are not used for cleanup or refresh while disconnected. Forget access erases stored credentials immediately while the service is available. Neither action removes Microsoft consent or calendar entries.</p>
      <p>Remove leftover app-created appointments manually in Outlook. To revoke Microsoft consent, open your Microsoft account’s app-permission settings and remove this application’s access. Do not remove unrelated appointments.</p>
    </>}
  </section>;
}
