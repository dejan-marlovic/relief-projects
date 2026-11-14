// Accept a confirmed server revision before continuing automatic edits.
export function savedDraft(form, record, extra = {}) {
  if (!record || !Number.isSafeInteger(record.revision)) throw new Error("The save response was incomplete. Review the refreshed record before retrying.");
  const draft = { ...form.draft, reason: "" };
  return { ...form, ...extra, action: "edit", record, expectedRevision: record.revision, draft, savedDraft: JSON.stringify(draft), error: "", reviewRequired: false };
}

export function draftIsDirty(form) {
  return !!form && (form.reviewRequired || !["create", "edit"].includes(form.action) || form.savedDraft !== JSON.stringify(form.draft));
}
