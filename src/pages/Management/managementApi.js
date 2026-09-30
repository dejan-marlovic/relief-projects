import { useEffect, useState } from "react";
import { safeReadJson } from "../../utils/http";

export async function readManagement(response) {
  const data = await safeReadJson(response);
  if (!response.ok) {
    const error = new Error([...new Set([data?.message, ...Object.values(data?.fieldErrors || {})].filter(Boolean))].join(" ") || `Request failed (${response.status}).`);
    Object.assign(error, { status: response.status, code: data?.code });
    throw error;
  }
  if (!data || typeof data !== "object") throw new Error("The response could not be read. Refresh and check whether the operation succeeded before retrying.");
  return data;
}
export function useManagementRead(authFetch, url, refresh) {
  const [state, setState] = useState({ url: null, data: null, loading: false, error: "" });
  useEffect(() => {
    if (!url) { setState({ url, data: null, loading: false, error: "" }); return undefined; }
    const controller = new AbortController();
    setState(previous => ({ url, data: previous.url === url ? previous.data : null, loading: true, error: "" }));
    authFetch(url, { cache: "no-store", signal: controller.signal }).then(readManagement)
      .then(data => { if (!controller.signal.aborted) setState({ url, data, loading: false, error: "" }); })
      .catch(error => { if (!controller.signal.aborted) setState({ url, data: null, loading: false, error: error.message }); });
    return () => controller.abort();
  }, [authFetch, url, refresh]);
  return state.url === url ? state : { data: null, loading: !!url, error: "" };
}
export const label = value => String(value || "").replaceAll("_", " ").toLowerCase();
export const blankObservation = () => ({ type: "FINDING", title: "", observation: "", sourceType: "", sourceReference: "", observedDate: "" });
export const observationDraft = record => Object.fromEntries(Object.keys(blankObservation()).map(key => [key, record?.[key] ?? blankObservation()[key]]));
export function observationPayload(draft, create) {
  return { ...(create ? { type: draft.type } : {}), title: draft.title.trim(), observation: draft.observation.trim(), sourceType: draft.sourceType, sourceReference: draft.sourceReference.trim() || null, observedDate: draft.observedDate };
}
export const commandPermission = { edit: "canEdit", response: "canRespond", reviews: "canReview", actions: "canLinkAction", evidence: "canLinkEvidence", resolve: "canResolve", reopen: "canReopen", delete: "canDelete", restore: "canRestore" };
