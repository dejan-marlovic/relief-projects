export const uploadTimeLabel = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

export const uploaderLabel = (document) => document.uploadedByUsername
  || (document.uploadedByUserId ? `User #${document.uploadedByUserId}` : "Unknown");

export const readDocumentError = async (response, fallback) => {
  const data = await response.json().catch(() => null);
  const details = Object.values(data?.fieldErrors || {}).flat().filter(Boolean).join(" ");
  return [data?.message || fallback, details].filter(Boolean).join(" ");
};

// Compare with the loaded record so unrelated edits don't clear or replace metadata.
export const documentMetadataChanges = (form, original) => ({
  ...(form.category !== (original?.category || "UNCATEGORIZED") ? { category: form.category } : {}),
  ...(form.documentDate !== (original?.documentDate || "") ? { documentDate: form.documentDate || null } : {}),
});
