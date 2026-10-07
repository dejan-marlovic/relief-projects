# Archive storage review frontend

Adds step 4 within Project Closeout & archive for backend V53 capability `archiveReviewVersion: 1`.

- Displays server-calculated candidate, recorded and effective dates separately; no browser anniversary calculation or date override.
- Shows due state and Stockholm observation date, current acceptance and retained donor/evidence basis, original acceptance attribution and decision attribution.
- Confirm / mark unresolved use backend permissions and PUT archive-review with only expectedRevision, status and reason.
- Existing closeout draft recovery preserves reason and original revision after failures, refreshes state/history and requires explicit reconsideration; no automatic retry.
- Historical snapshots display retained review decisions without applying current due observations. Older history remains supported.
- Existing entry/focus/manual refresh and post-command refresh include the observation. Unknown capability versions expose no review controls.
- This is a digital storage review reminder, not permission to destroy or move files. Paper-storage timing remains unresolved.

Manual smoke test after V53 deployment: on a demo project with accepted final report, current administrative closeout and current archive filing, open step 4. Confirm the displayed donor approval basis with a reason. Verify recorded/effective date and ARCHIVE_REVIEW history after refresh. Mark unresolved with a reason and verify the effective date disappears while history remains. Acceptance marked not applicable must not produce a fallback date.

Focused automated checks cover command bodies, capability gating, invalidated basis display and stale-draft preservation alongside existing closeout regressions. No application database or service lifecycle changes performed by frontend work.

Verification: 16 focused closeout tests passed; changed production components passed ESLint; production build passed with existing warnings. User confirmed the live acceptance/closeout/archive/review flow (2026-10-07 approval to 2036-10-07 review, Upcoming) and automatic scrolling to each action form. Broader withdrawal/reaffirmation acceptance remains pending. Action forms receive focus and scroll on opening, respecting reduced-motion preferences.
