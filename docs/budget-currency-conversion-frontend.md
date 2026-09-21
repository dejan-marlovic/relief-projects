# Budget currency conversion frontend

Implemented against the backend contract in `D:/projects/relief_projects/docs/budget-currency-conversion.md`.

## User flow

ADMIN/FINANCE can use **Change budget currency** beside **Recalculate saved costs** on editable DRAFT/RETURNED budgets. Admin Update Budget has the same dialog. Saving a header with a changed local currency also opens the choice; selecting a currency alone does not write anything.

- **Keep entered values:** edit the header currency, limit and output rates, then save and explicitly confirm that both the entered limit and retained unit prices are already expressed in the new currency. Uses ordinary PUT with the matching currency confirmation. Calculated cost amounts are refreshed.
- **Convert:** start from saved values. Save unrelated edits separately, or explicitly discard header edits in the dialog. Finish cost-row editing first. Choose a target currency, source-to-target rate and all three target-to-output rates. Reporting/GBP/EUR currency targets remain unchanged. Direction, value, date and record ID distinguish available rates; identity rates must also be explicitly selected.
- Preview is read-only. It displays server-calculated before/after planning totals, per-row values, rounding adjustments, warnings and blocking row IDs. Unknown values stay unavailable. Review and acknowledge before confirming an eligible preview.

No frontend arithmetic or cost-row PUT loop performs conversion. Exact decimal strings from the preview and updated budget are retained.

## Recovery and refresh

The preview token exists only in component state. Changing a selection/mode or closing clears it. Confirmation sends only the token, removes the displayed preview, and blocks duplicate submission while pending. A stale/expired/used preview or uncertain confirmation requires reloading the saved budget before proceeding. The UI never automatically retries a conversion.

Success/reload updates header, parent budget state, planning summary, cost rows, combined history and supporting-document controls. Exports continue reading the saved budget and persisted costs. Admin adopts the authoritative response and refreshes planning/rate data.

Budget and cost-detail UPDATE history now displays the recorded conversion or keep-values mode, historical currency labels, exact rates/local rate timestamps, scales/rounding and shared operation ID. Old events with null context retain their existing presentation. Both record history and global Admin history use the shared renderer.

## Local setup and manual acceptance

Set `BUDGET_CONVERSION_SIGNING_SECRET` in the backend IntelliJ Run Configuration if it is not already configured, then restart using the usual workflow. Follow the backend document for private key generation; do not commit or paste the secret into task logs. A missing configuration produces an actionable frontend message; ordinary keep-values remains available.

Test a confirmed, valid, within-limit DRAFT/RETURNED budget with all required saved calculation inputs and directional rates. Deleted cost details, financial dependencies, stale saved calculations or unconfirmed currency meaning must be resolved separately when reported. Restore deleted rows under the original currency before either type of currency change.

Review a preview, change a rate to ensure it disappears, preview again, confirm, and verify header, cost rows, planning, export and history. Separately test explicit keep-values with an editable demo budget. An eligible preview does not modify data until confirmation.

## Verification

- Full frontend suite passed: 59 suites / 366 tests, including 10 new dialog/audit tests.
- Additional normal/Admin integration tests cover saved-state propagation, dependent refreshes, unsaved-edit discard and ordinary PUT only after explicit keep-values confirmation.
- Changed-file ESLint, Sass compilation and diff whitespace review run separately.
- Browser inspection confirmed conversion controls are hidden in the current read-only session. Live conversion acceptance needs an authorized editor account; no budget conversion or application-data mutation was performed in this task.

No backend changes, IntelliJ restart, secret configuration or commit were made.
