# Requirements workstreams

Coordination snapshot: 26 September 2026. This is a shared index, not a claim that every original requirement has been implemented or accepted. Each task owns its slice report; update this index at scope changes and completion. Do not rewrite another task's report or start its reserved work without coordination.

## Current ownership

| Task | Scope | State / boundary |
|---|---|---|
| Clarify next slice workflow | Main frontend integration, including funding receipts and notification improvements | Latest shared frontend commit at review: `b8bc517`. Leave receipt UI and shared auth/notifications with this task. |
| Catch up on backend work | Current next-slice proposal, following incoming funding receipts | Reserved. User reports a proposal is in progress; closeout handoff has been supplied. Confirm its final scope with this task before starting any overlapping backend feature or migration. |
| Find and fix next project gap | Follow-up calendar export | Implemented and verified: 452 frontend tests passed. Developed in isolated worktree `followup-calendar-export`, branch `codex/followup-calendar-export`; owns FollowUps.jsx, FollowUps.calendar.test.jsx, followUpCalendar.js/test, and this slice's documentation. No backend edits or migrations. Calendar-client import acceptance remains manual. See [calendar export report](follow-up-calendar-export.md). |

Scope notes were sent to both existing tasks before implementation. Latest task-history tooling did not expose text for their most recent turns, so this index explicitly separates the user's reported proposal state from verified code/commit evidence.

## Requirements coverage and remaining work

The [original assessment](original-requirements-assessment.md) is dated 18 September; its missing-feature table is historical. Check newer contracts before choosing another gap.

| Area | Current evidence | Remaining gap / owner |
|---|---|---|
| Financial planning and control | Budgets, precision, limits/conversion, requested/approved funding, allocations, payment commitments, lifecycle and audit contracts | Formal budget revision families and current-approved revision semantics remain separate product decisions. |
| Document foundation | Protected downloads, categories/date/attribution, versions, financial links and project checklist | Checklist evidence does not establish completeness, approval or physical archiving. |
| Actions and deadlines | Assigned project follow-ups, personal queue, completion and date filters | Recurrence, reminders and immutable action history remain deferred. |
| Calendar / Outlook | This slice adds an individual open-follow-up `.ics` snapshot download | Partial coverage only. No subscription, live Outlook sync, invitation sending, email filing or automatic reminders. |
| Incoming funding | Backend funding-receipts contract and frontend commit `b8bc517` | Owned by existing backend/frontend tasks; their reports control verification and remaining acceptance. |
| Outgoing actual payments and refunds | Orders/Booked status are not settlement | Actual payment, reconciliation and refund records/reporting remain separate; coordinate with financial owners first. |
| Project closeout and archive tracking | [Researched handoff](project-closeout-next-slice.md) and backend proposal prompt | Reserved for the current proposal work; no implemented closeout contract was found during this review. |
| Structured risks | Original requirement remains unsupported by a dedicated register | Unassigned; requires a bounded contract for risk, mitigation, owner and review. |
| Results / indicators | Sectors and portfolio counts exist | Targets, observations, periods and cross-cutting markers remain unassigned. |
| Trips and travel approval | Travel document category exists | Request/approval/itinerary/report workflow remains unassigned. |
| Management responses / lessons learned | Memos and generic follow-ups provide a foundation | Dedicated review/response workflow remains unassigned; avoid duplicating the existing action queue. |
| Project assessment / first-stage approval | Current project approval flag and checklist evidence | Formal assessment/decision workflow remains unassigned. |
| Reference/prototype differences | See original assessment | Bilingual titles, geography/theme/target group, account-holder/sort-code and other legacy fields need explicit mapping decisions before implementation. |

## Coordination rules

1. Reserve a bounded slice here and notify affected tasks. Name owned files/contracts and excluded workflows.
2. Prefer an isolated worktree for parallel code work. Share dependencies read-only; keep test/build output local to that checkout.
3. Backend migrations, shared security/error infrastructure and the same frontend page are conflict hotspots. One owner at a time; do not pre-allocate migration numbers in independent tasks.
4. For new domain behavior, follow proposal → agreed contract → backend → frontend → manual acceptance. Small additive features using established contracts may proceed within the user's authorized scope.
5. Commit only the slice's files. Before integrating, compare its base with the current shared branch, check for overlapping files and preserve unrelated working changes. Integrate one commit at a time; stop and coordinate on real overlap.
6. Record tests, limits, commit and next owner in the slice report. Update this index when the scope/state changes; a green test run is not full operational acceptance.

This approach permits more than two tasks, but cannot guarantee zero conflicts. Explicit ownership, isolated edits and one-at-a-time integration make conflicts visible and recoverable.
