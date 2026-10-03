# Organisation assessment frontend

Implemented against the V45 backend contract in `docs/organisation-assessment.md`. The user confirmed rebuilding and restarting the coordinated V45/V46 backend on 3 October 2026. No application database inspection or writes were performed by this frontend task.

## Placement and scope

Open **Assessment** beside an organisation/role in Project details, or **Assess [organisation] · [role]** in Organizations. The dedicated relationship page identifies the project, organisation and role. When navigating from another project's summary, select the owning project explicitly before working. Unavailable projects retain clearly labelled records.

Organizations also offers a bounded **Assessments across projects and roles** disclosure. It includes current scope, recorded outcome, review flags and captured decision labels, with an option to include deleted assessments. There is no organisation-wide approval badge or eligibility filter.

Before editing an existing relationship, the Organizations page checks enrollment. An enrolled relationship's project/organisation/role cannot be reassigned, including after assessment deletion; the UI explains creating a separate relationship. The backend still rejects concurrent enrollment races atomically.

## Workflow

Four guided sections cover narrative preparation, exact same-project document evidence, independent review, and explicit corrections. Incomplete drafts are allowed. Submit, both review outcomes, return, submission withdrawal, review withdrawal, restricted deletion and ADMIN restoration use server capabilities and captured revisions.

Review records a required explanation and missing-evidence explanation when applicable. It does not change the relationship's role, project approval, funding or operational permission. Contributors cannot bypass independent review. Unavailable selected evidence blocks submission/review according to backend capabilities. Late evidence is labelled outside the reviewed basis; included links cannot be removed before withdrawal.

History, decision snapshots, actors, evidence availability and scope-change warnings are retained. Errors retain form input and refresh detail/history/evidence; retry acknowledgement requires fresh matching revisions and capabilities. There are no automatic write retries. Downloads use protected delivery. Existing unsaved-change confirmation applies to navigation.

## Manual smoke test

1. Select a project and open a relationship's Assessment from Organizations.
2. Create it; fill Capacity, Suitability for this role and Material concerns. Submit for review.
3. Sign in as an independent ADMIN/APPROVER mapped to another active Employee. Record either outcome with an explanation; explain missing evidence if no document was linked.
4. Check the recorded review/history and the organisation's cross-project summary. Confirm ordinary relationship editing explains the fixed scope.

Later acceptance should cover negative reviews, context changes, unavailable/late evidence, stale conflicts, withdrawal/resubmission and deletion/restoration using realistic seed data. Live mutation acceptance remains user-controlled.

## Verification (3 October 2026)

- Full frontend suite: 641 tests across 97 suites passed.
- Final focused rerun after the last guards/notification adjustments: 49 tests across 7 suites passed, including three additional cases.
- Production build passed with existing lint/bundle-size warnings; targeted ESLint and `git diff --check` passed.
- Browser attempt reached the login page; signed-in visual and live mutation acceptance remain pending. No demo records were changed.
- No backend edits, application-database access, commit or push by this frontend task.
