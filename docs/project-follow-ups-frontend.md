# Project follow-ups frontend

Added /follow-ups and a Follow-ups navigation tab, with selected-project and cross-project My follow-ups views.

## Behavior

- Server canCreate and per-record permissions drive creation, editing, completion, reopening, deletion and restoration.
- Required title, date-only deadline and active Employee selector; optional plain-text description. Retained inactive assignment can remain during edits.
- Current assignees can use only the actions permitted by the backend. My queue never submits an assignee override and explicitly explains absent/inactive employee mappings.
- Server due buckets and business date/zone are displayed. Open/completed/all status, deadline bucket, inclusive date filters, deleted-only project view and database pagination are available.
- Date inputs are submitted unchanged, with no UTC conversion. Lists refresh every minute while visible and on window focus so business-day changes are reflected.
- Every existing-task mutation carries the loaded revision. Stale or uncertain outcomes reload without retrying; uncertain creates warn about duplicates. Reopening confirms clearing completion attribution.
- View/project changes unmount old queues and abort reads. Re-entering either view fetches fresh records and permissions. Forms keep their original revision during background refresh, so conflicts remain detectable.
- Current actor/time attribution is shown separately from the assigned Employee. No financial/document/checklist side effects are implied.
- Mobile filters and actions stack/wrap; task descriptions remain plain text.

## Verification

- 11 focused tests and all 347 tests across 56 suites passed.
- Component ESLint, stylesheet compilation, diff review and git diff --check passed.
- Browser confirmed route/navigation and rendered controls. The running API returned 'Unexpected error' for the project queue, so live CRUD acceptance remains pending the backend rebuild/restart and V26 application through the user's normal workflow.
- No live task mutations, database changes, backend restart or commit performed.

## Manual acceptance

1. Rebuild/restart backend in IntelliJ with V26, then open Follow-ups.
2. As Admin/Project Manager, create a task for the selected project with title, deadline and responsible employee.
3. Edit it, then mark completed. Select Completed to find it and verify attribution.
4. Reopen, checking that it returns to Open and completion attribution clears.
5. Assign yourself and verify My follow-ups across projects. An assignee without manager role should only complete/reopen their tasks.
6. Check overdue/due-today/upcoming filters. Delete a task, select Deleted follow-ups only and restore as Admin.

Backend contract: D:/projects/relief_projects/docs/project-follow-ups.md.
