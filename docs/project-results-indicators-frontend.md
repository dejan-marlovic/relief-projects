# Project results and indicators frontend

Implemented against the backend V39 contract in `D:/projects/relief_projects/docs/project-results-indicators.md`.

## Scope

- Separate project-scoped Results tab, available through desktop and compact navigation.
- Indicator creation, editing, soft deletion and permission-controlled ADMIN restoration.
- Explicit unknown baseline, measurement type/unit, direction, inclusive reporting dates and target. Measurement fields freeze after reporting; editorial and target changes require a reason.
- Period-to-date reports with decimal/date strings preserved. No sums, baseline subtraction, percentages of completion or inferred verification.
- Latest effective report and its captured target; target changes retain the old comparison and explain why a current comparison is unavailable.
- Explicit correction, void and reuse of a voided reporting date. Corrections retain the original basis and require evidence to be selected again. Corrected and voided entries remain available.
- Active same-project exact document versions, including historical versions, for evidence. Paginated retained evidence, reasoned removal and authenticated downloads. Removed/unavailable versions stay visibly labelled.
- Paginated results, evidence and dedicated history. Result filters do not change the latest summary.
- Server-returned operation permissions, aggregate revisions, no automatic command retries, preserved drafts on errors and explicit review before retry. Conflicting occupied dates expose the existing entry without automatically correcting it. Uncertain creation warns about duplicate indicators.
- Refresh on window focus and evidence reopening, plus explicit refresh. Success messages use the existing auto-dismiss notification system. Navigation uses the existing unsaved-change guard.

No changes to financial capacity, Statistics, checklist, closeout or backend code. No application-data writes, restart, commit or push by this task.

## Manual acceptance

Restart the backend from IntelliJ to apply V39, then select a project and open Results as ADMIN or PROJECT_MANAGER.

1. Create **Households assisted**, Count, unit **households**, Higher is better, reporting window **2026-01-01–2026-12-31**, known baseline **0** on **2026-01-01**, target **500**. Define how households are deduplicated.
2. Open the indicator and record **320** through **2026-09-20**, then **450** through **2026-09-25**. Latest should show **450**, not 770.
3. Correct the older report to **300**, with a reason. Latest stays 450; the original report is retained. Choose any supporting document explicitly.
4. Edit the target to **600**, with a reason. Existing reports retain target 500 and show the target-change explanation. A correction still uses the earlier basis.
5. Void the latest report, then use **Report again for this date** with a reason. This new report uses the current target 600.
6. Show evidence; verify exact-version download and reasoned removal. View decision history and deleted indicators; check ADMIN restoration.
7. In two tabs, edit the same indicator. The stale draft must remain available, and retry must require an explicit review of refreshed records.

This is not comprehensive live acceptance. A browser verification attempt reached the login screen; no credentials or application records were used.

## Verification

Verification completed:

- 20 Results precision/UI tests passed, covering exact decimal payloads, bounds, frozen fields, unknown baseline, snapshot semantics, corrections, explicit reuse, conflict retention, permission loss and evidence pagination.
- Full frontend suite: **529 tests across 86 suites passed**.
- Targeted ESLint passed; final diff/whitespace review passed.
- Production build passed. Existing unrelated lint and bundle-size warnings remain. The Windows build required filesystem access outside the default sandbox for existing Node dependencies.
- Live browser acceptance remains pending: the temporary browser session reached the login screen. No application records were created by this task.
