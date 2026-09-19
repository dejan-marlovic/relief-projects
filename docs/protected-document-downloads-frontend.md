# Protected document downloads: frontend

Implemented 19 September 2026 against the final backend contract in [protected-document-downloads.md](D:/projects/relief_projects/docs/protected-document-downloads.md).

## Behaviour

- Documents uses a button to fetch `GET /api/documents/{id}/download` with the current bearer token through the existing authenticated fetch helper. There are no filename-based public links or URL tokens. Requests disable caching and reject redirects.
- Successful responses download as blobs. Attachment names prefer UTF-8 `filename*`, with quoted/plain filename support, safe local fallback and path/control-character sanitization. Temporary anchors are removed and object URLs revoked after the click.
- Duplicate clicks are blocked per document, downloading state is visible, and pending requests are aborted when the project changes or the component unmounts.
- 401 follows the existing login redirect. 403, 404 and 503 have understandable messages; other failures are reported without saving an error body as a document. Errors use the existing accessible banner.
- Admin Update Document shows the stored file key as read-only. It no longer requires or submits `documentPath`. Name, employee and project editing remain available. Existing create screens already use multipart upload.
- Upload/deletion update the Documents list from successful responses. Admin edits update their saved metadata; returning to Documents reloads its project list. Every download checks the backend again rather than trusting cached metadata.

## Approved local demo rollout — 2026-09-19

The user explicitly approved discarding the dummy files rather than migrating them. Removed 30 tracked dummy files from `public/documents` and 30 generated copies from `build/documents`. Existing database records were retained; their old missing files now correctly report unavailable.

Compiled the current backend and restarted it with its existing Java arguments, `STORAGE_TYPE=local`, and `DOCUMENTS_DIR=C:\Users\dmarl\.relief-projects\documents`. The default private directory is the same for this Windows account. Backend startup succeeded. This restart used the existing application configuration; no direct database edits or cloud changes were made.

Uploaded `Protected-document-demo.txt` through the frontend into the selected Emergency Flood Relief project. Upload succeeded. The resulting private file's SHA-256 matches the source. No new public document copy was created.

Live checks:

- Anonymous protected download: HTTP 401.
- Known old public file URL: backend HTTP 401; frontend HTTP 404.
- New private storage key requested through public URLs: backend HTTP 401; frontend HTTP 404.
- The fresh document's Download button completed without an application error. Browser automation did not receive a download event, so final saved-file verification is pending confirmation in the user's normal browser.

The local backend is running separately with logs in `%TEMP%\relief-document-backend.out.log` and `%TEMP%\relief-document-backend.err.log`. Future backend launches must retain private storage configuration. AWS deployment, S3 policies and external caches were not changed or verified. No commit was created.

## Manual acceptance

- Download a PDF and a filename containing Swedish characters; check the filename and file contents.
- Check a reader role, duplicate clicks, switching project while a download is pending, and an expired session.
- Confirm Admin metadata editing preserves the stored file; the key cannot be edited.
- Delete a document and confirm a fresh download is denied. Restore it and confirm download resumes when its parent and content are valid.
- Confirm old public URLs fail on both frontend and backend origins after the storage rollout. Project images should still work.

## Verification

Focused checks: 35 tests across download utilities, document permissions/actions, file validation and the Admin update form passed. The complete frontend suite passed: **287 tests across 50 suites**. SCSS compilation, JSX parsing and whitespace checks passed. Live local rollout checks are recorded above; broader manual cases below remain separate acceptance checks.


Production build completed successfully after cleanup. Both public/documents and build/documents contain zero files. Build warnings include existing lint/bundle-size warnings and the intentional control-character filename-sanitization regex warning in documentDownload.js. Final git diff --check passed.

## Follow-up: restore existing demo documents privately

The user subsequently approved making all old demo files available again. Recovered all 30 original document blobs from Git HEAD directly into `C:\Users\dmarl\.relief-projects\documents`, preserving their original storage keys. Each restored file was verified against its Git blob hash. No existing files were overwritten, no duplicate document records were created, and no database metadata was changed. The freshly uploaded test file was retained.

This supersedes the earlier missing-file state: existing records whose keys match these files can again use protected downloads, subject to normal document/parent state and authorization. Deleted records remain deleted. Both frontend public and build document directories remain empty. The known public document URL still returns backend 401 and frontend 404. Individual authenticated downloads for all 30 records were not exercised.
