import { useEffect, useState } from "react";
import { BASE_URL } from "../config/api";
import { readApiError } from "../utils/apiErrors";

export default function useDocumentCategories(authFetch) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    (async () => {
      try {
        const response = await authFetch(`${BASE_URL}/api/documents/categories`, { signal: controller.signal });
        if (!response.ok) throw new Error(await readApiError(response, "Could not load document categories."));
        const data = await response.json();
        if (!Array.isArray(data) || !data.length || data.some((item) => !item.id || !item.label)) {
          throw new Error("Document categories are unavailable. Please retry after the backend is updated.");
        }
        if (!controller.signal.aborted) setCategories(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || "Could not load document categories.");
      }
    })();
    return () => controller.abort();
  }, [authFetch, revision]);
  return { categories, categoryError: error, retryCategories: () => setRevision((value) => value + 1) };
}
