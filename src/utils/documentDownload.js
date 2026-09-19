import { BASE_URL } from "../config/api";

const safeName = (value) => String(value || "")
  .split(/[\\/]/).pop()
  .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069<>:"|?*]/g, "_")
  .replace(/[. ]+$/g, "").trim().slice(0, 200);

export function documentFilename(header, id) {
  // Match parameters without treating semicolons inside quoted filenames as separators.
  const parameters = new Map();
  const pattern = /;\s*([\w*-]+)\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/g;
  let match;
  while ((match = pattern.exec(header || ""))) {
    const raw = match[2].trim();
    parameters.set(match[1].toLowerCase(), raw.startsWith('"')
      ? raw.slice(1, -1).replace(/\\(.)/g, "$1") : raw);
  }
  let name;
  const extended = parameters.get("filename*");
  if (extended && /^UTF-8'/i.test(extended)) {
    try { name = decodeURIComponent(extended.replace(/^UTF-8'[^']*'/i, "")); } catch { /* use filename fallback */ }
  }
  const candidate = safeName(name || parameters.get("filename"));
  return candidate && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(candidate)
    ? candidate : `Document-${id}`;
}

export async function downloadDocument(id, authFetch, signal) {
  const response = await authFetch(`${BASE_URL}/api/documents/${encodeURIComponent(id)}/download`, {
    cache: "no-store", redirect: "error", signal,
  });
  if (!response.ok) {
    const messages = {
      403: "You do not have permission to download this document.",
      404: "This document or its file is no longer available.",
      503: "Document storage is temporarily unavailable. Please try again later.",
    };
    throw new Error(messages[response.status] || "Document download failed. Please try again.");
  }
  const blob = await response.blob();
  if (signal?.aborted) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = documentFilename(response.headers.get("Content-Disposition"), id);
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
