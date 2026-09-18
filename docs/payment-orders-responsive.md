# Responsive payment orders

Payment Orders retains its desktop table above 1100px. Tablet headers use labeled three-column layouts; phones stack fields and show labeled actions. Compact views show all fields independently of desktop column preferences. Sorting, filtering, and select-all are in an expandable controls section. Selected export remains available, including for Booked orders.

Compact header editing uses explicit Save/Cancel instead of blur-save. Drafts survive viewport changes. Saving disables controls and guards duplicate requests; other compact header actions are disabled during an active header edit. The computed amount remains read-only. Existing Booked locks, lifecycle checks, permissions, approved-transaction options, payloads, and error handling remain unchanged.

Payment-line forms and rows use two columns on tablets and a single column on phones, with visible field labels and touch-sized controls. Payment-order history uses the existing stacked phone layout. The Payments route uses document scrolling on phones.

## Verification

- All 254 tests across 45 suites passed, including three new checks for explicit saving, viewport changes, saving controls, computed amount, viewer permissions, and Booked selection/mutation behavior.
- Production build passed with existing lint and bundle-size warnings. Diff reviewed and whitespace checks passed.
- Isolated browser previews checked the actual header component and representative line markup with production styles at 320px and 900px. The phone preview had no horizontal document overflow.
- No application records changed. Live authenticated acceptance remains a manual check.

## Manual acceptance

Open Payments at phone/tablet widths. Edit or create a draft order and check Save/Cancel. Expand lines and history, check line editing and totals, and use sorting/filtering and selected export. Confirm Booked orders remain selectable for export while edits/deletion are blocked. Verify approval actions with the appropriate role.

No backend restart required. Nothing committed.
