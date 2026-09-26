# Responsive signatures

The Signatures page keeps its desktop table above 1100px. At tablet widths it uses cards with status, employee, and payment order in a three-column summary; at 700px and below these fields stack. Signature text and date are available under expandable details, which open for editing.

Compact editors use explicit Save and Cancel instead of blur-save. Draft values survive viewport changes and failed saves. Saving disables editor controls and prevents duplicate requests. Existing API payloads, signature permissions, approved-payment-order edit restrictions, and independent delete permissions remain unchanged.

Sort, filters, visible-row selection, and selected export remain available. Compact views show every field regardless of desktop column preferences. Controls that could hide an active compact editor are disabled during editing. Phone layouts use document scrolling and theme variables shared with the existing interface.

## Verification

- All 246 tests across 43 suites passed, including six new responsive tests covering explicit saves, desktop blur-save, permissions, draft retention, validation errors, viewport changes, and filtering.
- Production build passed with existing lint and bundle-size warnings.
- Isolated browser fixtures rendered the actual row component at 320, 390, 900, and 1440px without horizontal document overflow. Phone and tablet editors, long display names, date controls, and validation errors were visually checked.
- Browser fixtures do not replace live authenticated acceptance testing. No application records were changed.

## Manual acceptance

1. Open Signatures on desktop, tablet, and phone widths; expand signature details.
2. Create or edit an eligible signature on a narrow viewport. Confirm tabbing between fields does not save; Save persists and Cancel discards the draft.
3. Check selection, filters, sorting, and selected export. Check that viewers have no mutation controls.
4. Resize with an unsaved edit and verify the draft remains. Check payment-order history after saving a change.

No backend changes or restart are required. Nothing was committed.
