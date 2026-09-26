# Follow-up calendar export

## Requirements and scope

This closes a bounded part of the calendar/Outlook integration gap in the [original requirements assessment](original-requirements-assessment.md). It builds on the existing assigned follow-up queue, rather than introducing another scheduling model.

Each open, non-deleted follow-up in an explicitly active project offers **Download calendar entry (.ics)** in both Selected project and My follow-ups. Any reader of that loaded record can download it; no additional write permission is needed. Loading/mutation disables the action, and completed, deleted or unknown/inactive-parent records do not offer it.

The download contains exactly one all-day event on the saved deadline, with title, description, project, responsible employee and record identifiers. There is no automatic collection of other pages or projects. Dates remain date-only, including daylight-saving transitions. Invalid dates fail locally with an error rather than being normalized to a different day.

The file is a snapshot of the loaded record. Existing focus/periodic/manual refresh behavior is unchanged. It may become outdated, and editing, completing or deleting a follow-up does not update an imported entry. Reimport behavior varies by calendar client and may duplicate entries. The UI and exported description explain these limits. No calendar account is connected; the user imports the file separately.

No invitations, attendees, email addresses, automatic alarms, subscriptions or synchronization are created. The event is marked private and transparent (does not reserve busy time); calendar-client handling of these hints is outside this application's control. Existing backend read permissions, lifecycle rules and follow-up mutation requests are unchanged. No backend edits, migrations or live data mutations are needed.

## Format

Serialization follows [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545): CRLF content lines, escaped TEXT values, UTF-8-safe folding at 75 octets, DATE-valued DTSTART and a one-day duration. A stable UID includes the application origin, project ID and task ID. It is not a promise that importing again updates an existing calendar event. No token, credentials or current-page query string is included.

Downloads use a local Blob, a numeric-ID filename and a temporary anchor; the anchor is removed and the object URL revoked. Browser/network/backend writes are not part of export.

## Verification

Targeted verification passed: **43 tests across three suites**, including existing follow-up regressions. Tests cover date boundaries, escaped text/property injection, Unicode folding, stable identities, unavailable records, local download cleanup, read-only access, personal-queue project ownership, refresh disabling and failure behavior. Scoped ESLint and diff whitespace checks passed.

The first full run passed 451 of 452 tests; the existing payment-export test exceeded its default five-second timeout. The final full rerun passed **452 tests across 76 suites** with a 30-second per-test limit. No unrelated test or application configuration was changed.

The Windows worktree path required relative Jest match patterns because CRA/Jest generated an incorrectly escaped match for `.codex`. Verification uses CLI overrides only:

```powershell
$env:CI='true'
npm test -- --watch=false --runInBand --testMatch '**/*.test.js' '**/*.test.jsx' --testTimeout=30000
```

Outlook import and authenticated browser acceptance remain manual: open an active follow-up, download its calendar entry, import it, and verify the deadline/title/description. Edit or complete the original and confirm the imported event does not change automatically. This slice makes no claim of live Outlook integration.

## Files and integration

Owned files: `src/utils/followUpCalendar.js`, its unit tests, `src/pages/FollowUps/FollowUps.jsx`, a new `FollowUps.calendar.test.jsx`, this report and the requirements workstream index. Existing follow-up tests remain unchanged. Development occurs in managed worktree `followup-calendar-export`; integrate only after checking the shared branch for overlapping changes.
