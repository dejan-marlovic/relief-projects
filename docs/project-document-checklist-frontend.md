# Project document checklist frontend

The Documents tab now contains a collapsible Project document checklist for the selected project. Each item expands to show server guidance, current applicability and attribution, evidence, and permitted actions.

## Contract and behavior

- Uses the backend definitions, order, states, counts and editable flag. No inferred completion, review, deadlines or approval.
- Admin/Project Manager editing is determined by the server; inactive projects and other readers see a read-only view.
- Distinguishes default applicability from explicit decisions. Not applicable requires a trimmed 1–1,000-code-point explanation; reversal omits the old reason.
- Shows retained evidence under Not applicable and permits unlinking, while preventing new links until reversal.
- Evidence discovery defaults to current active project documents. Category and historical-version filters are discovery aids only.
- Linking pins the selected ID. Downloads use the authenticated blob helper for that exact ID. Newer versions never redirect evidence.
- Version history is read-only here. Upload/replacement and metadata editing remain in the existing Documents workflow.
- Every write sends the current item revision. POST/PUT consume the updated item and refresh the complete envelope; DELETE refreshes revisions and summary. Failures refresh without automatic retries.
- Uploads, metadata edits and document-version changes in this page refresh the checklist through the shared list revision. Window focus and explicit refresh also reload it. Project changes unmount and abort old reads/downloads.
- Current attribution is not full history. Unavailable evidence remains visible; storage availability is checked on download.

## Verification

- Full frontend suite: 55 suites, 336 tests passed. Final diff review and git diff --check passed.

- Nine focused tests cover attribution/default presentation, reason validation, reversal, retained unavailable evidence, read-only behavior, exact-version downloads, explicit linking, unlink revision, stale conflicts, historical discovery and unmounted requests.
- Component ESLint and stylesheet compilation passed.
- Browser read-only check against the restarted backend returned all 12 items, eight Needs assessment and four Missing evidence. Expanded item showed guidance, applicability controls and existing project documents in the selector.
- No live checklist writes, file operations or backend changes were performed during browser verification. Manual acceptance remains with the user.

## Manual acceptance

1. As Admin or Project Manager, open Documents and expand Project document checklist.
2. Expand Project assessment and link a document. Confirm Evidence recorded and download the selected version.
3. Mark the item Not applicable with an explanation. Confirm its evidence remains visible and new linking is unavailable.
4. Reverse to Applicable or Needs assessment; verify the explanation clears and existing links remain.
5. Remove an evidence link and verify the file remains in Documents.
6. Optionally replace a linked document in Documents and verify the checklist retains the original version with a newer-version notice.

Nothing committed. Backend contract: D:/projects/relief_projects/docs/project-document-checklist.md.
