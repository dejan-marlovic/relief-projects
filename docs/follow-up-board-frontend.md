# Follow-up workflow board

Implemented against the final V46 contract in the backend's `docs/follow-up-board.md`. User confirmed rebuilding and restarting the coordinated V45/V46 backend on 3 October 2026. Application schema was not independently inspected by this frontend task.

## Scope

Follow-ups offers List and Board for selected-project work and My follow-ups. The board has To do, In progress and Done columns with independent bounded pagination and server totals. Board is the default after capability detection; an explicit saved List preference is respected. Only view preference is persisted. Existing OPEN/COMPLETED filters remain in List; dates and project-only employee filtering apply to both views. Deleted and inactive-project records use List. Deadline groups remain independent of workflow progress. Cards use one collapsible Details & activity section for full description, assignment, deadline and recorded attribution; the redundant Follow-ups stepper has been removed.

An ordinary list response must advertise `workflowSupported: true` before board queries or progress commands are used. Old servers remain in List. Drag handles move cards using the same permitted commands as the buttons. Available destinations are highlighted. Done → To do requires confirmation; Done → In progress requires reopening and then a separate Start work action. External drops and stale drags after refresh are ignored. Keyboard and touch users retain the action buttons. No ordering, extra task system, notifications or new assignment authority was added.

Start work and Return to To do use the dedicated revision-checked progress command. Complete, reopen, metadata, deletion and restoration retain their existing endpoints. Capabilities govern visible actions. Failed actions retain their intent, refresh the direct task and lists, and require explicit review before retrying; edit text is retained. Uncertain creates require checking for an existing result before another save. No automatic write retries or optimistic movement.

Column reads are independent observations, not an atomic portfolio total. Duplicate loaded IDs use the newest revision. A business-date mismatch gets one bounded read retry; continued mismatch requires manual refresh. Requests are aborted on scope/filter changes. Focus and periodic reads refresh current data. Linked-task displays in findings/lessons and travel/reporting show the new progress state; old snapshots are unchanged. Calendar export still uses OPEN compatibility.

## Manual smoke test

1. Open **Project work → Follow-ups → Board**. Create an assigned task; it appears in To do.
2. Drag using **Drag to move** into In progress, then Done. Verify the card moves after saving. The Start work and Mark completed buttons remain equivalent alternatives.
3. Drag Done back to To do and confirm reopening. A direct drop from Done to In progress is unavailable; reopen first, then start work. Existing calendar export remains available for incomplete tasks.
4. Check My follow-ups, List, date/employee filters and narrow-screen stacking.

Later acceptance should cover stale revisions/reassignment, lost responses, deleted/inactive records, independent column pages and linked-record review warnings with realistic seed data. Live mutation acceptance remains user-controlled.

## Verification (3 October 2026)

- Full frontend suite: 641 tests across 97 suites passed.
- Final focused rerun after the last guards/notification adjustments: 49 tests across 7 suites passed, including three additional cases.
- Production build passed with existing lint/bundle-size warnings; targeted ESLint and `git diff --check` passed.
- Browser attempt reached the login page; signed-in visual and live mutation acceptance remain pending. No demo records were changed.
- No backend edits, application-database access, commit or push by this frontend task.

### Drag-and-drop follow-up

Board-default and drag-handle changes passed all 40 Follow-ups tests, targeted ESLint, whitespace checks and the production build (existing warnings). Tests cover allowed transitions, permission denial, external drops, confirmation cancellation, conflicts and drag cancellation on refresh. No backend changes or live task mutations were needed.
