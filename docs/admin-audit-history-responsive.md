# Responsive Admin Audit History

At widths up to 700px, events use stacked cards with visible labels for date, record, project, action, changes, and actor. The same event markup and shared audit-detail components are retained; table roles and column headers remain available to assistive technology. Larger screens retain the scrollable table.

Filters stack on phones, inputs and buttons have touch-friendly heights, pagination wraps, and shared detail minimum widths are relaxed inside cards. Admin shell spacing is reduced on phones.

Validation: 13 existing AuditHistory tests passed, covering filters, child-record details, null lifecycle states, stale responses, and errors. No request, authorization, or pagination logic changed. Browser visual acceptance remains pending.

Manual checks: open Admin > Audit History at 390px, 768px, and desktop widths. Check long field changes, return reasons, child-record context, date filters, empty results, and pagination.

No backend changes or commit.

Production build passed. Two redundant-role warnings were then removed and the modified component passed ESLint. Existing unrelated lint and bundle-size warnings remain. git diff --check passed.
