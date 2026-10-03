# Travel reporting frontend (V42)

The Travel detail now continues the existing workflow with **3. Report the actual outcome** and **4. Review and accept the report**. Report state and history are separate from travel authorization. The list shows the backend's additive report summary when present.

## Workflow and safeguards

- Creation and basis changes require an explicit retained approval selection (paged V41 history) or an explicit unapproved-plan observation. No approval is selected automatically. Current live travel, captured report plan and actual account are displayed separately.
- Actual dates start blank. Incomplete drafts are allowed. Outcome and material differences have explicit unassessed choices. Not-taken travel requires clearing any existing actual dates; the server validates submission completeness and exceptional authorization explanations.
- Every report command sends the captured report revision and V41 travel revision; creation sends only the travel revision. Accept/return pins the selected report submission, and reopen pins the acceptance.
- Capabilities and issues come from the server. Report creation, editing, basis changes, submission, return, acceptance, reopening, deletion/restoration and report associations use only V42 endpoints. No report action mutates the trip or a linked follow-up.
- Report editors retain drafts after validation/conflict errors and uncertain responses. Refresh preserves the draft and original revisions. Explicit review is required to adopt current revisions; uncertain creation cannot be replayed when an existing report is discovered. Actions wait for the saved revision to load before opening another editor.
- Report editing locks travel mutation/close controls. A failed parent read retains the report editor and blocks saving. Existing unsaved-change navigation protection covers report drafts.
- Submitted reports expose their frozen basis for review. Acceptance requires a reviewer note and backend independent User/Employee eligibility. Accepted corrections use reopen, edit, resubmit and independent acceptance. Notifications say report accepted, never travel approved.
- Report evidence and task associations have independent pages, removed-association filters, metadata availability and current task status. Accepted links and late additions are distinguished. Exact-version download uses the existing authenticated route. Removal follows server per-link permission and preserves the underlying task/document.
- Report history is a dedicated newest-first timeline with actor, reason and saved before/after details. Approval history remains separate.

## Simple manual smoke test

Use an active demo project and a trip that has actually concluded in the scenario. The backend must be running V42. For a current-day trip, report it only after its supposed conclusion; do not treat planned dates as confirmed actual dates.

1. As a manager/Admin, open the travel request. In step 3, choose **Create post-trip report**. Explicitly select the retained approval (use earlier approval-history pages if needed), or deliberately choose the unapproved observation.
2. Enter the reported outcome, actual dates, summary and material-difference assessment. Explain deviations or exceptional authorization. Save. Optionally link a report document and an existing follow-up. These do not inherit links from the trip plan.
3. In step 4, choose **Submit report for review** and save. Confirm the report is Submitted while the trip's authorization stays unchanged.
4. Sign in as an independent Admin/Approver mapped to a different active Employee from the creator, latest submitter and captured traveller. The original trip approver can qualify. Open the same project/request, review the frozen report and warnings, then **Accept report** with a review note.
5. Confirm **Report accepted**, a retained acceptance and report history. An open linked task should remain open. Acceptance does not approve expenses, verify outcomes or grant travel authorization.

Later acceptance checks: return/revise/resubmit; accepted reopen/correction; late evidence versus reviewed evidence removal; stale report and parent revisions in two tabs; unavailable documents/tasks; deleted report restoration; an explicitly explained cancelled-future Not taken report; and preserving drafts on a failed read/save.

## Verification scope

Automated frontend tests cover explicit/retained basis selection, blank actual dates, nullable fields, both revisions, submission/acceptance identities, independence permissions, stale and uncertain results, validation failures, parent-read failure, exact evidence/task links, late associations, deletion/restoration and report-specific success notices. Existing V41 tests remain separate regressions.

No live records, backend configuration, migrations or files were changed by frontend implementation. Backend restart was confirmed by the user; applying V42 and live two-person acceptance are not independently verified by frontend unit tests.

Verification: all **593 frontend tests across 91 suites passed**, including **20 new report tests** and the existing **18 V41 Travel tests**. Targeted ESLint and `git diff --check` passed. The production build passed with the existing unrelated warnings. Live browser/two-person acceptance remains pending.
