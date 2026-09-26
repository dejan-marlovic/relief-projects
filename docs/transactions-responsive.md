# Responsive transactions

Transactions retains the desktop table above 1100px. Tablet layouts use a labeled three-column grid; phones stack the fields and show labeled actions. Compact views show every field independently of desktop column preferences. Sorting, filtering, and select-all are available in an expandable controls section. Selection, selected export, and lifecycle permissions remain in place.

Compact transaction-header editors use explicit Save/Cancel instead of blur-save. Draft state survives viewport changes. Saving disables controls and guards duplicate requests; other compact transaction actions are disabled during an active header edit. Existing payloads, lifecycle checks, approved-budget choices, and error handling are unchanged.

Allocation forms and rows use labeled fields, constrained inputs, and touch-sized controls. Transaction history adopts the existing budget phone layout. Phone pages use document scrolling.

## Verification

- All 251 tests in 44 suites passed, including three new responsive checks for explicit saves, viewport changes, saving controls, viewer permissions, and action locking. The three responsive checks also passed after adding input accessibility labels.
- Production build passed with existing warnings. Diff reviewed and whitespace checks passed.
- Isolated browser previews checked the actual transaction row and representative allocation markup with production styles at 320px and 900px. The phone preview had no horizontal document overflow.
- Live authenticated acceptance remains a manual check. No application data changed.

## Manual acceptance

At phone/tablet widths, create or edit a draft transaction and check Save/Cancel. Expand sorting/filtering and select records for export. Expand allocations and history. Verify submitted/approved records and reviewer actions retain their existing restrictions. Resize with a draft and confirm its values remain.

No backend restart required. Nothing committed.
