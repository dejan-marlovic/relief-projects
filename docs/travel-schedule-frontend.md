# Travel schedule frontend

Implemented 3 October 2026 against the V43 backend contract in `D:/projects/relief_projects/docs/travel-schedule.md`. The user reported restarting the backend. This task does not independently verify application migration state.

## Scope

- Overview → Travel schedule is a read-only cross-project list, independent of ProjectContext selection. The header explains the cross-project scope and hides its project selector, consistent with other global overview pages.
- Applied filters and page are stored in the URL. Blank date pairs use the server's Stockholm default window; explicit windows are validated before applying. Trips retain their full saved dates. No calendar, reservations, writes or inferred attendance.
- Active projects use the existing lookup. A bounded, paginated traveller picker uses the applied window/project/state but excludes traveller filtering. Inactive travellers are visible. Employee IDs remain selected even if absent from a later lookup.
- Approval and report states are separate. Deleted reports are labelled as retained/deleted, never presented as current accepted reports. Cross-filter overlap warnings remain visible and do not imply availability.
- Loading, errors, empty results, partial pages and out-of-range pages remain distinct. Totals come from the backend. Focus, visibility return, filter changes and explicit Refresh trigger reads; there is no polling.
- Opening a row honours unsaved-change confirmation, selects its project and navigates to `/travel?projectId=…&requestId=…`. The active project list and exact request detail are read again. A direct link with another selected project asks for an explicit switch; it never opens the ID against the wrong project. The detail can be opened even outside the first request-list page.
- Back to travel schedule restores its previous URL filters. Ordinary browser Back also retains URL filters. Existing application navigation confirmation is reused; this slice does not introduce a new browser-history blocking system.

## Manual acceptance

1. Open **Overview → Travel schedule**. Verify plans from multiple active projects; use **All states** if your examples are drafts, returned or cancelled. The default window is shown above the results.
2. Choose a project and a date window, then Apply. Try **Find a traveller by name**, select an employee and Apply. Check full trip dates, overlap warnings and separate post-trip report status.
3. Open a request. Verify the selected project changes and the exact request detail is loaded. Return using **Back to travel schedule**; confirm filters are preserved.
4. Change a trip/report in its usual workflow, then return and verify refreshed overview data. Test pagination, inactive travellers and cross-project overlaps with suitable fixtures later.

Live browser acceptance remains manual. No application records were created or changed by this implementation.

## Verification

- Full frontend suite: **606 tests across 93 suites passed**.
- Added 13 schedule/navigation tests covering independent scope, date bounds, traveller lookup, cancelled navigation, filter retention, focus refresh, error/empty distinction, out-of-range totals, direct detail opening and unavailable targets.
- Production build passed with existing unrelated lint/bundle-size warnings.
- Targeted lint and `git diff --check` passed. No commit or push performed.
