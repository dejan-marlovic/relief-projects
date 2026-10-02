# Project travel frontend

2 October 2026. Implements the V41 contract in the sibling backend's `docs/project-travel.md`. Backend rollout and live acceptance remain user-controlled.

## Delivered behavior

- Travel appears under Project work on desktop and in the phone page selector, at `/travel`.
- Selected-project requests have state, traveller Employee ID, departure-range and deleted-only filters, with database pagination. Empty lists retain the server's creation permission.
- Create/edit use one Employee and date-only inputs. The server business date supplies new-request defaults. Past drafts are allowed; server capabilities and issues explain submission/approval eligibility.
- Submit, approve, return, withdraw, cancel, delete and restore use server capabilities, aggregate revisions and exact submission/approval IDs. Approval needs an independent person; ADMIN has no bypass.
- Current submission and approval show attribution and frozen allowlisted decision bases. Earlier decisions remain in paginated history. Submitted/approved details cannot be edited through the page.
- Existing PREPARATION/REPORTING follow-ups are selected with their reviewed revisions. Opening Follow-ups in another tab lets users create/manage a task, return, refresh and link it. This page never creates, completes, cancels or deletes tasks.
- Supporting evidence selects exact versions, including eligible historical versions, and uses existing authenticated downloads. Current availability remains distinct from captured labels and approval-time observations.
- Approved-submission links and later additions are labelled separately. Removal addresses the association episode and follows its server permission; unavailable evidence cannot be downloaded.
- Cancellation is terminal. Restoration preserves the retained state and never restores approval.
- Forms retain drafts on failures, refresh related data and require explicit review before retry. Decision retries adopt the refreshed decision ID only after acknowledgement; task-link retries require reselection. There is no automatic mutation replay or create retry.
- Focus/visibility return refreshes live observations. Unsaved-change guards, transient success notifications, themed cards, wrapping actions and single-column phone forms follow existing UI patterns.

## Files

New page, editor, views, payload helpers, styles and tests are in `src/pages/Travel`. Shared changes add the route, navigation entries, navigation coverage and travel-specific success notifications. Existing read helpers, task/document pickers, attribution and escaped history rendering are reused.

## Manual smoke test

After restarting IntelliJ with V41:

1. Open Project work → Travel on an active project. Create a request with a traveller, purpose, destination and future departure/return dates.
2. Optionally link a ToR document and an existing Preparation follow-up. Submit the request. Confirm the trip details are now read-only.
3. Log in as a different ADMIN/APPROVER mapped to a different active Employee, who is neither the traveller, creator nor latest submitter. Approve with a note. Inspect the frozen approved submission and history.
4. As a manager, link a report document after approval. Confirm it is labelled outside the approved submission and no follow-up is completed automatically.
5. Later acceptance can cover return/resubmit, withdrawal/edit/reapproval, cancellation/deletion/restoration, stale commands and unavailable links using the backend's full checklist.

The first three steps need two independent people/accounts. Two usernames mapped to one Employee do not establish independent approval. A one-account smoke test can cover creating and submitting, but not a successful approval.

User smoke acceptance on 2 October: Dejan created/submitted request #1 for Paul Martin; Dario independently approved it. Submission and approval attribution/history were visible. User subsequently withdrew approval and confirmed the returned request remained available in the correct project. Extensive realistic-data acceptance remains planned.

Visual follow-up: Travel uses the existing lifecycle badge palette. Shared `src/styles/_approval-actions.scss` now gives Budget, Transaction, Payment order and Travel actions the budget Submit/Approve/Return appearance, including the return confirmation dialog. Table actions retain compact desktop icons and existing mobile labels; Travel includes matching icons, including an amber withdrawal action. Existing 55 focused tests passed for these affected controls; no permissions or transition logic changed.

## Verification and limits

- **566 tests across 88 suites passed**, including 16 new travel tests and desktop/phone navigation coverage.
- Targeted ESLint passed. Production build passed with existing unrelated lint and bundle-size warnings; no Travel warning was reported.
- Final diff and new-file whitespace checks passed. No commit or push.
- Tests cover strict payload selection, date-only inputs, captured decision IDs, server permission gating, required reasons, uncertain-create/stale-command recovery, existing task revisions, exact evidence versions, late/basis distinctions, unavailable downloads and cancelled restoration.
- Browser inspection reached the login page in the isolated in-app browser; no credentials were requested and no live record was created. Live two-person approval and phone appearance remain manual acceptance checks.

Logs are in the local temporary directory: `travel-full.log`, `travel-build.log`. Earlier focused runs identified and corrected test timing and desktop-versus-phone fixture assumptions; the final complete suite passed.

This slice does not implement scheduling, itineraries, formal post-trip acceptance, expenses, bookings, payments or inferred task completion. Approval is a recorded authorization for the captured trip, not proof it occurred.
