# Project closeout and archive frontend

Implements the backend V36 contract in `D:/projects/relief_projects/docs/project-closeout.md`. On the Project page, expand **Closeout & archive** above the project snapshot.

## Behavior

- Acceptance, administrative closeout, archive filing assertions and their review flags are separate from the existing project status/approval fields. Administrative closeout alone does not lock project work. Under the November 2026 archive-lock policy, MARKED_ARCHIVED locks ordinary project and related-record mutations until explicit unarchiving, even when archive review is required. Attributed storage-review decisions remain available as an explicit exception.
- Server action flags determine available controls. Deleted/unavailable projects and ordinary readers remain read-only.
- Acceptance explicitly selects exact document versions, including none, with an explicit selection confirmation. New versions are never substituted. Downloads use the authenticated document helper.
- Closing requires a date, reason and acknowledgment/explanation for observed outstanding warnings. Archive dates follow the current closeout date; physical/digital references are rendered only as escaped plain text.
- Acceptance changes after closure show the required reopen/close workflow. Archive review remains separately visible until explicit reaffirmation.
- Readiness presents observed warnings and coverage, not a completion percentage. Financial completion is not assessed and storage is not checked. Partial coverage is prominent.
- Paginated financial observations retain exact strings, nulls and currency context. Restricted rows expose no financial identity. Recipient and order comparisons are distinct; no project balance is calculated.
- Dedicated decision history renders before/after snapshots, captured evidence labels, actors/timestamps, reasons and observed warning snapshots.

## Refresh and conflicts

Opening/re-entering the panel, returning to the Project page, browser focus, manual refresh and each command outcome refresh observations. Navigating to the checklist, open risks or open follow-ups uses the selected project and their existing default views.

Drafts are registered with the existing unsaved-change guard. Validation/conflict/network errors retain input and its original revision. Submission is blocked until the user reviews refreshed state/history and explicitly chooses the current revision, or cancels an already-completed draft. No automatic command retry, revision advancement or financial-style idempotency key is introduced.

State and readiness are separate backend observations; neither is a cross-workflow atomic certificate. Acknowledgment records observed warnings without resolving source records. Archive references assert filing and do not relocate, verify or enforce retention of files.

## Manual acceptance

1. Restart the backend normally to apply V36. Open a selected project and expand **Closeout & archive**.
2. Record final-report acceptance with date/accepting party, or reasoned Not applicable. Explicitly confirm the selected evidence (none is permitted).
3. Review warnings/coverage. Record administrative closeout with its date/reason, acknowledging outstanding items with an explanation if needed.
4. Record archive filing with both references. Verify all decisions and original evidence labels remain in history.
5. Unarchive before changing acceptance on an archived project. Change acceptance after closure. Verify closeout and archive review flags. Explicitly reopen and close again; verify archive review persists until reaffirmation.

No application data was changed by frontend implementation; live acceptance remains user-controlled. No backend edits, restart, commit or push were performed.

## Automated verification

- 11 focused closeout tests passed.
- Full frontend suite: 484 tests in 79 suites passed.
- New component lint and final whitespace checks passed.
- Production build passed with existing unrelated warnings (source maps disabled for this verification run).
- No live administrative decisions were submitted by this task.

## Archive selection and attribution (November 2026)

- The project selector hides archived projects by default. Show archived projects includes them with muted styling and an explicit Archived label; they remain selectable for reading.
- A currently selected archived project remains selected when the checkbox is cleared, with an explanatory notice. Initial fallback selection prefers an active project.
- The selector reads the server-owned `archived` boolean from `/api/projects/ids-names`; project status names are not interpreted as archive state.
- Successful archive/unarchive commands and browser focus refresh project metadata. Failed refreshes preserve the last known selection and archive state, and older responses cannot overwrite newer ones.
- Legacy role-based editing controls additionally check the target project's archive state. Server-issued workflow permissions and backend mutation guards are authoritative, including cross-project and direct API operations.
- Closeout displays discreet Archived by / Unarchived by labels from `latestArchive` / `latestUnarchive` (actor and occurredAt), with the recorded time in a tooltip. Existing archive attribution is a fallback; missing historical actors are never invented. Both decisions remain in retained history as Project archived / Project unarchived.
- Verify with an archived fixture: hide/show/select, download/export, denied edits including admin, storage-review decision, unarchive and restored edit permissions. Browser acceptance awaits the completed backend lock and restart.

Frontend verification for the archive-lock change: the full run passed 127 of 128 suites (849/852 tests); its three failures were an async refresh assertion in FinancialDocuments. After changing that assertion to await the refreshed link, all 18 FinancialDocuments tests passed. The added actual-project archive hook test and the final 20-test Layout suite also passed. Production build passed with existing lint/bundle warnings; strict CI build treats those existing warnings as errors. Backend enforcement and browser acceptance are tracked separately.
