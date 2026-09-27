# Budget revisions frontend

Implemented against V37 on 27 September 2026. Backend contract: `D:/projects/relief_projects/docs/budget-revisions.md`.

## Behavior

Each budget has a themed, responsive **Revisions & donor decisions** disclosure. Approved sources offer creation of a named planning revision, with a required reason and explicit new-record currency adoption for eligible legacy sources. The budget list refreshes and scrolls to a newly created successor. Existing lifecycle controls edit, submit, return and approve the new draft.

The family view distinguishes internal lifecycle, latest member, current plan and original financial basis. Successors carry a persistent planning-only notice. Donor approval/rejection and addenda are separate recorded decisions. Role-appropriate controls record, correct or void decisions, add/remove exact-version evidence and explicitly select a governing approval for the current plan. Corrections inherit no evidence. Unavailable evidence remains readable and protected downloads check authorization independently. References and retained history render as escaped text.

Forms retain their input and original expected revision on any failed or uncertain command. State/history refresh without replay; deliberate resubmission requires explicit review and adoption of the current revision. Collapsing a disclosure preserves the draft and navigation uses the existing unsaved-change guard.

## Totals and financial safeguards

Project snapshot now loads `/api/projects/{id}/budget-planning-basis`, then only selected budgets' reporting costs. It rejects duplicate family contributions and distinguishes unavailable families from zero. Any unavailable family suppresses the overall planning total with an incomplete/unavailable explanation. Currency labels include currency IDs to avoid combining different currencies with equal names. Standalone budgets are not claimed to be additive or a financial balance.

Transaction selectors exclude planning-only successors (a retained current reference remains displayable but disabled). Admin creation excludes them; Admin update displays them disabled. Payment cost lookup loads only financially eligible budgets. Existing lifecycle/ownership constraints remain in place and the server is authoritative. Currency-change buttons are disabled for enrolled budgets. Individual budget exports identify revision and planning/financial role without merging family members.

Revision commands refresh family/history, the budget list, and any mounted snapshot; route entry loads fresh selectors. Browser focus refreshes family and snapshot observations. No financial records are reassigned.

## Manual acceptance

1. Use a valid approved budget with valid calculation inputs, saved amounts matching current rates and costs within its limit. Older demo budgets may correctly fail source validation; a newly created and approved budget is the simplest test fixture.
2. Expand **Revisions & donor decisions**, choose **Create planning revision**, enter a name and reason, and save. Check that a new DRAFT with copied costs appears and is labeled planning-only.
3. Edit/submit/approve that draft with the existing controls. Record one donor's approval (optionally selecting an exact document version), then **Select as current plan** with that approval and a reason.
4. Verify the family has one current plan while the original remains the financial basis. The successor must not be selectable for a new transaction. The Project snapshot must not add both revisions.
5. Optionally correct/void the governing approval. Current selection must clear with retained history; the snapshot must show unavailable/incomplete instead of substituting the root or zero. Re-select explicitly after a corrected approval.

## Verification and limits

Focused regression tests cover missing/duplicate planning bases, financial eligibility, revision source versions, explicit donor/evidence bodies, current selection, corrections, unavailable downloads and stale-response draft retention. Final full suite: **493 tests passed across 81 suites**. Focused revision/selector run: **16 tests passed**. Targeted ESLint and `git diff --check` passed. Final production build passed with existing unrelated lint and bundle-size warnings; no new revision-component warnings.

Read-only browser checks against the running backend confirmed the standalone revision panel, creation form at a narrow viewport and revision-aware Project snapshot loaded. The form was cancelled without submission. No live revision/decision was created by this task. The user subsequently confirmed the basic workflow: family #1, original financial budget #26, approved revision #27, recorded donor approval #2 and explicit current-plan selection of #27. Extensive operational testing remains planned.

Executable revisions, obligation carry-forward, family-wide funding capacity, donor quorum and legal verification remain deferred. No application-database changes by this frontend task. Frontend and backend commits authorized by the user after the basic manual acceptance; no push requested.
