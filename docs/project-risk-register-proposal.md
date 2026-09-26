# Project risk register — proposed first slice

Status: all three product choices agreed by the user on 26 September 2026. Owner: **Find and fix next project gap**. Implemented in the isolated risk branches; see the [implementation report](project-risk-register-frontend.md) for verification and pending live acceptance. The application database has not been changed.

## Evidence

The original [project specification](<D:/Operationella dokument för bistånd/Databas project specification  (kopia).odt>) explicitly lists project-related risks. The [2023 archive guide](<D:/Operationella dokument för bistånd/Arkivering (Internationella projekt) ny 2023_1.odt>) identifies a risk matrix among approved application documents. Their text was inspected directly. Neither supplies an application rating scale, permission policy, risk scoring formula or closure process. The following choices are recommendations, not requirements claimed from those documents.

The [original assessment](original-requirements-assessment.md) identifies the absence of a structured risk register. Current source inspection found no dedicated risk model/API/page. Project follow-ups already provide an Employee assignee, date-only deadline, server permissions, revisions, project locking and retained inactive assignments. Their current attribution is not immutable history. Existing authenticated project reads are broad; assignment does not create project-specific access.

The risk register describes uncertain threats, their assessment and mitigation. Follow-ups remain dated actions. No tasks are automatically created, completed or linked in this slice, and an uploaded risk matrix does not become structured risks automatically.

## Product choices for agreement

1. **Three descriptive levels, with unknowns preserved.** Likelihood and impact each allow LOW, MEDIUM, HIGH, or null displayed as Not assessed. No numeric score, multiplied rating, automatic combined severity, probability threshold or approval gate. A user can record an incompletely assessed risk without falsely classifying it Low. Labels describe the current assessment; no separate inherent/residual rating in version 1.
2. **Existing project-read policy and manager editing.** Any authenticated project reader can read the register and its history. ADMIN/PROJECT_MANAGER can create, edit, close, reopen and soft-delete; only ADMIN can restore. Naming an employee as owner does not grant mutation permission. FINANCE, APPROVER and VIEWER alone remain readers. This explicitly follows existing project access rather than introducing confidential/project-member-only risks.
3. **Open/closed workflow with retained history.** Closing requires an explanation; reopening requires an explanation too. Closed risks must be reopened before editing. Each meaningful operation creates a dedicated immutable risk-history event with authenticated actor/time and changes. No changes to the financial audit model or its endpoints.

## Proposed record and behavior

| Field | Proposed contract |
|---|---|
| projectId | Derived from path; immutable. Risks cannot move projects. |
| title | Required, trimmed, 1–200 Unicode code points. |
| description | Optional plain text, up to 4,000 code points. Blank becomes null. |
| ownerEmployeeId | Required active Employee on create or reassignment. Existing inactive owner may be retained and clearly flagged. No login or project assignment required, matching existing follow-ups. |
| likelihood / impact | LOW / MEDIUM / HIGH / null. No default inferred rating. |
| mitigationPlan | Optional plain text, up to 4,000 code points. Blank becomes null. |
| reviewDate | Required strict YYYY-MM-DD, years 1000–9999, no timezone conversion. Past dates allowed and shown as overdue rather than rejected. It is a next-review date, not evidence that a review occurred. |
| status | Server-managed OPEN initially; CLOSED only through an explicit close command. |
| closureReason | Required 1–1,000 trimmed code points when closing. Preserved in the close history event. Reopening clears current closure details but retains previous events and records a reopening reason. |
| revision | Server-managed optimistic revision; required on every existing-record mutation. |
| attribution | Server-owned UTC creation/update and close actor/time. No user email/profile or invented historical attribution. |
| deletion | Soft deletion only, separately represented from CLOSED; restoration does not reopen a risk. |

Use literal plain text in the UI; no rich HTML or URLs interpreted from descriptions. Updates preserve omitted fields; explicit null clears optional fields but fails required-field validation. Reject unknown input fields and client-supplied status/attribution rather than silently implying they were honored. Equivalent normalized updates are no-ops: no revision increment or history event. No legacy risks are inferred from memos, documents or follow-ups.

Mutations require an explicitly active project and a persisted active authenticated user. Project status names and the Yes/No project approval flag do not control risk editability. Deleted or legacy-null-active projects are read-only, and retained risk/history remains readable under the existing project read policy. Do not add risk-based project/employee deletion blockers: preserve current deletion rules, retain links/history and flag inactive parents/owners. Project restoration re-enables the usual rules without changing risk status or revision.

