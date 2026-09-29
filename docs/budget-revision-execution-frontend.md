# Budget revision execution frontend

Implemented against V38 on 28 September 2026. Backend contract: `D:/projects/relief_projects/docs/budget-revision-execution.md`. This extends the V37 report; its planning-only restriction is superseded only by explicit activation.

## Controls and meaning

Budget **Revisions & donor decisions → Financial execution** distinguishes original budget, current plan and executable budget. It shows execution status, shared cost ceilings, retained obligations, unavailable comparisons and suspension. ADMIN/APPROVER can request an activation preview for the displayed budget. Confirmation sends the preview's family, execution and budget revisions, governing decision, budget ID and a required reason. No amounts or mappings are submitted. Blockers prevent confirmation; activation is never implied by copying, internal approval or current-plan selection.

Transaction **Details & activity → Revision funding assignments** displays the original award, executable use plan, exact approved funding, obligations counted once, unused approved funding, exact eligible targets and observed maximum additional amounts. Backend eligibility controls creation, changes, reductions and zero release. A target remains fixed; existing pairs use PUT, and creation uses POST. Each reservation is the single backend allocation. Original approved allocations cannot be released here; receipts and actual payments add no capacity.

Command failures preserve input and original expected revisions. State and history refresh, with no automatic replay. Activation requires a fresh preview; assignments require explicit review before adopting refreshed revisions. After uncertain creation, inspect the unique pair and use an existing assignment's update control instead of posting another. Required reasons, exact decimal-string requests, six meaningful decimals, 14 integer digits and unavailable/null amounts are preserved. The server validates capacity and commitment floors atomically.

## Integration

- New transaction choices use `canCreateFundingTransaction`, with compatibility fallback to `eligibleForFinancialUse`. Existing selected references use `financialReferenceEligible`. Main and Admin forms refresh budget policy on execution events/browser focus without replacing entered form values.
- Budget labels/exports distinguish new funding eligibility, retained references and planning-only members. The V37 original-versus-current-plan diagnostic points to execution policy instead of claiming every financial record must stay on the origin forever.
- Existing planning totals still use exactly one selected family member. Execution does not add another plan to reporting totals.
- Payment cost lookups retain previously executable budgets. Allocation-derived line choices include provenance-backed revised rows and identify their funding assignment. No generic request manufactures provenance; existing line and order guards remain authoritative.
- Assignment-managed allocations have no generic save/delete controls and point to the dedicated assignment section.
- Allocation and payment-line audit details render captured optional execution context: family, executable member, governing decision, original/target budget, bucket, assignment, currency and reason. Older events retain their existing rendering and unknown formats have a safe fallback. No historical values are inferred from current state.
- Successful execution/assignment commands use the existing transient success banners. Related history, revision state, budget selectors and allocation observations refresh; payment cost options/lines refresh on route entry or browser focus. Forms remain mounted when disclosures collapse.

## Manual acceptance

For a quick activation check, use the existing approved successor **budget #27**, under **Women’s Economic Empowerment in Crisis Areas**:

1. Open **Revisions & donor decisions → Financial execution → Preview activation of this budget**. Review capacity and any blockers.
2. Enter a reason and confirm. Check ACTIVE status, executable budget #27, retained family history and the new-transaction budget selector. Origin budget #26 remains a historical reference.

To test use of an older award, prepare an **APPROVED transaction on the origin before first activation**, with some approved funding not already reserved in allocations/commitments. Use a family with a valid revised target and enough shared capacity. Do not duplicate an existing award just to test this workflow.

3. Open that award's **Details & activity → Revision funding assignments**. Assign a small positive amount to an eligible revised cost row. Verify unused funding reduces once and one managed allocation appears.
4. On an eligible draft payment order, add a line against that transaction and assigned revised cost. Verify totals/history and that a covered line does not consume the assignment twice.
5. Try reducing the assignment below its displayed commitment floor; expect a conflict and retained draft. A zero release is available only when permitted and retains the record/history.
6. Extended acceptance: supersede the executable plan, check retained lines/totals, invalidate governing approval, verify suspension and explicitly reaffirm using valid donor approval. Check exact-version evidence remains accessible under existing permissions.

The existing demo #27 preview was read live without confirmation: origin #26, current plan #27, governing decision #2, budget limit 5000.000, planned costs 2.800, bucket #124 with zero obligations and 2.800 capacity. This confirms live endpoint/UI compatibility, not mutation acceptance or a suitable existing award fixture.

## Verification and boundaries

Automated coverage includes observed activation revisions, blockers, unavailable capacity, suspension, precise amounts, superseded-target reduction, zero release, conflict draft retention, explicit retry review, historical selector eligibility, managed-allocation controls, assigned payment choices and immutable execution audit rendering.

Full suite: **509 tests across 85 suites**. Targeted lint and diff whitespace checks passed. Production build passed with existing unrelated lint/bundle-size warnings. Live read-only status and preview checks passed at a narrow viewport. Live activation/assignment/payment mutation acceptance remains for the user.

No backend changes, application-record mutations, commit or push by this task. Deferred backend boundaries remain: original approved allocation release, funded splits/merges, atomic redistribution, cross-currency use, per-award donor restrictions and bank reconciliation.
