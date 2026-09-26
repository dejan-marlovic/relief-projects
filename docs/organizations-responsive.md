# Responsive organizations

Organizations keeps its desktop table above 1100px. Tablet layouts show organization and status above labeled actions; phones stack these fields. Compact layouts show both fields regardless of desktop column preferences, retain sorting and filtering, and use explicit Save/Cancel for organization-link edits. Saving disables editor controls and guards against duplicate requests. Failed requests retain the existing draft and error handling.

Address and bank panels use labeled, two-column fields on tablets and single-column fields on phones. Existing linking, primary-address, removal, and edit behavior remains in place. Bank visibility and mutation permissions are unchanged. Phone pages use document scrolling, and styles use existing theme variables.

## Verification

- All 248 tests across 43 suites passed, including new compact-save, resize, saving-state, and viewer checks.
- Production build passed with existing lint and bundle-size warnings. Diff reviewed and whitespace checks passed.
- Isolated browser previews checked the actual organization row and representative address/bank editor markup with production styles at 320px and 900px. The 320px preview had no horizontal document overflow.
- Live authenticated acceptance remains a manual check; no application data changed.

## Manual acceptance

Open Organizations on phone and tablet widths. Edit an organization link, change both fields, and save or cancel. Check sorting, filtering, and resizing with a draft. Expand addresses and, with an authorized role, bank details; check their existing editing/linking actions. Confirm viewers cannot mutate links or access bank details, and project managers retain address management without bank access.

No backend restart required. Nothing committed.
