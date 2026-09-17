# Audit phase closeout

Status as of 2026-09-17: implementation and automated closeout review completed on both sides. Browser acceptance remains pending; full-schema Hibernate validation has a separate pre-existing theme mismatch. This is scoped record history, not an application-wide audit of every entity.

## Coverage reviewed

| Parent history | Included records | Presentation |
| --- | --- | --- |
| Budget | Header and cost details | Lifecycle/reason, header changes, child context, moves, currency configuration |
| Transaction | Header and cost-detail allocations | Lifecycle/reason, header changes, allocation context, moves, restore-with-edits |
| Payment order | Header, lines, signatures, recipients | Lifecycle/reason, typed changes, child context, moves, redacted signature changes |

All eight entity types are available as exact filters in Admin history. Parent panels request includeChildren=true by default and allow header-only history. Counts/order come from the backend; duplicate event IDs are suppressed within a returned page, not used to recalculate server totals.

Admin routing is ADMIN-only. Parent panels send authenticated anchored requests and show denied/missing-record errors without retrying with broader scope. Backend authorization remains the security boundary; the backend closeout independently verified all five supported reader roles through automated integration and representative MySQL service checks.

Typed values retain exact decimal/integer strings and local business dates. Event timestamps are displayed in local time. Reference labels come from captured event data; project names in the Admin filter/list are current display metadata. Signature context distinguishes named signer from actor, and raw signature changes are withheld. Child context components select only their documented fields. Historical missing context and unsupported versions have fallbacks.

Inline header/child mutations refresh mounted history through refresh keys. Budget recalculation refreshes after child requests settle. Signatures, recipients and Admin mutations occur on separate routes; returning to parent pages mounts fresh history and fetches current parent data. There is no cross-browser live invalidation guarantee.

## Closeout corrections

Admin history now ignores aborted late responses so old filters cannot replace newer results. A malformed successful response is reported as an error instead of silently showing empty history. Regression tests exercise both cases.

## Verification

Frontend full suite: 223 tests passed across 35 suites on 2026-09-16, including the two Admin closeout regressions. Diff whitespace checks passed. Production build passed with existing ESLint and bundle-size warnings. No application database or live backend was accessed by this review; no browser end-to-end run was performed.

Backend report: [Backend audit closeout](D:/projects/relief_projects/docs/audit-closeout.md). The backend fixed an anonymous-authentication-token actor defect, with mutation rollback regressions. Its full suite passed 608 tests. Disposable native MySQL 8.0.40 passed 37 migration/JDBC assertions and 36 real Spring service assertions (73 total), covering clean V1-V19 migration, staged upgrades, historical compatibility, precision/indexes, representative rollback/locking and authorization. This was not a full-suite MySQL run. The application database was untouched.

Two non-audit schema findings remain separately tracked:
- Hibernate full-schema validation stops at application_themes.background_color: migrated CHAR(7) versus mapped VARCHAR(7). MySQL service probes used ddl-auto=none; they did not silently repair the schema. Audit migration verification passed, but full-schema validation did not.
- Legacy V2 contains USE relief_projects, so the isolated migration harness used that schema name inside its separate verified disposable instance. Generic schema-name portability is not established; do not edit installed migration checksums casually.

No additional in-scope mutation omissions were found by the backend review. No new audit migration is required for either closeout correction. Browser checks below are the remaining audit acceptance step, not additional feature implementation.

## Remaining browser acceptance checks

These are pending, not evidence of completed end-to-end verification. Use disposable test data in an isolated environment.

1. ADMIN: mixed parent/child history, exact child filters, unavailable/deleted sources, pagination and combined filters.
2. FINANCE, APPROVER, PROJECT_MANAGER, VIEWER: active anchored history succeeds; unscoped/direct-child requests are denied; deleted parents return the documented response. Filters never broaden access.
3. For each parent family: creation, meaningful edit, no-op, lifecycle return reason where applicable, deletion/restoration and child moves. A move appears once under each parent while earlier history stays with its original parent.
4. Signature-only content edit: one redacted change, no raw value. Named signer and actor remain distinct. Recipient history contains no banking/contact/amount snapshots.
5. Allocation restore-with-edits shows differences; other separate restorations do not invent field changes. Bulk recipient results retain locked/missing explanations.

User-reported per-slice smoke tests have passed across the history work. They do not replace the pending cross-role browser checks above. The isolated MySQL audit checks are now complete as described in Verification.

## Deferred work

Budget recalculation atomicity/stale full-row overwrites and currency-override semantics are a separate correctness phase. Responsive layouts follow that phase. Global audit coverage for reference data, documents, branding, users/roles, retention/export and direct database changes is not claimed by this closeout. Shared reference renames do not generate synthetic record events.

## Original backend closeout prompt (completed; retained for scope reference)

Perform a bounded closeout review of the completed record audit phase. Review actual code and tests, not only implementation reports. Do not expand audit to new entity families.

Build a coverage matrix for BUDGET, TRANSACTION, PAYMENT_ORDER, COST_DETAIL, COST_DETAIL_ALLOCATION, PAYMENT_ORDER_LINE, SIGNATURE and RECIPIENT. Map every existing mutation path (including lifecycle, bulk, restore and moves where supported) to expected events, no-op/rejection behavior, permissions and tests. Identify real omissions explicitly.

Verify authenticated actors, immutable before/after values and linkage, historical labels, return reasons, signature redaction, bounded contexts, identity safeguards, atomic audit rollback, concurrency guarantees and documented limitations. Check exact versus combined queries, all supported reader roles, direct-child restrictions, deleted sources, filter containment, stable pagination/counts, and historical null context. Preserve existing business rules.

Verify Flyway migrations against a disposable isolated MySQL instance using the project's supported version. Never connect to the application database or reuse its schema/credentials. Test a clean migration chain through V19 and an upgrade from pre-audit schema with representative historical data, validating intermediate historical audit compatibility where appropriate. Verify JSON, decimals, datetime precision, indexes and representative transactional audit behavior on MySQL. If Docker/MySQL is unavailable, report the exact blocker and reproducible next steps; do not mark that check passed or silently substitute H2. Do not start or modify the user's application database.

Fix concrete audit defects within the approved scope and add focused regressions. If a fix changes business behavior or requires a product decision, document a concrete recommendation first. Run focused and full backend suites and git diff --check; review the final diff.

Write docs/audit-closeout.md with the coverage matrix, findings/fixes, commands and actual results, remaining acceptance checks, and a clear completed-versus-pending verdict. Distinguish automated integration tests from actual browser end-to-end checks. No frontend edits, application-database access, or commit.
