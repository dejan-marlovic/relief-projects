# Requirements workstreams

Coordination snapshot: 26 September 2026. This is a shared index, not a claim that every original requirement has been implemented or accepted. Each task owns its slice report; update this index at scope changes and completion. Do not rewrite another task's report or start its reserved work without coordination.

## Current ownership

| Task | Scope | State / boundary |
|---|---|---|
| Clarify next slice workflow | Project closeout frontend | Closeout/archive panel on Project, decision history, evidence and financial observations implemented; 484 frontend tests and production build passed with existing warnings. Live acceptance pending. See project-closeout-frontend.md. |
| Catch up on backend work | Project closeout backend | V36 contract implemented: 1,050 backend tests, 14 disposable MySQL integration tests and 16 migration checks reported passed. Application rollout/live acceptance remain to verify. |
| Find and fix next project gap | Project risk register | Integrated locally into frontend codex/requirements-gaps (2f443fa) and backend master (e8ec04f): backend V35, frontend Risks page, retained lifecycle history and conflict handling. 473 frontend tests, 1,033 full backend tests, final MySQL risk/payment checks and migration checks passed. See [implementation report](project-risk-register-frontend.md). User relayed backend confirmation that V35 is running and live create/edit, close/reopen, deletion, ADMIN restoration and history checks passed. |

Scope notes were sent to both existing tasks. Risk V35 was coordinated after outgoing-payment V34; its isolated branches incorporate the completed outgoing-payment commits additively. The previous calendar slice is complete in commit ff47f59, merged through dev/master and included in codex/requirements-gaps. The user confirmed downloading the .ics file; calendar-client import acceptance remains manual. See [calendar export report](follow-up-calendar-export.md).

## Requirements coverage and remaining work

The [original assessment](original-requirements-assessment.md) is dated 18 September; its missing-feature table is historical. Check newer contracts before choosing another gap.

| Area | Current evidence | Remaining gap / owner |
|---|---|---|
| Financial planning and control | Budgets, precision, limits/conversion, requested/approved funding, allocations, payment commitments, lifecycle and audit contracts | Formal budget revision families and current-approved revision semantics remain separate product decisions. |
| Document foundation | Protected downloads, categories/date/attribution, versions, financial links and project checklist | Checklist evidence does not establish completeness, approval or physical archiving. |
| Actions and deadlines | Assigned project follow-ups, personal queue, completion and date filters | Recurrence, reminders and immutable action history remain deferred. |
| Calendar / Outlook | This slice adds an individual open-follow-up `.ics` snapshot download | Partial coverage only. No subscription, live Outlook sync, invitation sending, email filing or automatic reminders. |
| Incoming funding | Backend funding-receipts contract and frontend commit `b8bc517` | Owned by existing backend/frontend tasks; their reports control verification and remaining acceptance. |
| Outgoing actual payments and refunds | V34 and frontend completed; user verified a partial payment and matching remaining/excess totals | Refunds, reconciliation and per-cost actual expenditure remain separate. |
| Project closeout and archive tracking | V36 backend contract complete; [frontend panel](project-closeout-frontend.md) implemented | Live acceptance pending. Retention calculations, transfer rules and archive packages remain deferred. |
| Structured risks | [Agreed register and implementation](project-risk-register-frontend.md): ownership, separate assessments, mitigation, reviews and retained lifecycle history | Implemented, verified and integrated by Find and fix next project gap; V35 rollout and live acceptance reported passed by the backend task. Heatmaps, scoring, linked follow-ups/documents and global dashboards remain deferred. |
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
