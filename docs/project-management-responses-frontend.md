# Findings and lessons frontend

Implemented against `D:/projects/relief_projects/docs/project-management-responses.md` (V40).

## Scope and behavior

The **Project work → Findings & lessons** page is scoped to the selected project. It supports FINDING/LESSON creation, observation edits, full management responses, reviews, explicit resolution/reopening, soft deletion and server-authorized restoration. Lessons are labelled as having an optional response; absence of a response is never inferred to mean no action is required.

Management resolution, current completed/open/unavailable task counts, resolution with outstanding actions, and later task-change review flags are displayed separately. Counts and resolution manifests come from the detail response across all active links, not a visible page. Resolved content and associations require reopening; retained decision snapshots remain available in paginated history.

The task selector uses the existing project follow-up API, including completed tasks, and sends the selected task's reviewed revision. **Open Follow-ups in a new tab** reuses the existing creation/editing/assignee permissions. Create a task there, return, refresh and explicitly link it. This page never creates or mutates a task, so a failed link does not create duplicate tasks; the selected ID/title/revision remains in the retained draft until explicit review/reselection.

Evidence selection includes active same-project exact versions, including historical versions. Captured/current labels, availability, removed association episodes and authenticated downloads remain distinct. Pagination includes removed associations when selected. Removing links never deletes the task or document.

Forms use plain strings for dates and text, server today, allowlisted request fields, server capabilities and expected aggregate revisions. Resolution captures the full task manifest when its form opens; background refresh does not silently replace it. Failed commands retain drafts and block repeat submission until the user reviews refreshed state/history. Explicit retry review adopts fresh revisions/manifest; task-link retries require reselecting the existing task. Permission loss keeps submission blocked. Creation failures warn about duplicates. No automatic retries or cross-request transaction claims.

State refreshes on panel entry, commands, explicit refresh, window focus and return to a visible tab. Existing auto-dismiss success notifications cover the new mutations. The existing unsaved-change context protects navigation. Shared pagination buttons explicitly use `type="button"` so task-list paging inside a form cannot submit it.

No backend, financial, task, checklist or closeout behavior changed. No application database access, seed-data changes, restart, commit or push by this task.

## Simple manual acceptance

Restart the backend normally to apply V40, then use ADMIN or PROJECT_MANAGER in an active project.

1. Open **Project work → Findings & lessons**. Create a **Finding** titled **Distribution checks missing**, source **Review**, observed today, with a short explanation.
2. Open the record. Record an **Actions required** response describing a second-person check.
3. Use **Link existing follow-up**, select an open project follow-up, and save. If needed, create one separately through the Follow-ups link, return, refresh and select it.
4. Choose **Record management resolution**. Supply a reason and the required explanation for outstanding work. Save. The record must show **Resolved with outstanding actions** and the task must still be open.
5. Complete or otherwise change the task in Follow-ups. Return and refresh. The management record must remain resolved and show **Review required after linked task changes**.
6. Reopen the record, review, and resolve again. Inspect the previous resolution in retained history.
7. For a smaller independent test, create a **Lesson** and resolve it with a reason without adding any response or task.

Additional acceptance: response replacement retains earlier text; exact document version download/removal/re-addition; deleted records and ADMIN restoration; stale writes in two tabs; evidence/task pagination; inactive projects; viewer and assignee permissions. The default list shows OPEN records; use **Management state → Resolved** or **All states** to find resolved entries after closing their detail panel.

## Verification

Verification completed:

- **19 focused tests passed**, covering command payloads, immutable fields, optional-response lessons, response replacement, explicit task revision selection, full resolution manifests, outstanding acknowledgments, conflict draft retention, reader permissions, exact evidence, paginated retained associations, delete/restore/reopen and uncertain creation.
- **549 frontend tests across 87 suites passed**, including Results and the grouped navigation regressions.
- Targeted ESLint passed. Final diff and new-file whitespace review passed.
- Production build passed with existing unrelated lint and bundle-size warnings. Windows dependency access required the usual build sandbox escalation.

Live application acceptance remains user-controlled. No records were created by this frontend task.
