# Document categories and metadata — frontend

Implements the approved backend contract in `D:/projects/relief_projects/docs/document-categories-metadata.md`.

## Behavior

- Documents retrieves category labels and ordering from the authenticated lookup. Lookup failure has an explicit retry action; existing downloads remain available.
- Upload controls accept category and optional document date before file selection/drop. Blank upload dates are omitted from multipart requests. All categories are available, including Uncategorized.
- Category filtering uses the backend project-list query. All categories omits the query parameter; Uncategorized explicitly filters unclassified documents. Empty filtered results have their own message.
- ADMIN and PROJECT_MANAGER can edit category/date directly on the Documents page. Clearing a previously set date sends JSON null. Untouched metadata is omitted, and resetting classification sends UNCATEGORIZED.
- The Admin update form supports the same metadata and shows immutable upload attribution separately from editable employee attribution. Stored file keys remain read-only and are omitted from PUT requests. The successful response updates selected metadata; Refresh list resets the form to avoid stale selections.
- The Admin upload form also supports category/date. Removed its misleading employee selector: upload attribution has already been server-controlled by the existing upload endpoint.
- Rows show category, date-only document date, captured uploader and upload time (browser local time). Unknown historical values stay Unknown. Employee attribution is labelled separately and is never treated as evidence of the actual uploader.
- Upload/edit/delete refresh the current list/filter. List requests are cancelled on filter/project changes, and late responses cannot overwrite the current result. Returning from Admin forms fetches the current project's documents again; no cross-project document cache is retained.
- New controls wrap to a single column on small screens and use existing theme colors. Existing protected download and role restrictions remain intact.

## Verification

- Complete frontend suite: 295 tests across 51 suites passed after the main Documents and Admin update changes.
- Additional Admin upload coverage: 2 tests passed after extending that form (297 passing tests across the combined checks).
- Tests cover date clearing, immutable-field omission, optional multipart dates, category filtering, lookup retry, stale responses, field errors, legacy unknown attribution, and role restrictions.
- JSX parsing and Documents SCSS compilation passed.
- Live read-only browser checks: backend lookup returned all ten categories; Finance filtering and switching back to All categories worked. Desktop layout and the editor at 390px were inspected; page width stayed within the viewport. Editor was cancelled without saving. No application data or stored files were changed during these checks.

## Manual acceptance

Run the updated backend from IntelliJ with V22 applied, then refresh the frontend. The category lookup was already available during browser verification; no backend process was restarted by this frontend task.

1. Upload a new document with Finance and a document date. Confirm captured uploader/time and employee attribution are shown independently.
2. Filter to Finance, edit that document to another category, and confirm it disappears from the current filtered list.
3. Clear its date, save, reload and confirm Unknown. Reset category to Uncategorized and verify that filter.
4. Check the Admin create/update forms, a read-only role, and an existing protected download.

No backend edits, direct database changes, file relocation or commit.
