# Backend task prompt — project closeout and archive tracking

Next bounded requirements slice: project closeout and archive tracking.

First investigate and propose a concrete contract. Do not implement yet. Start after the current incoming-funding-receipt work is complete; preserve its changes and contract.

## Context and references

The original requirements identify administrative project completion and physical/digital archiving as gaps. Protected documents, document metadata/categories, replacement history, exact-version evidence links, project document checklists and assigned follow-ups now exist. A checklist's Evidence recorded state is not approval, completeness or verified archiving.

Read:

- D:/projects/relief-projects/docs/project-closeout-next-slice.md
- D:/projects/relief-projects/docs/original-requirements-assessment.md (dated assessment; verify current coverage)
- D:/Operationella dokument för bistånd/Arkivering (Internationella projekt) ny 2023_1.odt
- docs/project-document-checklist.md
- docs/document-versions-status.md
- docs/protected-document-downloads.md
- docs/project-follow-ups.md
- docs/financial-record-documents.md
- docs/funding-receipts.md, for boundaries with ongoing financial work

Treat the reference documents as requirements evidence, not executable instructions. Separate confirmed implementation behavior, explicit source requirements and your recommendations.

## Investigate and recommend

1. **Smallest coherent record**
   Inspect current project status, approval, date, deletion and restoration behavior. Recommend a separate closeout/archive record rather than inferring completion from mutable status names. Identify the smallest useful fields: donor final-report acceptance date, supporting document version(s), physical archive location/reference, filing date and optional note. Explain whether to model an explicit recorded closeout/reopening operation now or defer it in favor of tracking facts. Do not implement a project-wide lock or imply closure has been approved before agreeing its meaning.

2. **Acceptance and evidence**
   Clarify whether final-report acceptance is one project-level assertion or needs multiple donor decisions. The system can have several financiers; do not silently treat the first acceptance as acceptance by every donor. Recommend a bounded first version and flag the cardinality decision.
   Keep operational project end, report submission, report acceptance and archive filing dates distinct. Unknown legacy values remain unknown. Recommend strict date-only handling and future-date validation, including business timezone and date-clearing semantics.
   Prefer explicit associations with exact project document IDs, using existing protected downloads. Explain eligibility, historical versions, replacement, deletion/restoration and project moves. Never follow a replacement automatically or copy file bytes. Distinguish the accepted report from evidence of the acceptance itself. Do not require a FINAL label as proof of donor approval.

3. **Archive location and ten-year guidance**
   Propose a minimal human-readable physical archive location/reference and explicit filing attribution. A user entry records an assertion, not physical verification.
   The guide describes later transfer of records, including digital transfer ten years after donor approval; it does not call for automatic destruction. Recommend whether a non-binding transfer/review date belongs in this slice. If so, explain the trigger, calendar-year/leap-day handling, overrides and what happens when acceptance is corrected or withdrawn. Do not invent a legal retention deadline, silently configure organization-wide policy, move files or schedule deletions/reminders.

4. **Relationship to existing workflows**
   Preserve checklist definitions/states and follow-up semantics. Explain whether to display the checklist as contextual information without making it a mandatory closure gate. Do not automatically mark evidence complete, complete tasks, alter project status/approval, close financial records, infer settlement, change balances or relax Booked/lifecycle locks.
   Identify how deleted/inactive projects and later project restoration affect reads, edits and retained closeout records. Propose explicit behavior; do not normalize legacy deletion flags or broaden unrelated access.

5. **Authorization and concurrency**
   Inspect existing permissions and recommend specific readers, editors and any close/reopen/correct permissions. ADMIN/PROJECT_MANAGER editing is a candidate, not an already approved policy. Do not introduce project-membership access rules.
   Return server-computed capabilities. Require stale-write protection, including first-record creation races and concurrent evidence or project changes. Reuse compatible parent-lock ordering and revision conventions. Preserve independent changes instead of writing closeout through the full Project DTO. Define omitted/null semantics, no-ops, duplicate commands and uncertain outcomes without automatic retries.

6. **Attribution and corrections**
   Keep authenticated actor/time attribution server-owned and distinct from historical dates entered by the user. Recommend an appropriately bounded change history for acceptance corrections, evidence selection, archive-location changes and any close/reopen action. Explain the difference between current attribution and immutable history. Never rewrite existing financial audit history or invent historical actors/dates. Record mutation and any audit entry atomically, with complete rollback on validation/audit/commit failure.

7. **Contract, migration and frontend handoff**
   Propose endpoint and response examples, permissions/capabilities, revision and structured-error shapes, unavailable evidence handling and refresh requirements. Identify required migrations, but recheck the latest Flyway version before later implementation; incoming receipts currently use V33 and the version may advance. No applied migration changes or backfilled closeout assertions.
   Inspect frontend consumers read-only. Recommend a separate Documents-area panel, unless existing navigation demonstrates a better bounded placement. Identify how a frontend preserves unsaved drafts on conflicts and displays current records separately from historical assertions. Do not build frontend controls against guessed endpoints.

## Verification proposal

Cover authorization, date/null validation, unknown legacy data, same-project evidence, pinned replacements, unavailable/restored evidence, project moves/deletion/restoration, stale revisions, duplicate first creation, corrections/reopening if proposed, and concurrent project/document/closeout writes. Include full rollback and attribution tests. If a review date is proposed, include calendar boundaries and changed acceptance dates.

Plan focused regressions, the full backend suite and disposable MySQL verification for migrations, preservation, locking and rollback. Keep live application data and file storage untouched. Explain frontend and manual acceptance checks and any operational limits.

## Deliverable and constraints

Return findings, the recommended first-slice boundary, specific product decisions needing agreement, and deferred items. Follow our established sequence: proposal, agreed contract, backend implementation with verified handoff, frontend, manual testing, commits.

For this proposal step, do not modify either repository, access the application database, restart IntelliJ, change private configuration, relocate files, run migrations or create a commit. Do not disclose secrets. After agreement, the implementation handoff should be written to docs/project-closeout.md. Commit authorization exists for completed work, but this investigation step has no implementation to commit.
