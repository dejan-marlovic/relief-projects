# Project closeout and archive frontend

Implements the backend V36 contract in `D:/projects/relief_projects/docs/project-closeout.md`. On the Project page, expand **Closeout & archive** above the project snapshot.

## Behavior

- Acceptance, administrative closeout, archive filing assertions and their review flags are separate from the existing project status/approval fields. No other module is frozen.
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
5. Change acceptance after closure. Verify closeout and archive review flags. Explicitly reopen and close again; verify archive review persists until reaffirmation.

No application data was changed by frontend implementation; live acceptance remains user-controlled. No backend edits, restart, commit or push were performed.

## Automated verification

- 11 focused closeout tests passed.
- Full frontend suite: 484 tests in 79 suites passed.
- New component lint and final whitespace checks passed.
- Production build passed with existing unrelated warnings (source maps disabled for this verification run).
- No live administrative decisions were submitted by this task.
