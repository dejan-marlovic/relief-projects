# Responsive budgets

Budgets now uses tighter page spacing and wrapping headers on smaller screens. Existing and new budget forms stack their summary/currency cards, use constrained inputs and touch-sized controls, and place actions vertically on phones. The phone page header uses normal document scrolling.

Cost details retain their desktop grid above 1100px. Tablet rows become labeled three-column cards; phones use single-column cards. All input and calculated fields remain available, including read-only local/reporting/GBP/EUR amounts. Existing explicit Save/Cancel, validation, category totals, authoritative calculations, lifecycle actions, exports, and permissions are unchanged.

Budget record history uses labeled stacked entries at 700px and below, including child activity. Other entity histories retain their existing layout.

## Verification

- All 62 focused tests across seven budget/history suites passed, covering calculations, editing, validation, history, lifecycle actions, and exports.
- Production build passed with existing lint and bundle-size warnings. Diff reviewed and whitespace checks passed.
- Isolated browser previews checked the actual cost-detail component and representative budget form/history markup with production styles at 320px and 900px. The phone preview had no horizontal document overflow.
- No application records changed. Live authenticated acceptance remains a manual check.

## Manual acceptance

On phone/tablet widths, open an existing budget and New Budget. Check date, total, and currency controls; edit a cost detail and verify previews and saved values. Check Save/Cancel, category totals, recalculation controls, and expanded history. Check that approval actions and read-only states still match the signed-in role and budget state.

No backend restart required. Nothing committed.