## Proposed API and frontend

The agreed route shape is implemented on the risk branch; availability in the running application depends on normal rollout:

| Method | Route / purpose |
|---|---|
| GET, POST | `/api/projects/{projectId}/risks` — list/create |
| GET, PUT | `/api/projects/{projectId}/risks/{id}` — read/update |
| POST | `/api/projects/{projectId}/risks/{id}/close` and `/reopen` |
| DELETE | `/api/projects/{projectId}/risks/{id}?expectedRevision=...` |
| PUT | `/api/projects/{projectId}/risks/{id}/restore` |
| GET | `/api/projects/{projectId}/risks/{id}/history` — paginated immutable events |

List filters: OPEN/CLOSED/ALL, owner, likelihood, impact, explicit unassessed filters, review-date range, overdue-only and deleted-only. Default OPEN/non-deleted, sorted reviewDate then ID; page size 20 with a bounded maximum of 100. Overdue is meaningful only for open, non-deleted risks in active projects. Return a server business date/timezone (Europe/Stockholm default, consistent with the existing follow-up convention), page metadata, project activity and server-computed capabilities. The first version is a selected-project register; no cross-project dashboard or heatmap.

All existing-record commands require expectedRevision. Close/reopen also require reason. Use 400 field errors, 403 denied action, 404 missing/wrong-parent record, and structured 409 stale/state conflicts. Never infer a move from a body project ID. Reads use private/no-store responses. Do not expose unrestricted global risk history.

Frontend: a dedicated Risks page for the selected project, reachable from existing navigation, with readable labels, status/owner/review filters, plain-text editor, close/reopen dialogs, deleted view for authorized actions, and record history. No numeric/color-only severity indicators. Keep unknown/inactive states explicit. Use server capabilities rather than hard-coded role assumptions. Preserve the user's draft and its loaded revision after stale edits; refresh separately without resubmitting. Abort old reads when project/view changes. Uncertain creation must warn about possible duplication rather than automatically retry.

## Integrity and independence

- Prefer new risk entity/request/DTO/controller/service and dedicated history model/table. Do not reuse financial audit enums, serializers or services being modified by outgoing payments.
- Lock and recheck the project, then risk, then any newly assigned employee in a documented consistent order. Check current revision/state before mutation. Prove compatibility with existing project/employee deletion locks; do not change their policy just to simplify the new feature.
- Mutation, revision, attribution and history insert commit atomically. Validation failure, stale revision, audit failure and commit failure leave both record and history unchanged.
- Capture immutable changed values and readable actor/owner labels at event time; later renames must not rewrite prior events. Keep current display separate from recorded snapshots. No-op commands with a current revision produce no duplicate events; stale revisions still conflict.
- Required shared integration points are SecurityConfig (specific risk matchers before broad project routes), structured exception handling, migration registration and frontend route/navigation. Coordinate those small edits before integration; isolate all other files.
- Outgoing payments now has committed V34. The backend task confirmed risk allocation V35, and the risk branch incorporates that completed baseline.
- Use separate backend/frontend worktrees and scoped commits. No application database access, IntelliJ restart, applied-migration edits, file relocation or production data backfill. Use disposable databases only for verification.

## Verification and delivery

Backend: authorization including owner-without-manager role; required/null/unknown/Unicode validation; date/leap-day and business-midnight cases; filters/paging; inactive owners/projects; wrong-project IDs; close/reopen reasons; no-ops; stale revisions; deletion/restoration; immutable history through renames and reopening; concurrent updates/close/delete and parent/owner state changes; audit and commit rollback. Run focused and full backend suites, then disposable MySQL migration preservation and concurrency/rollback checks.

Frontend: read-only and editable roles from capabilities; creation/editing; partial assessments; filters; correct selected-project binding; retained inactive owner; close/reopen and history; soft delete/restore; draft preservation on conflict; no retries after uncertain writes; refresh/unmount handling; responsive keyboard-accessible forms. Run focused/full frontend tests, lint/build checks and a short manual workflow using demo data through the UI after the user's normal backend rollout.

The user agreed to the three product choices above before implementation. This checkpoint followed the established proposal-first workflow; it is not a claim that the source documents prescribe these choices. This task implements both repositories and provides the final contract/report without delegating implementation to the financial tasks.
