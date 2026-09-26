# Project risk register — implementation

26 September 2026. Implements the [agreed proposal](project-risk-register-proposal.md) across isolated frontend/backend branches named codex/project-risk-register, based on the completed outgoing-payment commits.

## Delivered

The Risks navigation item opens /risks for the selected project. Managers/admins create and edit title, description, responsible employee, likelihood, impact, mitigation plan and next review date. Unassessed values remain distinct from Low; no combined score is invented. Inactive retained owners are identified.

The register supports status, owner, assessment, review-date range, overdue and deleted filters, stable server pagination and explicit refresh. Changing status/deletion clears incompatible overdue filtering. Server business date and capabilities control labels and available actions; inactive project records remain readable.

Close/reopen require a reason. Delete uses a confirmation form and is reversible by an administrator. Closed records must be reopened to edit. History displays actor/time, action reason and immutable before/after snapshots with pagination; it is separate from financial audit history.

Save requests retain the project and revision originally opened. A 409 keeps the draft and blocks submission. Load latest fetches a comparison without changing the draft/revision; Replace draft with latest record is an explicit discard/reset. An uncertain creation stays blocked with duplicate-avoidance instructions. Refreshing the list never silently rebases a draft. Project changes unmount the old editor and abort reads; late write results cannot update the new project view. Backend permissions/revisions remain authoritative.

Existing theme variables, keyboard labels/focus styles and responsive layout are used. Plain text is rendered through React, with no HTML interpretation. Success notifications name risks correctly.

## Contract and rollout

Backend contract: D:/projects/relief_projects/docs/project-risk-register.md (available on the backend risk branch). V35 adds the risk register/history after outgoing-payment V34. Deploy the backend contract/migration before exposing the frontend route. This feature does not alter financial services, execution/reconciliation, document approvals, project approval, or the follow-up/calendar workflow.

## Verification

- Frontend: 473 tests / 78 suites passed, including 12 risk workflow tests and the committed outgoing-payment UI. Changed-file ESLint and git diff whitespace checks passed. Production build passed with existing warnings outside this slice and the existing bundle-size advisory.
- Backend: full suite 1,033 tests passed; three additional race tests were subsequently added without changing production code, and the final 15 risk tests passed on MySQL. All 38 outgoing-payment MySQL tests also passed on the combined schema.
- Migration: 22 disposable MySQL checks passed, including clean install, V34→V35 preservation, constraints and rollback. Temporary database processes, data and credentials were removed. The known unrelated application_themes.background_color schema-validation mismatch is documented in the backend contract.
- Frontend logs are retained under the worktree's ignored build/risk-verification directory; backend logs are under its target directory. No production/application database was used.

Both branches include the prior outgoing-payment commits (frontend c7a33fa, backend 8c1cf8e). The completed risk commits remain local on codex/project-risk-register; shared checkouts, dev/master and remotes are unchanged. Merge these branches through the normal integration workflow before rollout.

The user should perform the following live acceptance after normal rollout:

1. Select a project, create an incompletely assessed risk, then add mitigation and a review date. Verify overdue/today labels against the displayed business date.
2. Edit as a project manager, close with a reason, reopen with another reason, and inspect both historical snapshots.
3. Open the same risk in two sessions; save in one and confirm the other keeps its draft on conflict. Compare latest and explicitly replace the draft.
4. Verify a viewer can read/history only; managers delete and only admins restore. Confirm closed status survives deletion/restoration.
5. Check retained inactive owners, filters/pagination, project switching, narrow layouts and keyboard navigation.

Live acceptance is pending. No application database changes or backend restart were performed during implementation.
